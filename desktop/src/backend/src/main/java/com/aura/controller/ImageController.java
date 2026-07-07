package com.aura.controller;

import com.aura.service.ImageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Tag(name = "Image API", description = "Endpoints for image upload, indexing, and text-to-image semantic search via CLIP")
@RestController
@RequestMapping("/api/images")
public class ImageController {

    private final ImageService imageService;

    public ImageController(ImageService imageService) {
        this.imageService = imageService;
    }

    @Operation(summary = "Upload and index image", description = "Indexes a local image by generating its embedding via Python CLIP sidecar and saving it in ChromaDB")
    @PostMapping("/index")
    public ResponseEntity<Map<String, String>> indexImage(@RequestParam("file") MultipartFile file) {
        Map<String, String> response = new HashMap<>();
        try {
            imageService.indexImage(file);
            response.put("status", "SUCCESS");
            response.put("filename", file.getOriginalFilename());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("status", "FAILED");
            response.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @Operation(summary = "Search images semantically", description = "Searches for matching images in the local collection based on a natural language text query")
    @PostMapping("/search")
    public ResponseEntity<List<Map<String, Object>>> searchImages(@RequestBody Map<String, String> payload) {
        try {
            String query = payload.get("query");
            List<Map<String, Object>> results = imageService.searchImages(query != null ? query : "");
            return ResponseEntity.ok(results);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
