package com.aura.controller;

import com.aura.dto.ChatRequest;
import com.aura.dto.ChatResponse;
import com.aura.dto.SourceCitation;
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
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Tag(name = "Chat API", description = "Endpoints for document-grounded RAG query sessions")
@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final EmbeddingService embeddingService;
    private final ChromaDBService chromaDBService;
    private final OllamaService ollamaService;
    private final ChatRepository chatRepository;
    private final DocumentRepository documentRepository;
    private final SettingService settingService;
    private final AuditLogService auditLogService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ChatController(EmbeddingService embeddingService,
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

    @Operation(summary = "Submit query for RAG Rerouting", description = "Executes local semantic search in ChromaDB, builds context, and queries the local llama3 model")
    @PostMapping
    public ResponseEntity<ChatResponse> chat(@RequestBody ChatRequest request) {
        try {
            String queryText = request.getMessage();
            long docCount = documentRepository.count();
            String responseText;
            List<SourceCitation> citations = new ArrayList<>();

            // --- Read live settings from SQLite ---
            String modelName = settingService.getSetting("model_name", "llama3");
            double temperature = Double.parseDouble(settingService.getSetting("temperature", "0.1"));
            int topK = Integer.parseInt(settingService.getSetting("top_k", "5"));
            boolean fallbackEnabled = Boolean.parseBoolean(settingService.getSetting("enable_fallback", "true"));

            if (docCount == 0) {
                // Case 1: No documents uploaded
                responseText = ollamaService.generate(queryText, "", "You are Aura - AI unified retrival assistant, an offline AI assistant. Answer the user's question using your general knowledge.", modelName, temperature);
            } else {
                // Case 2: One or more files uploaded
                // 1. Generate query embedding vector
                float[] queryVec = embeddingService.embed(queryText);

                // 2. ChromaDB query for top matching chunks (using settings top_k)
                List<SearchResult> searchResults = chromaDBService.query("aura-documents", queryVec, topK);

                // Check if any context is relevant
                boolean relevant = false;
                if (searchResults != null && !searchResults.isEmpty()) {
                    double bestScore = searchResults.get(0).getScore();
                    // Cosine similarity higher is better. Threshold of 25.0% represents relevance
                    if (bestScore > 25.0) {
                        relevant = true;
                    }
                }

                if (relevant) {
                    // Build context and query Ollama with grounded prompt
                    String context = ollamaService.buildRAGPrompt(queryText, searchResults);
                    responseText = ollamaService.generate(queryText, context, 
                        "You are Aura - AI unified retrival assistant. Answer STRICTLY from the provided context. If the answer is absent, say: I don't have information about this in the loaded documents. Always cite document name and page number.",
                        modelName, temperature);

                    for (SearchResult r : searchResults) {
                        citations.add(SourceCitation.builder()
                                .docId(r.getDocId())
                                .docName(r.getDocName())
                                .pageNumber(r.getPageNumber())
                                .excerpt(r.getChunkText())
                                .score(r.getScore())
                                .build());
                    }
                } else {
                    if (fallbackEnabled) {
                        // Fallback to Ollama's general knowledge
                         responseText = ollamaService.generate(queryText, "", 
                            "You are Aura - AI unified retrival assistant, an offline AI assistant. The user has uploaded documents, but none contain information relevant to this question. Answer the user's question using your general knowledge, and briefly mention that no relevant information was found in the knowledge base.",
                            modelName, temperature);
                    } else {
                        // Strict RAG refusal
                        responseText = "I don't have information about this in the loaded documents.";
                    }
                }
            }

            // 6. Save chat record to SQLite database
            String sourcesJson = "[]";
            try {
                sourcesJson = objectMapper.writeValueAsString(citations);
            } catch (Exception ex) {
                // Ignore serialization error
            }

            Chat chat = Chat.builder()
                    .question(queryText)
                    .answer(responseText)
                    .model(settingService.getSetting("model_name", "llama3"))
                    .createdAt(LocalDateTime.now())
                    .sources(sourcesJson)
                    .sessionId(request.getSessionId() != null && !request.getSessionId().isEmpty() ? request.getSessionId() : "default")
                    .build();
            chatRepository.save(chat);

            // 7. Write event to audit logs
            String truncatedQuery = queryText.substring(0, Math.min(queryText.length(), 40));
            auditLogService.logEvent(
                    "CHAT",
                    "Completed synchronous grounded retrieval for: \"" + truncatedQuery + "...\"",
                    "Success"
            );

            return ResponseEntity.ok(ChatResponse.builder()
                    .text(responseText)
                    .sources(citations)
                    .build());

        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(
                    ChatResponse.builder().text("Error: " + e.getMessage()).build()
            );
        }
    }
}
