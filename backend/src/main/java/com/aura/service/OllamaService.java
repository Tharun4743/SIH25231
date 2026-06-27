package com.aura.service;

import com.aura.model.SearchResult;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

@Service
public class OllamaService {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${aura.ollama.url:http://localhost:11434}")
    private String ollamaUrl;

    @Value("${aura.ollama.models.llm:llama3}")
    private String model;

    public OllamaService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public String generate(String prompt, String context, String systemPrompt, String modelOverride, double tempOverride) {
        String activeModel = (modelOverride != null && !modelOverride.isBlank()) ? modelOverride : model;
        double activeTemp = tempOverride > 0 ? tempOverride : 0.1;
        try {
            String url = ollamaUrl + "/api/generate";
            String fullPrompt = (context != null && !context.isEmpty())
                    ? "CONTEXT:\n" + context + "\n\nQUESTION: " + prompt + "\nANSWER:"
                    : prompt;

            Map<String, Object> request = new HashMap<>();
            request.put("model", activeModel);
            request.put("prompt", fullPrompt);
            if (systemPrompt != null && !systemPrompt.isEmpty()) {
                request.put("system", systemPrompt);
            }
            request.put("stream", false);

            Map<String, Object> options = new HashMap<>();
            options.put("num_gpu", 33);
            options.put("num_thread", 8);
            options.put("num_ctx", 4096);
            options.put("temperature", activeTemp);
            options.put("top_p", 0.9);
            options.put("repeat_penalty", 1.1);
            options.put("stop", List.of("Human:", "User:"));
            request.put("options", options);

            Map<?, ?> response = restTemplate.postForObject(url, request, Map.class);
            if (response != null && response.containsKey("response")) {
                return (String) response.get("response");
            }
        } catch (Exception e) {
            System.err.println("Ollama generation failed: " + e.getMessage());
        }
        return "Offline Grounded Fallback: Connect a local Ollama instance on " + ollamaUrl + " with model '" + activeModel + "' to obtain real grounded generation.";
    }

    public String generate(String prompt, String context, String systemPrompt) {
        return generate(prompt, context, systemPrompt, null, 0);
    }

    public String generate(String prompt, String context) {
        return generate(prompt, context, "You are Aura - AI unified retrival assistant. Answer STRICTLY from the provided context. If the answer is absent, say: I don't have information about this in the loaded documents. Always cite document name and page number.", null, 0);
    }

    public void generateRAG(String ragPrompt, String systemPrompt, Consumer<String> tokenConsumer) {
        try {
            String targetUrl = ollamaUrl + "/api/generate";
            URI uri = URI.create(targetUrl);
            String host = uri.getHost();
            if (host != null && !host.equals("localhost") && !host.equals("127.0.0.1")) {
                throw new IllegalStateException("BLOCKED: External call to " + host + ". AURA is offline-only.");
            }

            Map<String, Object> request = new HashMap<>();
            request.put("model", model);
            request.put("prompt", ragPrompt);
            if (systemPrompt != null && !systemPrompt.isEmpty()) {
                request.put("system", systemPrompt);
            }
            request.put("stream", true);

            Map<String, Object> options = new HashMap<>();
            options.put("num_gpu", 33);
            options.put("num_thread", 8);
            options.put("num_ctx", 4096);
            options.put("temperature", 0.1);
            options.put("top_p", 0.9);
            options.put("repeat_penalty", 1.1);
            options.put("stop", List.of("Human:", "User:"));
            request.put("options", options);

            HttpClient client = HttpClient.newHttpClient();
            String requestBody = objectMapper.writeValueAsString(request);
            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(uri)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .build();

            client.sendAsync(httpRequest, HttpResponse.BodyHandlers.ofInputStream())
                    .thenAccept(response -> {
                        try (BufferedReader reader = new BufferedReader(new InputStreamReader(response.body()))) {
                            String line;
                            while ((line = reader.readLine()) != null) {
                                if (line.trim().isEmpty()) continue;
                                Map<?, ?> map = objectMapper.readValue(line, Map.class);
                                if (map.containsKey("response")) {
                                    String token = (String) map.get("response");
                                    tokenConsumer.accept(token);
                                }
                                if (Boolean.TRUE.equals(map.get("done"))) {
                                    break;
                                }
                            }
                        } catch (Exception e) {
                            System.err.println("Error reading Ollama stream: " + e.getMessage());
                        }
                    }).join();
        } catch (Exception e) {
            System.err.println("Ollama streaming generation failed: " + e.getMessage());
            tokenConsumer.accept("Error calling local Ollama service: " + e.getMessage());
        }
    }

    @SuppressWarnings("unchecked")
    public float[] embed(String text) {
        try {
            String url = ollamaUrl + "/api/embeddings";
            Map<String, Object> request = new HashMap<>();
            request.put("model", "nomic-embed-text");
            request.put("prompt", text);

            Map<String, Object> options = new HashMap<>();
            options.put("num_gpu", 18);
            options.put("num_thread", 8);
            request.put("options", options);

            Map<?, ?> response = restTemplate.postForObject(url, request, Map.class);
            if (response != null && response.containsKey("embedding")) {
                List<Double> embeddingList = (List<Double>) response.get("embedding");
                float[] embedding = new float[embeddingList.size()];
                for (int i = 0; i < embeddingList.size(); i++) {
                    embedding[i] = embeddingList.get(i).floatValue();
                }
                return normalize(embedding);
            }
        } catch (Exception e) {
            System.err.println("Failed calling local Ollama embeddings: " + e.getMessage());
        }
        return getFallbackVector(text);
    }

    public List<float[]> embedBatch(List<String> texts) {
        List<float[]> embeddings = new ArrayList<>();
        for (String text : texts) {
            embeddings.add(embed(text));
        }
        return embeddings;
    }

    public String buildRAGPrompt(String query, List<SearchResult> results) {
        StringBuilder sb = new StringBuilder();
        for (SearchResult r : results) {
            sb.append("[").append(r.getCitation()).append("] ").append(r.getChunkText()).append("\n\n");
        }
        return sb.toString();
    }

    private float[] normalize(float[] v) {
        double sum = 0;
        for (float val : v) {
            sum += val * val;
        }
        double norm = Math.sqrt(sum);
        if (norm > 0) {
            for (int i = 0; i < v.length; i++) {
                v[i] /= (float) norm;
            }
        }
        return v;
    }

    private float[] getFallbackVector(String text) {
        int dims = 128;
        float[] vector = new float[dims];
        String[] words = text.toLowerCase().split("\\W+");
        for (String word : words) {
            if (word.isEmpty()) continue;
            int idx = Math.abs(word.hashCode()) % dims;
            vector[idx] += 1.0f;
        }
        return normalize(vector);
    }
}
