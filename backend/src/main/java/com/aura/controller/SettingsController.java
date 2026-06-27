package com.aura.controller;

import com.aura.service.SettingService;
import com.aura.service.AuditLogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@Tag(name = "Settings API", description = "Endpoints for retrieving or updating system configurations and local inference settings")
@RestController
@RequestMapping("/api/settings")
public class SettingsController {

    private final SettingService settingService;
    private final AuditLogService auditLogService;

    public SettingsController(SettingService settingService, AuditLogService auditLogService) {
        this.settingService = settingService;
        this.auditLogService = auditLogService;
    }

    @Operation(summary = "Get system settings", description = "Returns a key-value map of model configurations, temperatures, and threshold options")
    @GetMapping
    public ResponseEntity<Map<String, String>> getSettings() {
        return ResponseEntity.ok(settingService.getAllSettings());
    }

    @Operation(summary = "Save system settings", description = "Saves new configuration values in the local SQLite database and registers an audit log event")
    @PostMapping
    public ResponseEntity<Map<String, String>> saveSettings(@RequestBody Map<String, String> settings) {
        try {
            settingService.saveSettings(settings);
            auditLogService.logEvent("SETTINGS", "System settings updated in SQLite database configuration.", "Success");
            return ResponseEntity.ok(Map.of("message", "Settings saved successfully"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }
}
