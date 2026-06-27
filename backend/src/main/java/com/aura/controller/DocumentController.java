package com.aura.controller;

import com.aura.dto.UploadResponse;
import com.aura.model.Document;
import com.aura.service.DocumentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;

@Tag(name = "Document API", description = "Endpoints for uploading, listing, and deleting documents inside the local RAG knowledge base")
@RestController
@RequestMapping("/api/documents")
public class DocumentController {

    private final DocumentService documentService;

    public DocumentController(DocumentService documentService) {
        this.documentService = documentService;
    }

    @Operation(summary = "Upload and index PDF document", description = "Extracts page content using PDFBox, embeds chunks, and stores them in ChromaDB")
    @PostMapping("/upload")
    public ResponseEntity<UploadResponse> uploadDocument(@RequestParam("file") MultipartFile file) {
        try {
            UploadResponse response = documentService.indexDocument(file);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(
                    UploadResponse.builder().status("FAILED: " + e.getMessage()).build()
            );
        }
    }

    @Operation(summary = "List all documents", description = "Retrieves a list of all indexed documents in the local database")
    @GetMapping
    public ResponseEntity<List<Document>> listDocuments() {
        return ResponseEntity.ok(documentService.getAllDocuments());
    }

    @Operation(summary = "Delete indexed document", description = "Deletes a document and its vector embeddings from ChromaDB and the SQLite database")
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
