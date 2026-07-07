package com.aura.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * CF-03 FIX: CORS restricted to localhost origins only.
 *
 * Previous config used allowedOriginPatterns("*") with allowCredentials(true),
 * which allowed any rogue browser tab to make credentialed API calls to
 * localhost:8080 — a CSRF/SOP bypass vulnerability.
 *
 * Since AURA is a local-only desktop app served via Electron+Spring Boot,
 * all legitimate requests come from localhost:8080 (same origin).
 * allowCredentials is not needed for same-origin requests.
 */
@Configuration
public class CorsConfig {

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/api/**")
                        // Only allow the local backend origin (same-origin from Electron)
                        .allowedOrigins(
                            "http://localhost:8080",
                            "http://127.0.0.1:8080"
                        )
                        .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                        .allowedHeaders("Content-Type", "Accept", "Authorization")
                        // allowCredentials NOT set — not needed for localhost same-origin
                        .maxAge(3600);
            }
        };
    }
}
