package com.aura.config;

import com.aura.model.Setting;
import com.aura.repository.SettingRepository;
import com.aura.service.AuditLogService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import java.util.HashMap;
import java.util.Map;

@Component
public class DatabaseInitializer implements CommandLineRunner {

    private final SettingRepository settingRepository;
    private final AuditLogService auditLogService;

    public DatabaseInitializer(SettingRepository settingRepository, AuditLogService auditLogService) {
        this.settingRepository = settingRepository;
        this.auditLogService = auditLogService;
    }

    @Override
    public void run(String... args) {
        // Seed default settings if empty
        if (settingRepository.count() == 0) {
            Map<String, String> defaults = new HashMap<>();
            defaults.put("ollama_url", "http://localhost:11434");
            defaults.put("chroma_url", "http://localhost:8001");
            defaults.put("chunk_size", "500");
            defaults.put("overlap", "100");
            defaults.put("top_k", "5");
            defaults.put("model_name", "llama3");
            defaults.put("temperature", "0.1");
            defaults.put("enable_fallback", "true");

            defaults.forEach((key, value) -> {
                settingRepository.save(Setting.builder().key(key).value(value).build());
            });
            System.out.println("AURA: Seeded default system settings into SQLite.");
        }

        // Add starting system log entry
        auditLogService.logEvent(
                "SERVER_START",
                "AURA SQLite3 offline-first database kernel successfully mounted and tables generated.",
                "Success"
        );
    }
}
