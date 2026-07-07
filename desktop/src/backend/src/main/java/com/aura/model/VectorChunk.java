package com.aura.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "vector_chunks")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VectorChunk {

    @Id
    private String id; // chunkId

    private String collectionName;

    private String docId;
    
    private String docName;
    
    private Integer pageNumber;

    private String url;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String text; // The chunk text

    @Lob
    private byte[] embedding; // The 768-dim float array serialized to bytes
}
