package com.aura.service;

import com.aura.model.SearchResult;
import com.aura.model.VectorChunk;
import com.aura.repository.VectorChunkRepository;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.ByteBuffer;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.locks.ReentrantReadWriteLock;

/**
 * Unified Embedded Vector DB Service.
 *
 * Enforces a SINGLE SOURCE OF TRUTH: All vector embeddings and metadata are stored
 * permanently in `aura.db` (SQLite) via JPA (VectorChunkRepository).
 * 
 * At startup, it loads the embeddings from SQLite into a high-performance in-memory
 * index to support sub-millisecond O(N) cosine similarity queries.
 *
 * ALL JSON fallback caches and external ChromaDB Docker dependencies have been removed.
 */
@Service
public class ChromaDBService {

    private static final Logger log = LoggerFactory.getLogger(ChromaDBService.class);

    // ── Memory cap ────────────────────────────────────────────────────────────
    /** Hard ceiling on total chunks stored in memory. */
    private static final int MAX_TOTAL_CHUNKS = 50_000;
    private static final int EVICTION_BATCH   = 1_000;

    // ── Vector store index (In-Memory Cache over SQLite) ──────────────────────
    private final ConcurrentHashMap<String, LinkedList<Map<String, Object>>> store = new ConcurrentHashMap<>();
    private final ReentrantReadWriteLock lock = new ReentrantReadWriteLock();
    private final AtomicInteger totalChunks = new AtomicInteger(0);
    private final LinkedList<String> insertionOrder = new LinkedList<>();
    private final ConcurrentHashMap<String, String> chunkToCollection = new ConcurrentHashMap<>();

    // ── Embedding deduplication cache ─────────────────────────────────────────
    private final LinkedHashMap<String, float[]> embeddingCache =
        new LinkedHashMap<>(1000, 0.75f, true) {
            @Override
            protected boolean removeEldestEntry(Map.Entry<String, float[]> eldest) {
                return size() > 5_000;
            }
        };
    private final Object embeddingCacheLock = new Object();

    // ── Dependencies ──────────────────────────────────────────────────────────
    private final VectorChunkRepository vectorChunkRepository;

    public ChromaDBService(VectorChunkRepository vectorChunkRepository) {
        this.vectorChunkRepository = vectorChunkRepository;
    }

    // ─── Initialisation ───────────────────────────────────────────────────────

    @PostConstruct
    public void init() {
        log.info("[AURA VECTOR-DB] Initializing unified SQLite vector storage...");
        try {
            List<VectorChunk> allChunks = vectorChunkRepository.findAll();
            if (allChunks.isEmpty()) {
                log.info("[AURA VECTOR-DB] Vector store is empty.");
                return;
            }

            lock.writeLock().lock();
            try {
                for (VectorChunk chunk : allChunks) {
                    float[] vec = deserializeEmbedding(chunk.getEmbedding());
                    if (vec == null) continue;

                    Map<String, Object> metadata = new HashMap<>();
                    metadata.put("docId", chunk.getDocId());
                    metadata.put("docName", chunk.getDocName());
                    metadata.put("pageNumber", chunk.getPageNumber());
                    metadata.put("url", chunk.getUrl());

                    Map<String, Object> item = new HashMap<>();
                    item.put("id", chunk.getId());
                    item.put("text", chunk.getText());
                    item.put("embedding", vec);
                    item.put("metadata", metadata);

                    String colName = chunk.getCollectionName();
                    store.computeIfAbsent(colName, k -> new LinkedList<>()).addLast(item);
                    insertionOrder.addLast(chunk.getId());
                    chunkToCollection.put(chunk.getId(), colName);
                    totalChunks.incrementAndGet();
                }
            } finally {
                lock.writeLock().unlock();
            }
            log.info("[AURA VECTOR-DB] Loaded {} chunks from SQLite into high-speed memory index.", totalChunks.get());
        } catch (Exception e) {
            log.error("[AURA VECTOR-DB] Failed to load chunks from SQLite: {}", e.getMessage(), e);
        }
    }

    // ─── Public API ───────────────────────────────────────────────────────────

    public void createCollection(String name) {
        store.computeIfAbsent(name, k -> new LinkedList<>());
    }

