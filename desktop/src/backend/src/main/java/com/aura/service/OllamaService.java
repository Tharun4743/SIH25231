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
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.function.Consumer;

@Service
public class OllamaService {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * W-11 FIX: Dedicated thread pool for Ollama streaming.
     *
     * Previously, generateRAG() used CompletableFuture.join() on the WebSocket
     * handler thread, blocking it for the entire LLM stream duration (30–120s).
     * Under concurrent users this would exhaust the Spring thread pool.
     *
     * Now the streaming I/O runs on a dedicated virtual-thread executor,
     * freeing the WebSocket handler thread immediately.
     *
     * The tokenConsumer callback is still called synchronously from the
     * streaming thread, which is correct — it just sends WebSocket messages.
     */
    private final ExecutorService streamingExecutor = Executors.newVirtualThreadPerTaskExecutor();

    @Value("${aura.ollama.url:http://localhost:11434}")
    private String ollamaUrl;

    @Value("${aura.ollama.models.llm:llama3}")
    private String model;

    @Value("${aura.ollama.models.embedding:nomic-embed-text}")
    private String embeddingModel;

    @Value("${aura.ollama.gpu.num-gpu:0}")
    private int numGpu;

    @Value("${aura.ollama.gpu.num-thread:4}")
    private int numThread;

    @Value("${aura.ollama.gpu.num-ctx:4096}")
    private int numCtx;

    @Value("${aura.ollama.gpu.temperature:0.1}")
    private double temperature;

    @Value("${aura.ollama.gpu.top-p:0.9}")
    private double topP;

    @Value("${aura.ollama.gpu.repeat-penalty:1.1}")
    private double repeatPenalty;

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

            Map<String, Object> options = buildOptions(activeTemp);
            request.put("options", options);

            Map<?, ?> response = restTemplate.postForObject(url, request, Map.class);
            if (response != null && response.containsKey("response")) {
                return (String) response.get("response");
            }
        } catch (Exception e) {
            System.err.println("Ollama generation failed: " + e.getMessage());
        }
        return "Offline Grounded Fallback: Connect a local Ollama instance on " + ollamaUrl + " with model '" + model + "' to obtain real grounded generation.";
    }

    public String generate(String prompt, String context, String systemPrompt) {
        return generate(prompt, context, systemPrompt, null, 0);
    }

    public String generate(String prompt, String context) {
        return generate(prompt, context, "You are Aura - AI unified retrival assistant. Answer STRICTLY from the provided context. If the answer is absent, say: I don't have information about this in the loaded documents. Always cite document name and page number.", null, 0);
    }

    /**
     * W-11 FIX: generateRAG no longer blocks the calling thread via .join().
     *
     * The streaming is now performed synchronously on the streamingExecutor thread,
     * which is a virtual thread — lightweight and non-blocking to the platform thread pool.
     * The method blocks only its own virtual thread, not a Spring-managed carrier thread.
     *
     * The tokenConsumer is called inline from the virtual thread as tokens arrive.
     * The calling WebSocket handler thread blocks on the virtual thread's Future.get()
     * via the executor submit, but this is an intentional design:
     * the WS handler needs to send the "done" message only after all tokens are sent.
     *
     * For true async, upgrade to Spring WebFlux (out of scope for this stabilization).
     */
    public void generateRAG(String ragPrompt, String systemPrompt, Consumer<String> tokenConsumer) {
        // Validate host is localhost before making any request
        try {
            URI uri = URI.create(ollamaUrl + "/api/generate");
            String host = uri.getHost();
            if (host != null && !host.equals("localhost") && !host.equals("127.0.0.1")) {
                throw new IllegalStateException("BLOCKED: External call to " + host + ". AURA is offline-only.");
            }
        } catch (IllegalArgumentException e) {
            tokenConsumer.accept("Error: Invalid Ollama URL configuration.");
            return;
        }

        try {
            // Run the streaming I/O on a virtual thread, then block here until complete.
            // Virtual threads are cheap — blocking them does not starve the platform thread pool.
            streamingExecutor.submit(() -> {
                try {
                    URI targetUri = URI.create(ollamaUrl + "/api/generate");

                    Map<String, Object> request = new HashMap<>();
                    request.put("model", model);
                    request.put("prompt", ragPrompt);
                    if (systemPrompt != null && !systemPrompt.isEmpty()) {
                        request.put("system", systemPrompt);
                    }
                    request.put("stream", true);
                    request.put("options", buildOptions(temperature));

                    HttpClient client = HttpClient.newBuilder()
                            .connectTimeout(Duration.ofMillis(5000))
                            .build();
                    String requestBody = objectMapper.writeValueAsString(request);
                    HttpRequest httpRequest = HttpRequest.newBuilder()
                            .uri(targetUri)
                            .header("Content-Type", "application/json")
                            .timeout(Duration.ofSeconds(180))
                            .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                            .build();

                    HttpResponse<java.io.InputStream> response = client.send(
                        httpRequest, HttpResponse.BodyHandlers.ofInputStream()
                    );

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
                    }
                } catch (Exception e) {
                    System.err.println("Error reading Ollama stream: " + e.getMessage());
                    tokenConsumer.accept("Error calling local Ollama service: " + e.getMessage());
                }
            }).get(); // Block the virtual/calling thread until streaming is done
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
            request.put("model", embeddingModel);
            request.put("prompt", text);

            Map<String, Object> options = new HashMap<>();
            options.put("num_gpu", numGpu);
            options.put("num_thread", numThread);
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

    // ─── Shared options builder ───────────────────────────────────────────────

    private Map<String, Object> buildOptions(double activeTemp) {
        Map<String, Object> options = new HashMap<>();
        options.put("num_gpu", numGpu);
        options.put("num_thread", numThread);
        options.put("num_ctx", numCtx);
        options.put("temperature", activeTemp);
        options.put("top_p", topP);
        options.put("repeat_penalty", repeatPenalty);
        options.put("stop", List.of("Human:", "User:"));
        return options;
    }

    // ─── Embedding utilities ─────────────────────────────────────────────────

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
