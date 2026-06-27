package com.aura.controller;

import com.aura.service.ChromaDBService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import java.util.HashMap;
import java.util.Map;

@Tag(name = "Health API", description = "Endpoints for verifying offline system intelligence and health status")
@RestController
@RequestMapping("/api/health")
public class HealthController {

    private final RestTemplate restTemplate;
    private final ChromaDBService chromaDBService;

    @Value("${aura.ollama.url:http://localhost:11434}")
    private String ollamaUrl;

    public HealthController(RestTemplate restTemplate, ChromaDBService chromaDBService) {
        this.restTemplate = restTemplate;
        this.chromaDBService = chromaDBService;
    }

    @Operation(summary = "Get system health status", description = "Verifies connection to local Ollama server and returns ChromaDB document and image collection sizes")
    @GetMapping
    public ResponseEntity<Map<String, Object>> getHealth() {
        Map<String, Object> health = new HashMap<>();

        // Check Ollama availability
        boolean ollamaUp = false;
        String ollamaStatus = "Offline";
        try {
            String response = restTemplate.getForObject(ollamaUrl + "/api/tags", String.class);
            if (response != null) {
                ollamaUp = true;
                ollamaStatus = "Online";
            }
        } catch (Exception e) {
            ollamaStatus = "Unreachable at " + ollamaUrl;
        }

        // Check vector store
        int vectorChunks = chromaDBService.getCollectionSize("aura-documents");
        int imageChunks = chromaDBService.getCollectionSize("images");

        health.put("ollama", ollamaUp);
        health.put("ollamaStatus", ollamaStatus);
        health.put("vectorChunks", vectorChunks);
        health.put("imageChunks", imageChunks);
        health.put("vectorStore", vectorChunks > 0 ? "Active" : "Empty");
        health.put("status", ollamaUp ? "Healthy" : "Degraded");

        return ResponseEntity.ok(health);
    }
}
