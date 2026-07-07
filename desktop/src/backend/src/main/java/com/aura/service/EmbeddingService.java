package com.aura.service;

import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class EmbeddingService {

    private final OllamaService ollamaService;

    public EmbeddingService(OllamaService ollamaService) {
        this.ollamaService = ollamaService;
    }

    public float[] embed(String text) {
        return ollamaService.embed(text);
    }

    public List<float[]> embedBatch(List<String> texts) {
        return ollamaService.embedBatch(texts);
    }
}
