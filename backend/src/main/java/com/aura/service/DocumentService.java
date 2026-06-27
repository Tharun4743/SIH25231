package com.aura.service;

import com.aura.dto.UploadResponse;
import com.aura.model.Document;
import com.aura.repository.DocumentRepository;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final ChunkingService chunkingService;
    private final EmbeddingService embeddingService;
    private final ChromaDBService chromaDBService;
    private final AuditLogService auditLogService;
    private final SettingService settingService;

    public DocumentService(DocumentRepository documentRepository,
                           ChunkingService chunkingService,
                           EmbeddingService embeddingService,
                           ChromaDBService chromaDBService,
                           AuditLogService auditLogService,
                           SettingService settingService) {
        this.documentRepository = documentRepository;
        this.chunkingService = chunkingService;
        this.embeddingService = embeddingService;
        this.chromaDBService = chromaDBService;
        this.auditLogService = auditLogService;
        this.settingService = settingService;
    }

    public List<Document> getAllDocuments() {
        return documentRepository.findAll();
    }

    public void deleteDocument(String id) {
        Document doc = documentRepository.findById(id).orElse(null);
        String name = doc != null ? doc.getName() : "Source";
        documentRepository.deleteById(id);
        chromaDBService.deleteDocument(id);
        auditLogService.logEvent("DELETE", "Deindexed and removed source file \"" + name + "\" from system repositories.", "Success");
    }

    public UploadResponse indexDocument(MultipartFile file) throws IOException {
        String filename = file.getOriginalFilename();
        String contentType = file.getContentType();
        long size = file.getSize();

        // 1. Text extraction page-by-page
        List<String> pagesText = extractTextByPage(file);
        int pageCount = pagesText.size();

        // 2. Save metadata entity to SQLite Database
        Document document = Document.builder()
                .name(filename)
                .type(contentType)
                .size(size)
                .uploadedAt(LocalDateTime.now())
                .pageCount(pageCount)
                .build();
        document = documentRepository.save(document);
        String docId = document.getId();

        // 3. Document chunking using sliding windows
        List<String> ids = new ArrayList<>();
        List<String> texts = new ArrayList<>();
        List<float[]> embeddings = new ArrayList<>();
        List<Map<String, Object>> metadatas = new ArrayList<>();

        int chunkCounter = 0;
        // Read chunk_size and overlap from live settings
        int chunkSize = Integer.parseInt(settingService.getSetting("chunk_size", "500"));
        int overlapSize = Integer.parseInt(settingService.getSetting("overlap", "100"));
        for (int p = 0; p < pageCount; p++) {
            String pageText = pagesText.get(p);
            List<String> chunks = chunkingService.overlappingChunk(pageText, chunkSize, overlapSize);
            
            for (int c = 0; c < chunks.size(); c++) {
                String chunkText = chunks.get(c);
                String chunkId = "chunk-" + docId + "-" + p + "-" + c;
                float[] embedding = embeddingService.embed(chunkText);

                Map<String, Object> metadata = new HashMap<>();
                metadata.put("docId", docId);
                metadata.put("docName", filename);
                metadata.put("pageNumber", p + 1);
                metadata.put("chunkIndex", chunkCounter);

                ids.add(chunkId);
                texts.add(chunkText);
                embeddings.add(embedding);
                metadatas.add(metadata);
                chunkCounter++;
            }
        }

        // 4. Index chunks into ChromaDB collection "aura-documents"
        chromaDBService.createCollection("aura-documents");
        chromaDBService.addChunks("aura-documents", ids, texts, embeddings, metadatas);
        
        auditLogService.logEvent("UPLOAD", "Successfully indexed and vectorized document \"" + filename + "\" into " + chunkCounter + " chunks.", "Success");

        return UploadResponse.builder()
                .id(docId)
                .name(filename)
                .pageCount(pageCount)
                .chunksCreated(chunkCounter)
                .status("SUCCESS")
                .build();
    }

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
            // For non-PDF text files, read everything as a single page
            String plainText = new String(file.getBytes());
            pagesText.add(plainText);
        }
        return pagesText;
    }
}
