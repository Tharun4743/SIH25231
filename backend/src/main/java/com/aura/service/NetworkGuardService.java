package com.aura.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
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

@Service
public class NetworkGuardService {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${aura.ollama.url:http://localhost:11434}")
    private String ollamaUrl;

    @Value("${aura.chromadb.url:http://localhost:8001}")
    private String chromaUrl;

    @PostConstruct
    public void checkOfflineInfrastructure() {
        System.out.println("\n[AURA NEURAL GUARD] Running startup health verification on offline AI resources...");

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
                    System.err.println("[AURA NEURAL GUARD] WARNING: llama3 model is missing in local Ollama service.");
                    System.err.println("  >>> Run: ollama pull llama3");
                }
                if (!hasEmbed) {
                    System.err.println("[AURA NEURAL GUARD] WARNING: nomic-embed-text embedding model is missing in local Ollama service.");
                    System.err.println("  >>> Run: ollama pull nomic-embed-text");
                }
                if (hasLlama3 && hasEmbed) {
                    System.out.println("[AURA NEURAL GUARD] Local Ollama and matching models successfully verified.");
                }
            }
        } catch (Exception e) {
            System.err.println("[AURA NEURAL GUARD] WARNING: Local Ollama service is not reachable on " + ollamaUrl);
            System.err.println("  >>> Run: ollama serve");
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
                System.out.println("[AURA NEURAL GUARD] Local ChromaDB vector database verified on " + chromaUrl);
            } else {
                System.err.println("[AURA NEURAL GUARD] WARNING: ChromaDB returned non-200 heartbeat on " + chromaUrl);
                System.err.println("  >>> Run: docker run -d -p 8001:8000 chromadb/chroma");
            }
        } catch (Exception e) {
            System.err.println("[AURA NEURAL GUARD] WARNING: Local ChromaDB service is unreachable on " + chromaUrl);
            System.err.println("  >>> Run: docker run -d -p 8001:8000 chromadb/chroma");
        }
        System.out.println("[AURA NEURAL GUARD] Verification complete. Proceeding with application boot...\n");
    }
}
