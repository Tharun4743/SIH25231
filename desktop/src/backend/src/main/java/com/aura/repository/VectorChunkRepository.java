package com.aura.repository;

import com.aura.model.VectorChunk;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface VectorChunkRepository extends JpaRepository<VectorChunk, String> {

    List<VectorChunk> findByCollectionName(String collectionName);

    void deleteByDocId(String docId);

    void deleteByCollectionName(String collectionName);
}
