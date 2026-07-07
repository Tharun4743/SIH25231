package com.aura.service;

import com.aura.model.Document;
import com.aura.repository.DocumentRepository;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

/**
 * Phase 1 Fix: DocumentService is now a thin orchestrator.
 *
 * indexDocument() was previously a 30-minute blocking call that:
 *   - Loaded the entire PDF in the HTTP thread
 *   - Made N sequential Ollama HTTP calls (one per chunk)
 *   - Blocked the servlet thread pool under any non-trivial document
 *
 * Now it:
 *   1. Reads the file bytes immediately (MultipartFile expires after the HTTP lifecycle)
 *   2. Creates a tracking job
 *   3. Submits the job to AsyncDocumentProcessor (runs in documentIndexingExecutor)
 *   4. Returns the job immediately — the HTTP thread is freed in < 50ms
 */
@Service
public class DocumentService {

    private static final Logger log = LoggerFactory.getLogger(DocumentService.class);

    private final DocumentRepository documentRepository;
    private final ChromaDBService chromaDBService;
    private final AuditLogService auditLogService;
    private final AsyncDocumentProcessor asyncProcessor;
    private final IndexingJobService jobService;

    public DocumentService(DocumentRepository documentRepository,
                           ChromaDBService chromaDBService,
                           AuditLogService auditLogService,
                           AsyncDocumentProcessor asyncProcessor,
                           IndexingJobService jobService) {
        this.documentRepository = documentRepository;
        this.chromaDBService = chromaDBService;
        this.auditLogService = auditLogService;
        this.asyncProcessor = asyncProcessor;
        this.jobService = jobService;
    }

    public List<Document> getAllDocuments() {
        return documentRepository.findAll();
    }

    public void deleteDocument(String id) {
        Document doc = documentRepository.findById(id).orElse(null);
        String name = doc != null ? doc.getName() : "Source";
        documentRepository.deleteById(id);
        chromaDBService.deleteDocument(id);
        auditLogService.logEvent("DELETE",
            "Deindexed and removed source file \"" + name + "\" from system repositories.",
            "Success");
        log.info("[AURA] Document deleted: {}", name);
    }

    /**
     * Submit a document for async indexing.
     *
     * Reads the raw bytes immediately (MultipartFile expires after request lifecycle),
     * then delegates all heavy processing to AsyncDocumentProcessor.
     *
     * @return IndexingJob — caller uses job.jobId to poll /api/documents/status/{jobId}
     */
    public IndexingJobService.IndexingJob submitIndexJob(MultipartFile file) throws IOException {
        String filename    = file.getOriginalFilename();
        String contentType = file.getContentType();
        long   fileSize    = file.getSize();

        // Read bytes NOW — MultipartFile input stream closes after HTTP lifecycle ends.
        byte[] fileBytes = file.getBytes();

        IndexingJobService.IndexingJob job = jobService.createJob(filename);
        log.info("[AURA] Document submitted for async indexing: {} (jobId={})", filename, job.jobId);

        // Dispatch to async worker — returns immediately
        asyncProcessor.processDocument(filename, contentType, fileBytes, fileSize, job);

        return job;
    }

    /**
     * Kept for synchronous text extraction used by audit/preview features.
     */
    public List<String> extractTextByPage(MultipartFile file) throws IOException {
        List<String> pagesText = new ArrayList<>();
        String filename = file.getOriginalFilename();
        if (filename != null && filename.toLowerCase().endsWith(".pdf")) {
            try (PDDocument pdDoc = Loader.loadPDF(file.getBytes())) {
                int pages = pdDoc.getNumberOfPages();
                PDFTextStripper stripper = new PDFTextStripper();
                for (int i = 1; i <= pages; i++) {
                    stripper.setStartPage(i);
                    stripper.setEndPage(i);
                    String pageText = stripper.getText(pdDoc);
                    pagesText.add(pageText != null ? pageText.trim() : "");
                }
            }
        } else {
            pagesText.add(new String(file.getBytes()));
        }
        return pagesText;
    }
}
