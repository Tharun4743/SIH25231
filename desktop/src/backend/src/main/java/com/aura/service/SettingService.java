package com.aura.service;

import com.aura.model.Setting;
import com.aura.repository.SettingRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.io.File;
import java.nio.file.Files;
import java.util.HashMap;
import java.util.Map;

@Service
public class SettingService {

    private final SettingRepository settingRepository;

    @Value("${spring.datasource.url:}")
    private String dbUrl;

    public SettingService(SettingRepository settingRepository) {
        this.settingRepository = settingRepository;
    }

    public Map<String, String> getAllSettings() {
        Map<String, String> settingsMap = new HashMap<>();
        settingRepository.findAll().forEach(setting -> {
            settingsMap.put(setting.getKey(), setting.getValue());
        });
        if (!settingsMap.containsKey("auto_start_ollama")) {
            settingsMap.put("auto_start_ollama", "true");
        }
        return settingsMap;
    }

    @Transactional
    public void saveSettings(Map<String, String> settings) {
        for (Map.Entry<String, String> entry : settings.entrySet()) {
            Setting setting = settingRepository.findByKey(entry.getKey())
                    .orElse(Setting.builder().key(entry.getKey()).build());
            setting.setValue(entry.getValue());
            settingRepository.save(setting);
        }
        writeElectronConfig();
    }

    public String getSetting(String key, String defaultValue) {
        return settingRepository.findByKey(key)
                .map(Setting::getValue)
                .orElse(defaultValue);
    }

    public void writeElectronConfig() {
        if (dbUrl == null || !dbUrl.startsWith("jdbc:sqlite:")) {
            return;
        }
        try {
            String dbPath = dbUrl.substring("jdbc:sqlite:".length());
            File dbFile = new File(dbPath);
            File dataDir = dbFile.getParentFile();
            if (dataDir == null) return;
            File userDataDir = dataDir.getParentFile();
            if (userDataDir == null || !userDataDir.exists()) {
                userDataDir = dataDir;
            }
            File configFile = new File(userDataDir, "aura-config.json");
            String autoStartVal = getSetting("auto_start_ollama", "true");
            boolean autoStart = !"false".equalsIgnoreCase(autoStartVal);

            String json = "{\"autoStartOllama\":" + autoStart + "}";
            Files.writeString(configFile.toPath(), json);
            System.out.println("AURA: Wrote Electron config to " + configFile.getAbsolutePath() + " -> " + json);
        } catch (Exception e) {
            System.err.println("AURA ERROR: Failed to write Electron config: " + e.getMessage());
        }
    }
}
