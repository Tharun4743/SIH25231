package com.aura.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.util.*;

@Service
public class ImageService {

    private final ChromaDBService chromaDBService;
    private final EmbeddingService embeddingService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ImageService(ChromaDBService chromaDBService, EmbeddingService embeddingService) {
        this.chromaDBService = chromaDBService;
        this.embeddingService = embeddingService;
    }

    public void indexImage(MultipartFile image) throws IOException {
        String filename = image.getOriginalFilename();
        String baseName = filename != null ? filename.replaceAll("\\.[^.]+$", "") : "image";
        String uniqueName = UUID.randomUUID().toString() + "-" + filename;

        String userDir = System.getProperty("user.dir");
        java.io.File uploadDir = new java.io.File(userDir, "uploads");
        if (!uploadDir.exists()) {
            uploadDir.mkdirs();
        }

        java.io.File destFile = new java.io.File(uploadDir, uniqueName);
        Files.copy(image.getInputStream(), destFile.toPath(), StandardCopyOption.REPLACE_EXISTING);

        float[] embedding = null;

        // 1. Try CLIP sidecar first (best quality vision embedding)
        try {
            java.io.File sidecarDir;
            if (userDir.endsWith("backend")) {
                sidecarDir = new java.io.File(userDir, "sidecars");
            } else {
                sidecarDir = new java.io.File(new java.io.File(userDir, "backend"), "sidecars");
            }
            ProcessBuilder pb = new ProcessBuilder(PythonResolver.resolvePythonCommand(), "clip_sidecar.py", "encode_image", destFile.getAbsolutePath());
            pb.directory(sidecarDir);
            Process process = pb.start();
            int exitCode = process.waitFor();
            if (exitCode == 0) {
                embedding = objectMapper.readValue(process.getInputStream(), float[].class);
                System.out.println("[AURA] CLIP embedding generated for: " + filename);
            }
        } catch (Exception e) {
            System.out.println("[AURA] CLIP sidecar unavailable, switching to nomic-embed-text for: " + filename);
        }

        // 2. Fallback: use nomic-embed-text (Ollama) on enriched text description
        if (embedding == null) {
            String textDesc = "image diagram visual figure: " + baseName.replace("-", " ").replace("_", " ");
            embedding = embeddingService.embed(textDesc);
            System.out.println("[AURA] nomic-embed-text embedding generated for image: " + filename);
        }

        // 3. Index into vector store
        String id = "img-" + UUID.randomUUID().toString();
        Map<String, Object> metadata = new HashMap<>();
        metadata.put("docName", filename);
        metadata.put("docId", id);
        metadata.put("pageNumber", 1);
        metadata.put("url", "/uploads/" + uniqueName);

        chromaDBService.createCollection("images");
        chromaDBService.addChunks("images", List.of(id), List.of(filename), List.of(embedding), List.of(metadata));
        System.out.println("[AURA] Image indexed in visual collection: " + filename);
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> searchImages(String query) {
        List<Map<String, Object>> results = new ArrayList<>();

        // Handle empty query (load all images)
        if (query == null || query.trim().isEmpty()) {
            chromaDBService.createCollection("images");
            var items = chromaDBService.getCollectionItems("images");
            for (var item : items) {
                Map<String, Object> map = new HashMap<>();
                map.put("id", item.get("id"));
                map.put("name", item.get("text"));
                map.put("score", 100.0);
                map.put("description", "Indexed visual asset.");
                Map<String, Object> meta = (Map<String, Object>) item.get("metadata");
                if (meta != null) {
                    map.put("url", meta.get("url"));
                }
                results.add(map);
            }
            return results;
        }

        float[] queryEmbedding = null;

        // 1. Try CLIP sidecar for text-to-image semantic search
        try {
            String userDir = System.getProperty("user.dir");
            java.io.File sidecarDir;
            if (userDir.endsWith("backend")) {
                sidecarDir = new java.io.File(userDir, "sidecars");
            } else {
                sidecarDir = new java.io.File(new java.io.File(userDir, "backend"), "sidecars");
            }
            ProcessBuilder pb = new ProcessBuilder(PythonResolver.resolvePythonCommand(), "clip_sidecar.py", "encode_text", query);
            pb.directory(sidecarDir);
            Process process = pb.start();
            int exitCode = process.waitFor();
            if (exitCode == 0) {
                queryEmbedding = objectMapper.readValue(process.getInputStream(), float[].class);
            }
        } catch (Exception e) {
            System.out.println("[AURA] CLIP text encode unavailable, using nomic-embed-text for query: " + query);
        }

        // 2. Fallback: embed query with nomic-embed-text
        if (queryEmbedding == null) {
            queryEmbedding = embeddingService.embed(query);
        }

        chromaDBService.createCollection("images");
        var matches = chromaDBService.query("images", queryEmbedding, 10);
        for (var match : matches) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", match.getDocId());
            map.put("name", match.getDocName());
            map.put("score", match.getScore());
            map.put("description", match.getChunkText());
            map.put("url", match.getUrl());
            results.add(map);
        }
        return results;
    }
}