    @Transactional
    public void addChunks(String collectionId,
                          List<String>              ids,
                          List<String>              texts,
                          List<float[]>             embeddings,
                          List<Map<String, Object>> metadatas) {

        List<VectorChunk> toSave = new ArrayList<>();

        lock.writeLock().lock();
        try {
            LinkedList<Map<String, Object>> collection = store.computeIfAbsent(collectionId, k -> new LinkedList<>());

            for (int i = 0; i < ids.size(); i++) {
                String chunkId = ids.get(i);
                if (chunkToCollection.containsKey(chunkId)) continue; // Deduplicate

                Map<String, Object> meta = metadatas.get(i);
                
                // Prepare JPA Entity
                VectorChunk entity = VectorChunk.builder()
                        .id(chunkId)
                        .collectionName(collectionId)
                        .docId((String) meta.get("docId"))
                        .docName((String) meta.get("docName"))
                        .pageNumber(meta.get("pageNumber") instanceof Number ? ((Number) meta.get("pageNumber")).intValue() : 0)
                        .url((String) meta.get("url"))
                        .text(texts.get(i))
                        .embedding(serializeEmbedding(embeddings.get(i)))
                        .build();
                toSave.add(entity);

                // Update In-Memory Index
                Map<String, Object> item = new HashMap<>();
                item.put("id", chunkId);
                item.put("text", texts.get(i));
                item.put("embedding", embeddings.get(i));
                item.put("metadata", meta);

                collection.addLast(item);
                insertionOrder.addLast(chunkId);
                chunkToCollection.put(chunkId, collectionId);
                totalChunks.incrementAndGet();
            }

            // Persist to Single Source of Truth
            if (!toSave.isEmpty()) {
                vectorChunkRepository.saveAll(toSave);
            }

            evictIfNeeded();

        } finally {
            lock.writeLock().unlock();
        }
    }

    @SuppressWarnings("unchecked")
    public List<SearchResult> query(String collectionId, float[] queryEmbedding, int topK) {
        return query(collectionId, queryEmbedding, topK, null);
    }

    @SuppressWarnings("unchecked")
    public List<SearchResult> query(String collectionId, float[] queryEmbedding, int topK, String filterDocId) {
        List<Map<String, Object>> snapshot;
        lock.readLock().lock();
        try {
            LinkedList<Map<String, Object>> collection = store.get(collectionId);
            snapshot = (collection != null) ? new ArrayList<>(collection) : Collections.emptyList();
        } finally {
            lock.readLock().unlock();
        }

        List<ScoredItem> scored = new ArrayList<>(snapshot.size());
        for (Map<String, Object> item : snapshot) {
            Map<String, Object> meta = (Map<String, Object>) item.get("metadata");
            if (filterDocId != null && !filterDocId.trim().isEmpty()) {
                if (meta == null || !filterDocId.equals(meta.get("docId"))) {
                    continue;
                }
            }
            float[] vec = (float[]) item.get("embedding");
            if (vec == null) continue;
            double score = cosineSimilarity(queryEmbedding, vec);
            scored.add(new ScoredItem(item, score));
        }

        scored.sort((a, b) -> Double.compare(b.score, a.score));

        List<SearchResult> results = new ArrayList<>();
        int limit = Math.min(topK, scored.size());
        for (int i = 0; i < limit; i++) {
            Map<String, Object> s    = scored.get(i).item;
            Map<String, Object> meta = (Map<String, Object>) s.get("metadata");
            if (meta == null) continue;

            results.add(SearchResult.builder()
                .chunkText((String) s.get("text"))
                .docId((String) meta.get("docId"))
                .docName((String) meta.get("docName"))
                .pageNumber(meta.get("pageNumber") instanceof Number ? ((Number) meta.get("pageNumber")).intValue() : 0)
                .score(scored.get(i).score * 100.0)
                .citation(meta.get("docName") + " (Page " + meta.get("pageNumber") + ")")
                .url((String) meta.get("url"))
                .build());
        }
        return results;
    }

    public int getCollectionSize(String collectionId) {
        lock.readLock().lock();
        try {
            LinkedList<Map<String, Object>> col = store.get(collectionId);
            return col != null ? col.size() : 0;
        } finally {
            lock.readLock().unlock();
        }
    }

