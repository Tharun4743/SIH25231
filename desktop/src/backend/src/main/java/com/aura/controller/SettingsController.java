package com.aura.controller;

import com.aura.service.SettingService;
import com.aura.service.AuditLogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * W-08 FIX: Settings controller now validates URL values before persisting.
 *
 * Previously, the ChromaDB and Ollama URL settings could be changed to any
 * external host via the Settings UI, allowing potential data exfiltration
 * of document embeddings to a remote server.
 *
 * All URL-type settings are now restricted to localhost/127.0.0.1 only.
 */
@Tag(name = "Settings API", description = "Endpoints for retrieving or updating system configurations and local inference settings")
@RestController
@RequestMapping("/api/settings")
public class SettingsController {

    private final SettingService settingService;
    private final AuditLogService auditLogService;

    /** Keys that contain URLs and must point to localhost only. */
    private static final java.util.Set<String> URL_KEYS = java.util.Set.of(
        "ollama_url", "chroma_url"
    );

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
            // W-08 FIX: Validate URL fields to localhost only before persisting.
            for (String key : URL_KEYS) {
                String value = settings.get(key);
                if (value != null && !isLocalhostUrl(value)) {
                    return ResponseEntity.badRequest().body(
                        Map.of("error", "Setting '" + key + "' must point to localhost only. External endpoints are not permitted.")
                    );
                }
            }
            settingService.saveSettings(settings);
            auditLogService.logEvent("SETTINGS", "System settings updated in SQLite database configuration.", "Success");
            return ResponseEntity.ok(Map.of("message", "Settings saved successfully"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Returns true if the provided URL string is a localhost/loopback URL.
     * Accepts http:// only (no https for localhost, no external hosts).
     */
    private boolean isLocalhostUrl(String url) {
        if (url == null || url.isBlank()) return false;
        try {
            java.net.URI uri = java.net.URI.create(url);
            String host = uri.getHost();
            return host != null && (host.equals("localhost") || host.equals("127.0.0.1"));
        } catch (Exception e) {
            return false;
        }
    }
}
