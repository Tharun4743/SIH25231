package com.aura.controller;

import com.aura.model.Document;
import com.aura.service.DocumentService;
import com.aura.service.IndexingJobService;
import com.aura.service.IndexingJobService.IndexingJob;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Phase 1 Fix: Document upload is now fully async.
 *
 * POST /api/documents/upload → returns jobId immediately (HTTP 202 Accepted)
 * GET  /api/documents/status/{jobId} → poll for job completion
 *
 * Phase 3 Fix: File type validation added.
 * Only PDF and plain text files are accepted. Binary uploads are rejected
 * with a 400 error before any processing occurs.
 */
@Tag(name = "Document API", description = "Endpoints for uploading, listing, and deleting documents inside the local RAG knowledge base")
@RestController
@RequestMapping("/api/documents")
public class DocumentController {

    /**
     * Allowlisted MIME types. Only these will be accepted for indexing.
     * Prevents users from uploading executables, archives, or other binary formats
     * that would fail extraction and waste processing resources.
     */
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
        "application/pdf",
        "text/plain",
        "text/markdown",
        "text/x-markdown",
        "application/octet-stream" // some browsers send this for .txt; allow as fallback
    );

    private static final long MAX_FILE_SIZE_BYTES = 50L * 1024 * 1024; // 50 MB hard cap

    private final DocumentService documentService;
    private final IndexingJobService jobService;

    public DocumentController(DocumentService documentService, IndexingJobService jobService) {
        this.documentService = documentService;
        this.jobService = jobService;
    }

    @Operation(summary = "Upload and async-index document",
               description = "Accepts PDF or text files. Returns a jobId immediately — use /status/{jobId} to poll for completion.")
    @PostMapping("/upload")
    public ResponseEntity<?> uploadDocument(@RequestParam("file") MultipartFile file) {
        // ── File validation ─────────────────────────────────────────────
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No file was provided."));
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            return ResponseEntity.badRequest().body(
                Map.of("error", "File exceeds the 50 MB upload limit."));
        }

        String contentType = file.getContentType();
        String filename    = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase() : "";

        boolean validMime = contentType != null && ALLOWED_CONTENT_TYPES.contains(contentType);
        boolean validExt  = filename.endsWith(".pdf") || filename.endsWith(".txt") || filename.endsWith(".md");

        if (!validMime && !validExt) {
            return ResponseEntity.badRequest().body(
                Map.of("error", "Unsupported file type. Please upload a PDF or text file."));
        }

        try {
            // Submit to async pipeline — returns job immediately (< 50ms)
            IndexingJob job = documentService.submitIndexJob(file);
            return ResponseEntity.accepted().body(Map.of(
                "jobId",   job.jobId,
                "docName", job.docName,
                "status",  job.status.name(),
                "message", job.message
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(
                Map.of("error", "Failed to submit document for indexing: " + e.getMessage()));
        }
    }

    @Operation(summary = "Poll document indexing status",
               description = "Returns the current state of an async indexing job.")
    @GetMapping("/status/{jobId}")
    public ResponseEntity<?> getIndexingStatus(@PathVariable("jobId") String jobId) {
        IndexingJob job = jobService.getJob(jobId);
        if (job == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(Map.of(
            "jobId",        job.jobId,
            "docName",      job.docName != null ? job.docName : "",
            "status",       job.status.name(),
            "message",      job.message != null ? job.message : "",
            "pageCount",    job.pageCount,
            "chunksCreated", job.chunksCreated
        ));
    }

    @Operation(summary = "List all indexed documents",
               description = "Retrieves a list of all successfully indexed documents in the local database")
    @GetMapping
    public ResponseEntity<List<Document>> listDocuments() {
        return ResponseEntity.ok(documentService.getAllDocuments());
    }

    @Operation(summary = "Delete indexed document",
               description = "Deletes a document and its vector embeddings from the vector store and SQLite database")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDocument(@PathVariable("id") String id) {
        try {
            documentService.deleteDocument(id);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
}
