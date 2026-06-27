package com.aura.service;

import com.aura.model.AuditLog;
import com.aura.repository.AuditLogRepository;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    public AuditLogService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    public void logEvent(String eventType, String description, String status) {
        try {
            AuditLog log = AuditLog.builder()
                    .timestamp(LocalDateTime.now())
                    .eventType(eventType)
                    .description(description)
                    .status(status)
                    .build();
            auditLogRepository.save(log);
        } catch (Exception e) {
            System.err.println("Failed to write audit log to database: " + e.getMessage());
        }
    }

    public List<AuditLog> getAllLogs() {
        return auditLogRepository.findAllByOrderByTimestampDesc();
    }
}
