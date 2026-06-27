package com.aura.controller;

import com.aura.repository.DocumentRepository;
import com.aura.repository.AuditLogRepository;
import com.aura.service.ChromaDBService;
import jakarta.persistence.EntityManager;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.Map;

@Tag(name = "Stats API", description = "Endpoints for retrieving system metrics and database analytics")
@RestController
@RequestMapping("/api/stats")
public class StatsController {

    private final DocumentRepository documentRepository;
    private final AuditLogRepository auditLogRepository;
    private final EntityManager entityManager;
    private final ChromaDBService chromaDBService;

    public StatsController(DocumentRepository documentRepository,
                           AuditLogRepository auditLogRepository,
                           EntityManager entityManager,
                           ChromaDBService chromaDBService) {
        this.documentRepository = documentRepository;
        this.auditLogRepository = auditLogRepository;
        this.entityManager = entityManager;
        this.chromaDBService = chromaDBService;
    }

    @Operation(summary = "Get workspace stats", description = "Returns statistics on indexed document counts, vector chunks, audit logs, and local SQLite storage usage")
    @GetMapping
    public ResponseEntity<Map<String, Object>> getStats() {
        Map<String, Object> stats = new HashMap<>();
        try {
            long docCount = documentRepository.count();
            long logCount = auditLogRepository.count();

            // Dynamic count of ChromaDB chunks
            long chunkCount = chromaDBService.getCollectionSize("aura-documents");

            // Sum of sizes from documents table
            long storageUsed = 0;
            try {
                Number sum = (Number) entityManager.createNativeQuery("SELECT SUM(size) FROM documents").getSingleResult();
                if (sum != null) {
                    storageUsed = sum.longValue();
                }
            } catch (Exception e) {
                // Table empty or not loaded yet
            }

            stats.put("documentsCount", docCount);
            stats.put("chunksCount", chunkCount);
            stats.put("auditLogsCount", logCount);
            stats.put("storageUsed", storageUsed);
        } catch (Exception e) {
            stats.put("error", e.getMessage());
        }
        return ResponseEntity.ok(stats);
    }
}