    public List<Map<String, Object>> getCollectionItems(String collectionId) {
        lock.readLock().lock();
        try {
            LinkedList<Map<String, Object>> col = store.get(collectionId);
            return col != null ? new ArrayList<>(col) : Collections.emptyList();
        } finally {
            lock.readLock().unlock();
        }
    }

    @Transactional
    @SuppressWarnings("unchecked")
    public void deleteDocument(String docId) {
        // Delete from Single Source of Truth
        vectorChunkRepository.deleteByDocId(docId);

        // Remove from In-Memory Index
        lock.writeLock().lock();
        try {
            for (LinkedList<Map<String, Object>> col : store.values()) {
                Iterator<Map<String, Object>> it = col.iterator();
                while (it.hasNext()) {
                    Map<String, Object> item = it.next();
                    Map<String, Object> meta = (Map<String, Object>) item.get("metadata");
                    if (meta != null && docId.equals(meta.get("docId"))) {
                        String chunkId = (String) item.get("id");
                        it.remove();
                        chunkToCollection.remove(chunkId);
                        insertionOrder.remove(chunkId);
                        totalChunks.decrementAndGet();
                    }
                }
            }
        } finally {
            lock.writeLock().unlock();
        }
    }

    // ── Embedding deduplication cache ─────────────────────────────────────────
    public float[] getCachedEmbedding(String textHash) {
        synchronized (embeddingCacheLock) {
            return embeddingCache.get(textHash);
        }
    }

    public void cacheEmbedding(String textHash, float[] embedding) {
        synchronized (embeddingCacheLock) {
            embeddingCache.put(textHash, embedding);
        }
    }

    // ─── Internal helpers ─────────────────────────────────────────────────────

    private void evictIfNeeded() {
        if (totalChunks.get() <= MAX_TOTAL_CHUNKS) return;

        int toEvict = totalChunks.get() - MAX_TOTAL_CHUNKS + EVICTION_BATCH;
        log.warn("[AURA VECTOR-DB] Memory cap reached ({} chunks). Evicting {} oldest chunks.", totalChunks.get(), toEvict);

        List<String> idsToDelete = new ArrayList<>();
        int evicted = 0;
        while (evicted < toEvict && !insertionOrder.isEmpty()) {
            String oldestId = insertionOrder.removeFirst();
            String colId    = chunkToCollection.remove(oldestId);
            if (colId != null) {
                LinkedList<Map<String, Object>> col = store.get(colId);
                if (col != null) {
                    col.removeIf(item -> oldestId.equals(item.get("id")));
                }
                idsToDelete.add(oldestId);
                totalChunks.decrementAndGet();
                evicted++;
            }
        }
        
        if (!idsToDelete.isEmpty()) {
            vectorChunkRepository.deleteAllById(idsToDelete);
        }
        
        log.info("[AURA VECTOR-DB] Evicted {} chunks from DB and cache. Total now: {}", evicted, totalChunks.get());
    }

    private double cosineSimilarity(float[] a, float[] b) {
        if (a == null || b == null || a.length != b.length) return 0;
        double dot = 0, nA = 0, nB = 0;
        for (int i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            nA  += a[i] * a[i];
            nB  += b[i] * b[i];
        }
        if (nA == 0 || nB == 0) return 0;
        return dot / (Math.sqrt(nA) * Math.sqrt(nB));
    }

    private byte[] serializeEmbedding(float[] floats) {
        if (floats == null) return null;
        ByteBuffer buffer = ByteBuffer.allocate(floats.length * 4);
        for (float f : floats) {
            buffer.putFloat(f);
        }
        return buffer.array();
    }

    private float[] deserializeEmbedding(byte[] bytes) {
        if (bytes == null || bytes.length == 0) return null;
        ByteBuffer buffer = ByteBuffer.wrap(bytes);
        float[] floats = new float[bytes.length / 4];
        for (int i = 0; i < floats.length; i++) {
            floats[i] = buffer.getFloat();
        }
        return floats;
    }

    private static class ScoredItem {
        final Map<String, Object> item;
        final double score;
        ScoredItem(Map<String, Object> item, double score) {
            this.item = item;
            this.score = score;
        }
    }
}
