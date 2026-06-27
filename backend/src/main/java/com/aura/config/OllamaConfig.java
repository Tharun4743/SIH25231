package com.aura.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

@Configuration
public class OllamaConfig {

    @Value("${aura.ollama.url:http://localhost:11434}")
    private String ollamaUrl; // NEVER read from env var pointing to cloud

    private final OllamaInterceptor ollamaInterceptor;

    public OllamaConfig(OllamaInterceptor ollamaInterceptor) {
        this.ollamaInterceptor = ollamaInterceptor;
    }

    @Bean
    public RestTemplate restTemplate() {
        RestTemplate rt = new RestTemplate();
        rt.getInterceptors().add(ollamaInterceptor);
        
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);
        factory.setReadTimeout(120000); // 2 min for large GPU inference
        rt.setRequestFactory(factory);
        return rt;
    }
}
