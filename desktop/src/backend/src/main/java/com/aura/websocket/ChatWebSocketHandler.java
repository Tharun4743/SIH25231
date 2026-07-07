package com.aura.websocket;

import com.aura.model.Chat;
import com.aura.model.SearchResult;
import com.aura.repository.ChatRepository;
import com.aura.repository.DocumentRepository;
import com.aura.service.AuditLogService;
import com.aura.service.ChromaDBService;
import com.aura.service.EmbeddingService;
import com.aura.service.OllamaService;
import com.aura.service.SettingService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import java.time.LocalDateTime;
import java.util.*;

@Component
public class ChatWebSocketHandler extends TextWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(ChatWebSocketHandler.class);

    private final EmbeddingService embeddingService;
    private final ChromaDBService chromaDBService;
    private final OllamaService ollamaService;
    private final ChatRepository chatRepository;
    private final DocumentRepository documentRepository;
    private final SettingService settingService;
    private final AuditLogService auditLogService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ChatWebSocketHandler(EmbeddingService embeddingService,
                                 ChromaDBService chromaDBService,
                                 OllamaService ollamaService,
                                 ChatRepository chatRepository,
                                 DocumentRepository documentRepository,
                                 SettingService settingService,
                                 AuditLogService auditLogService) {
        this.embeddingService = embeddingService;
        this.chromaDBService = chromaDBService;
        this.ollamaService = ollamaService;
        this.chatRepository = chatRepository;
        this.documentRepository = documentRepository;
        this.settingService = settingService;
        this.auditLogService = auditLogService;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        log.info("Client WebSocket handshake successful: {}", session.getId());
    }

    @Override
    @SuppressWarnings("unchecked")
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String payload = message.getPayload();
        log.debug("Query packet received on session: {}", session.getId());

        try {
            // Parse incoming JSON
            Map<String, Object> rawRequest = objectMapper.readValue(payload, Map.class);
            String messageText = (String) rawRequest.get("message");
            String sessionId = (String) rawRequest.get("sessionId");
            if (messageText == null || messageText.trim().isEmpty()) {
                Map<String, Object> errorPayload = new HashMap<>();
                errorPayload.put("type", "error");
                errorPayload.put("message", "Empty query string provided.");
                session.sendMessage(new TextMessage(objectMapper.writeValueAsString(errorPayload)));
                return;
            }

            long docCount = documentRepository.count();
            String completeResponse;
            List<Map<String, Object>> citationsList = new ArrayList<>();
            final StringBuilder responseBuffer = new StringBuilder();

            // --- Read live settings from SQLite ---
            String modelName = settingService.getSetting("model_name", "llama3");
            double temperature = Double.parseDouble(settingService.getSetting("temperature", "0.1"));
            int topK = Integer.parseInt(settingService.getSetting("top_k", "5"));
            boolean fallbackEnabled = Boolean.parseBoolean(settingService.getSetting("enable_fallback", "true"));

            boolean filesBrain = true;
            if (rawRequest.containsKey("filesBrain")) {
                Object val = rawRequest.get("filesBrain");
                if (val instanceof Boolean) {
                    filesBrain = (Boolean) val;
                } else if (val instanceof String) {
                    filesBrain = "true".equalsIgnoreCase((String) val) || "yes".equalsIgnoreCase((String) val);
                }
            }
            String filterDocId = (String) rawRequest.get("filterDocId");

            if (!filesBrain || docCount == 0) {
                // Case 1: No documents uploaded or Files Brain is disabled
                String systemPrompt = "You are Aura - AI unified retrival assistant, an offline AI assistant. Answer the user's question using your general knowledge.";
                ollamaService.generateRAG(messageText, systemPrompt, (token) -> {
                    try {
                        responseBuffer.append(token);
                        Map<String, Object> tokenPayload = new HashMap<>();
                        tokenPayload.put("type", "token");
                        tokenPayload.put("data", token);
                        session.sendMessage(new TextMessage(objectMapper.writeValueAsString(tokenPayload)));
                    } catch (Exception ex) {
                        log.error("WebSocket stream send failed: {}", ex.getMessage());
                    }
                });
            } else {
                // Case 2: One or more files uploaded and Files Brain is active
                // 1. Generate Query Vector
                float[] queryVec = embeddingService.embed(messageText);

                // 2. Fetch nearest sources from ChromaDB (using settings top_k and filterDocId)
                List<SearchResult> searchResults = chromaDBService.query("aura-documents", queryVec, topK, filterDocId);

                boolean relevant = false;
                if (searchResults != null && !searchResults.isEmpty()) {
                    double bestScore = searchResults.get(0).getScore();
                    // Cosine similarity higher is better. Threshold of 25.0% represents relevance
                    if (bestScore > 25.0) {
                        relevant = true;
                    }
                }

                if (relevant) {
                    String context = ollamaService.buildRAGPrompt(messageText, searchResults);
                    String systemPrompt = "You are Aura - AI unified retrival assistant. Answer STRICTLY from the provided context. If the answer is absent, say: I don't have information about this in the loaded documents. Always cite document name and page number.";
                    String ragPrompt = "CONTEXT:\n" + context + "\n\nQUESTION: " + messageText + "\nANSWER:";

                    ollamaService.generateRAG(ragPrompt, systemPrompt, (token) -> {
                        try {
                            responseBuffer.append(token);
                            Map<String, Object> tokenPayload = new HashMap<>();
                            tokenPayload.put("type", "token");
                            tokenPayload.put("data", token);
                            session.sendMessage(new TextMessage(objectMapper.writeValueAsString(tokenPayload)));
                        } catch (Exception ex) {
                            System.err.println("WebSocket stream send failed: " + ex.getMessage());
                        }
                    });

                    for (SearchResult r : searchResults) {
                        Map<String, Object> cite = new HashMap<>();
                        cite.put("docId", r.getDocId());
                        cite.put("docName", r.getDocName());
                        cite.put("pageNumber", r.getPageNumber());
                        cite.put("excerpt", r.getChunkText());
                        cite.put("score", r.getScore());
                        citationsList.add(cite);
                    }
                } else {
                    if (fallbackEnabled) {
                        // Fallback to Ollama's general knowledge
                        String systemPrompt = "You are Aura - AI unified retrival assistant, an offline AI assistant. The user has uploaded documents, but none contain information relevant to this question. Answer the user's question using your general knowledge, and briefly mention that no relevant information was found in the knowledge base.";
                        ollamaService.generateRAG(messageText, systemPrompt, (token) -> {
                            try {
                                responseBuffer.append(token);
                                Map<String, Object> tokenPayload = new HashMap<>();
                                tokenPayload.put("type", "token");
                                tokenPayload.put("data", token);
                                session.sendMessage(new TextMessage(objectMapper.writeValueAsString(tokenPayload)));
                            } catch (Exception ex) {
                                System.err.println("WebSocket stream send failed: " + ex.getMessage());
                            }
                        });
                    } else {
                        // Strict RAG refusal
                        String refusal = "I don't have information about this in the loaded documents.";
                        responseBuffer.append(refusal);
                        Map<String, Object> tokenPayload = new HashMap<>();
                        tokenPayload.put("type", "token");
                        tokenPayload.put("data", refusal);
                        session.sendMessage(new TextMessage(objectMapper.writeValueAsString(tokenPayload)));
                    }
                }
            }

            completeResponse = responseBuffer.toString();

            Map<String, Object> donePayload = new HashMap<>();
            donePayload.put("type", "done");
            donePayload.put("sources", citationsList);
            session.sendMessage(new TextMessage(objectMapper.writeValueAsString(donePayload)));

            // 6. Save Chat session to SQLite
            String sourcesJson = "[]";
            try {
                sourcesJson = objectMapper.writeValueAsString(citationsList);
            } catch (Exception ex) {
                // Ignore
            }

            Chat chat = Chat.builder()
                    .question(messageText)
                    .answer(completeResponse)
                    .model(settingService.getSetting("model_name", "llama3"))
                    .createdAt(LocalDateTime.now())
                    .sources(sourcesJson)
                    .sessionId(sessionId != null && !sessionId.isEmpty() ? sessionId : "default")
                    .build();
            chatRepository.save(chat);

            // 7. Write event to audit logs
            String truncatedQuery = messageText.substring(0, Math.min(messageText.length(), 40));
            auditLogService.logEvent(
                    "CHAT",
                    "Completed streaming grounded retrieval for: \"" + truncatedQuery + "...\"",
                    "Success"
                );

        } catch (Exception e) {
            Map<String, Object> errorPayload = new HashMap<>();
            errorPayload.put("type", "error");
            errorPayload.put("message", e.getMessage());
            session.sendMessage(new TextMessage(objectMapper.writeValueAsString(errorPayload)));
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        log.info("Connection closed: {}", session.getId());
    }
}
