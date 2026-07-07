package com.aura.model;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SearchResult {
    private String chunkText;
    private String docId;
    private String docName;
    private Integer pageNumber;
    private double score; // Cosine distance / match percentage
    private String citation;
    private String url;
}
