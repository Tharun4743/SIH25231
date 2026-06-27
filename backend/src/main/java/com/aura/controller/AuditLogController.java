package com.aura.controller;

import com.aura.model.AuditLog;
import com.aura.service.AuditLogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Tag(name = "Audit Log API", description = "Endpoints for viewing local security and event audit logs")
@RestController
@RequestMapping("/api/logs")
public class AuditLogController {

    private final AuditLogService auditLogService;

    public AuditLogController(AuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    @Operation(summary = "Get all audit logs", description = "Returns a chronological history of local document indexes, transcription requests, and AI queries")
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getLogs() {
        List<AuditLog> logs = auditLogService.getAllLogs();
        List<Map<String, Object>> mappedLogs = new ArrayList<>();

        for (AuditLog log : logs) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", "log-" + log.getId());
            map.put("timestamp", log.getTimestamp() != null ? log.getTimestamp().toString() : "");
            map.put("event", log.getEventType());
            map.put("description", log.getDescription());
            map.put("status", log.getStatus());
            map.put("operator", "AURA_SYSTEM");
            mappedLogs.add(map);
        }

        return ResponseEntity.ok(mappedLogs);
    }
}
