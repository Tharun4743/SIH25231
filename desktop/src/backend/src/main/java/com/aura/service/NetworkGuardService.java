package com.aura.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.HttpURLConnection;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * Phase 5+6 Fix: Removed all user-facing terminal instructions (Store policy violation).
 * Replaced all System.out.println with SLF4J logger.
 */
@Service
public class NetworkGuardService {

    private static final Logger log = LoggerFactory.getLogger(NetworkGuardService.class);
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${aura.ollama.url:http://localhost:11434}")
    private String ollamaUrl;

    @Value("${aura.chromadb.url:http://localhost:8001}")
    private String chromaUrl;

    @PostConstruct
    public void checkOfflineInfrastructure() {
        log.info("[AURA NEURAL GUARD] Running startup health verification on offline AI resources...");

        // 1. Check Ollama
        boolean ollamaRunning = false;
        try {
            HttpClient client = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(2))
                    .build();

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(ollamaUrl + "/api/tags"))
                    .GET()
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == HttpURLConnection.HTTP_OK) {
                ollamaRunning = true;
                Map<?, ?> json = objectMapper.readValue(response.body(), Map.class);
                List<?> models = (List<?>) json.get("models");
                boolean hasLlama3 = false;
                boolean hasEmbed = false;

                if (models != null) {
                    for (Object mObj : models) {
                        if (mObj instanceof Map) {
                            Map<?, ?> m = (Map<?, ?>) mObj;
                            String name = (String) m.get("name");
                            if (name != null) {
                                if (name.startsWith("llama3")) hasLlama3 = true;
                                if (name.startsWith("nomic-embed-text")) hasEmbed = true;
                            }
                        }
                    }
                }

                if (!hasLlama3) {
                    log.warn("[AURA NEURAL GUARD] llama3 model is missing in local Ollama service. " +
                             "The Electron shell should auto-pull this model shortly.");
                }
                if (!hasEmbed) {
                    log.warn("[AURA NEURAL GUARD] nomic-embed-text embedding model is missing in local Ollama service. " +
                             "The Electron shell should auto-pull this model shortly.");
                }
                if (hasLlama3 && hasEmbed) {
                    log.info("[AURA NEURAL GUARD] Local Ollama and matching models successfully verified.");
                }
            }
        } catch (Exception e) {
            log.warn("[AURA NEURAL GUARD] Local Ollama service is not reachable on {}. " +
                     "The Electron shell should start it automatically.", ollamaUrl);
        }

        // 2. Check ChromaDB
        try {
            HttpClient client = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(2))
                    .build();

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(chromaUrl + "/api/v1/heartbeat"))
                    .GET()
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == HttpURLConnection.HTTP_OK) {
                log.info("[AURA NEURAL GUARD] Local ChromaDB vector database verified on {}", chromaUrl);
            } else {
                log.info("[AURA NEURAL GUARD] ChromaDB server not found on {}. Using local in-memory simulated vector store.", chromaUrl);
            }
        } catch (Exception e) {
            log.info("[AURA NEURAL GUARD] ChromaDB server not reachable on {}. Using local in-memory simulated vector store.", chromaUrl);
        }
        log.info("[AURA NEURAL GUARD] Verification complete. Proceeding with application boot...");
    }
}
