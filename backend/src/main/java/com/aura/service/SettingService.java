package com.aura.service;

import com.aura.model.Setting;
import com.aura.repository.SettingRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.HashMap;
import java.util.Map;

@Service
public class SettingService {

    private final SettingRepository settingRepository;

    public SettingService(SettingRepository settingRepository) {
        this.settingRepository = settingRepository;
    }

    public Map<String, String> getAllSettings() {
        Map<String, String> settingsMap = new HashMap<>();
        settingRepository.findAll().forEach(setting -> {
            settingsMap.put(setting.getKey(), setting.getValue());
        });
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
    }

    public String getSetting(String key, String defaultValue) {
        return settingRepository.findByKey(key)
                .map(Setting::getValue)
                .orElse(defaultValue);
    }
}
