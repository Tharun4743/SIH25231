package com.aura.model;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Chunk {
    private String id;
    private String docId;
    private String docName;
    private Integer pageNumber;
    private Integer chunkIndex;
    private String text;
    private float[] embedding;
}
