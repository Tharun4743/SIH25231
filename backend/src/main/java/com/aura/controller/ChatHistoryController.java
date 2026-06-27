package com.aura.controller;

import com.aura.model.Chat;
import com.aura.repository.ChatRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Tag(name = "Chat History API", description = "Endpoints for retrieving or clearing historical chats and query logs")
@RestController
@RequestMapping("/api/chats")
public class ChatHistoryController {

    private final ChatRepository chatRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ChatHistoryController(ChatRepository chatRepository) {
        this.chatRepository = chatRepository;
    }

    @Operation(summary = "Get historical chats", description = "Retrieves all user questions and AI answer pairs along with their sources")
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getChatHistory() {
        List<Chat> chats = chatRepository.findAllByOrderByCreatedAtAsc();
        List<Map<String, Object>> messages = new ArrayList<>();

        for (Chat chat : chats) {
            List<Map<String, Object>> sourcesList = new ArrayList<>();
            try {
                if (chat.getSources() != null && !chat.getSources().isEmpty()) {
                    sourcesList = objectMapper.readValue(chat.getSources(), new TypeReference<List<Map<String, Object>>>() {});
                }
            } catch (Exception e) {
                // Ignore parse errors
            }

            // 1. User question bubble
            Map<String, Object> qMsg = new HashMap<>();
            qMsg.put("id", "chat-q-" + chat.getId());
            qMsg.put("role", "user");
            qMsg.put("text", chat.getQuestion());
            qMsg.put("timestamp", chat.getCreatedAt() != null ? chat.getCreatedAt().toLocalTime().toString().substring(0, 8) : "");
            messages.add(qMsg);

            // 2. Assistant answer bubble
            Map<String, Object> aMsg = new HashMap<>();
            aMsg.put("id", "chat-a-" + chat.getId());
            aMsg.put("role", "assistant");
            aMsg.put("text", chat.getAnswer());
            aMsg.put("timestamp", chat.getCreatedAt() != null ? chat.getCreatedAt().toLocalTime().toString().substring(0, 8) : "");
            aMsg.put("sources", sourcesList);
            messages.add(aMsg);
        }

        return ResponseEntity.ok(messages);
    }

    @Operation(summary = "Clear chat history", description = "Deletes all stored chat logs from the local database")
    @DeleteMapping
    public ResponseEntity<Void> clearChatHistory() {
        chatRepository.deleteAll();
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "Get list of unique chat sessions", description = "Retrieves unique session IDs along with the first question as title")
    @GetMapping("/sessions")
    public ResponseEntity<List<Map<String, Object>>> getChatSessions() {
        List<Chat> chats = chatRepository.findAllByOrderByCreatedAtAsc();
        Map<String, Map<String, Object>> sessionsMap = new LinkedHashMap<>();
        
        for (Chat chat : chats) {
            String sId = chat.getSessionId();
            if (sId == null || sId.isEmpty()) {
                sId = "default";
            }
            if (!sessionsMap.containsKey(sId)) {
                Map<String, Object> sessionMeta = new HashMap<>();
                sessionMeta.put("sessionId", sId);
                sessionMeta.put("title", chat.getQuestion());
                sessionMeta.put("createdAt", chat.getCreatedAt() != null ? chat.getCreatedAt().toString() : "");
                sessionsMap.put(sId, sessionMeta);
            }
        }
        
        List<Map<String, Object>> sessionsList = new ArrayList<>(sessionsMap.values());
        sessionsList.sort((a, b) -> ((String) b.get("createdAt")).compareTo((String) a.get("createdAt")));
        return ResponseEntity.ok(sessionsList);
    }

    @Operation(summary = "Get messages for a specific session", description = "Retrieves message list for the given session ID")
    @GetMapping("/session/{sessionId}")
    public ResponseEntity<List<Map<String, Object>>> getChatSessionHistory(@PathVariable String sessionId) {
        List<Chat> chats = chatRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);
        List<Map<String, Object>> messages = new ArrayList<>();
        
        for (Chat chat : chats) {
            List<Map<String, Object>> sourcesList = new ArrayList<>();
            try {
                if (chat.getSources() != null && !chat.getSources().isEmpty()) {
                    sourcesList = objectMapper.readValue(chat.getSources(), new TypeReference<List<Map<String, Object>>>() {});
                }
            } catch (Exception e) {
                // Ignore
            }

            // User question
            Map<String, Object> qMsg = new HashMap<>();
            qMsg.put("id", "chat-q-" + chat.getId());
            qMsg.put("role", "user");
            qMsg.put("text", chat.getQuestion());
            qMsg.put("timestamp", chat.getCreatedAt() != null ? chat.getCreatedAt().toLocalTime().toString().substring(0, 8) : "");
            messages.add(qMsg);

            // Assistant answer
            Map<String, Object> aMsg = new HashMap<>();
            aMsg.put("id", "chat-a-" + chat.getId());
            aMsg.put("role", "assistant");
            aMsg.put("text", chat.getAnswer());
            aMsg.put("timestamp", chat.getCreatedAt() != null ? chat.getCreatedAt().toLocalTime().toString().substring(0, 8) : "");
            aMsg.put("sources", sourcesList);
            messages.add(aMsg);
        }
        return ResponseEntity.ok(messages);
    }

    @Operation(summary = "Delete a specific chat session", description = "Deletes all messages associated with the given session ID")
    @DeleteMapping("/session/{sessionId}")
    public ResponseEntity<Void> deleteChatSession(@PathVariable String sessionId) {
        List<Chat> chats = chatRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);
        chatRepository.deleteAll(chats);
        return ResponseEntity.ok().build();
    }
}
