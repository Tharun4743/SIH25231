package com.aura.service;

import com.aura.model.Document;
import com.aura.repository.DocumentRepository;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Phase 1 Fix: All heavy document processing runs in the 'documentIndexingExecutor'
 * pool, NOT in the HTTP request thread.
 *
 * Architecture:
 *   HTTP thread  →  DocumentController  →  DocumentService.submitIndexJob()  →  returns jobId immediately
 *   Worker thread  →  AsyncDocumentProcessor.processDocument()  →  embeds + stores all chunks
 *
 * This prevents HTTP thread exhaustion on large documents (100+ pages) that
 * previously took 5–30 minutes blocking the servlet container's thread pool.
 */
@Service
public class AsyncDocumentProcessor {

    private static final Logger log = LoggerFactory.getLogger(AsyncDocumentProcessor.class);

    private final DocumentRepository documentRepository;
    private final ChunkingService chunkingService;
    private final EmbeddingService embeddingService;
    private final ChromaDBService chromaDBService;
    private final AuditLogService auditLogService;
    private final SettingService settingService;
    private final IndexingJobService jobService;

    public AsyncDocumentProcessor(DocumentRepository documentRepository,
                                   ChunkingService chunkingService,
                                   EmbeddingService embeddingService,
                                   ChromaDBService chromaDBService,
                                   AuditLogService auditLogService,
                                   SettingService settingService,
                                   IndexingJobService jobService) {
        this.documentRepository = documentRepository;
        this.chunkingService = chunkingService;
        this.embeddingService = embeddingService;
        this.chromaDBService = chromaDBService;
        this.auditLogService = auditLogService;
        this.settingService = settingService;
        this.jobService = jobService;
    }

    /**
     * Processes a document asynchronously in the documentIndexingExecutor pool.
     *
     * Called from DocumentService.submitIndexJob() — the HTTP response has already
     * been sent to the client before this method body starts executing.
     *
     * @param filename     Original filename (for metadata)
     * @param contentType  MIME type of the uploaded file
     * @param fileBytes    Raw file bytes (captured before the MultipartFile expires)
     * @param fileSize     File size in bytes
     * @param job          Job tracker instance (pre-created by IndexingJobService)
     */
    @Async("documentIndexingExecutor")
    public void processDocument(String filename,
                                 String contentType,
                                 byte[] fileBytes,
                                 long fileSize,
                                 IndexingJobService.IndexingJob job) {
        log.info("[AURA INDEXER] Starting async indexing job {} for file: {}", job.jobId, filename);
        jobService.markProcessing(job, "Extracting text from document...");

        try {
            // ── Step 1: Text extraction ──────────────────────────────────
            List<String> pagesText = extractTextByPage(filename, fileBytes);
            int pageCount = pagesText.size();
            log.info("[AURA INDEXER] Job {} — extracted {} pages from '{}'", job.jobId, pageCount, filename);

            // ── Step 2: Persist document metadata to SQLite ──────────────
            Document document = Document.builder()
                    .name(filename)
                    .type(contentType)
                    .size(fileSize)
                    .uploadedAt(LocalDateTime.now())
                    .pageCount(pageCount)
                    .build();
            document = documentRepository.save(document);
            final String docId = document.getId();

            // ── Step 3: Chunking + embedding ─────────────────────────────
            int chunkSize   = parseInt(settingService.getSetting("chunk_size", "500"));
            int overlapSize = parseInt(settingService.getSetting("overlap", "100"));

            List<String>              ids       = new ArrayList<>();
            List<String>              texts     = new ArrayList<>();
            List<float[]>             embeddings = new ArrayList<>();
            List<Map<String, Object>> metadatas  = new ArrayList<>();

            int chunkCounter = 0;

            for (int p = 0; p < pageCount; p++) {
                String pageText = pagesText.get(p);
                if (pageText == null || pageText.isBlank()) continue;

                List<String> chunks = chunkingService.overlappingChunk(pageText, chunkSize, overlapSize);
                jobService.markProcessing(job,
                    String.format("Embedding page %d / %d (%d chunks)...", p + 1, pageCount, chunks.size()));

                for (int c = 0; c < chunks.size(); c++) {
                    String chunkText = chunks.get(c);
                    String chunkId   = "chunk-" + docId + "-" + p + "-" + c;

                    float[] embedding = embeddingService.embed(chunkText); // may return fallback on error

                    Map<String, Object> metadata = new HashMap<>();
                    metadata.put("docId",      docId);
                    metadata.put("docName",    filename);
                    metadata.put("pageNumber", p + 1);
                    metadata.put("chunkIndex", chunkCounter);

                    ids.add(chunkId);
                    texts.add(chunkText);
                    embeddings.add(embedding);
                    metadatas.add(metadata);
                    chunkCounter++;
                }

                // Flush in batches of 100 chunks — prevents one enormous list in memory
                if (ids.size() >= 100) {
                    chromaDBService.createCollection("aura-documents");
                    chromaDBService.addChunks("aura-documents", ids, texts, embeddings, metadatas);
                    ids.clear(); texts.clear(); embeddings.clear(); metadatas.clear();
                }
            }

            // Flush remaining chunks
            if (!ids.isEmpty()) {
                chromaDBService.createCollection("aura-documents");
                chromaDBService.addChunks("aura-documents", ids, texts, embeddings, metadatas);
            }

            // ── Step 4: Mark job complete ────────────────────────────────
            jobService.markDone(job, pageCount, chunkCounter);
            auditLogService.logEvent("UPLOAD",
                "Async indexing complete for \"" + filename + "\": " + chunkCounter + " chunks from " + pageCount + " pages.",
                "Success");

            log.info("[AURA INDEXER] Job {} — DONE: {} chunks indexed for '{}'",
                job.jobId, chunkCounter, filename);

        } catch (Exception e) {
            log.error("[AURA INDEXER] Job {} — FAILED for '{}': {}", job.jobId, filename, e.getMessage(), e);
            jobService.markFailed(job, e.getMessage());
            auditLogService.logEvent("UPLOAD_ERROR",
                "Async indexing FAILED for \"" + filename + "\": " + e.getMessage(), "Failed");
        }
    }

    // ─── Text extraction ─────────────────────────────────────────────────────

    private List<String> extractTextByPage(String filename, byte[] fileBytes) throws Exception {
        List<String> pagesText = new ArrayList<>();
        if (filename != null && filename.toLowerCase().endsWith(".pdf")) {
            try (PDDocument pdDoc = Loader.loadPDF(fileBytes)) {
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
            // Plain text / markdown — treat as single page
            pagesText.add(new String(fileBytes));
        }
        return pagesText;
    }

    private int parseInt(String val) {
        try { return Integer.parseInt(val); } catch (NumberFormatException e) { return 500; }
    }
}
