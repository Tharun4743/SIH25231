package com.aura.service;

import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Phase 1 Fix: Thread-safe in-memory job status tracker for async document indexing.
 *
 * Stores job state in a ConcurrentHashMap — safe for concurrent reads and writes
 * from multiple upload threads and the polling endpoint.
 *
 * Jobs have a TTL managed by cleanup: old DONE/FAILED jobs older than 1 hour are
 * purged on each status query to prevent unbounded memory accumulation.
 */
@Service
public class IndexingJobService {

    public enum JobStatus {
        PENDING, PROCESSING, DONE, FAILED
    }

    public static class IndexingJob {
        public final String jobId;
        public volatile JobStatus status;
        public volatile String message;
        public volatile int chunksCreated;
        public volatile int pageCount;
        public volatile String docName;
        public final long createdAt;

        IndexingJob(String jobId, String docName) {
            this.jobId = jobId;
            this.docName = docName;
            this.status = JobStatus.PENDING;
            this.message = "Queued for processing";
            this.createdAt = System.currentTimeMillis();
        }
    }

    private static final long JOB_TTL_MS = 60 * 60 * 1000L; // 1 hour

    private final ConcurrentHashMap<String, IndexingJob> jobs = new ConcurrentHashMap<>();

    /**
     * Create a new job and return its ID. Called immediately when a file is received.
     */
    public IndexingJob createJob(String docName) {
        String jobId = UUID.randomUUID().toString();
        IndexingJob job = new IndexingJob(jobId, docName);
        jobs.put(jobId, job);
        pruneStaleJobs();
        return job;
    }

    public IndexingJob getJob(String jobId) {
        return jobs.get(jobId);
    }

    public void markProcessing(IndexingJob job, String message) {
        job.status = JobStatus.PROCESSING;
        job.message = message;
    }

    public void markDone(IndexingJob job, int pageCount, int chunksCreated) {
        job.status = JobStatus.DONE;
        job.pageCount = pageCount;
        job.chunksCreated = chunksCreated;
        job.message = "Indexed successfully — " + chunksCreated + " chunks from " + pageCount + " pages.";
    }

    public void markFailed(IndexingJob job, String reason) {
        job.status = JobStatus.FAILED;
        job.message = "Indexing failed: " + reason;
    }

    /** Remove jobs older than TTL that are in a terminal state to prevent memory leak. */
    private void pruneStaleJobs() {
        long cutoff = System.currentTimeMillis() - JOB_TTL_MS;
        jobs.entrySet().removeIf(e -> {
            IndexingJob j = e.getValue();
            return j.createdAt < cutoff &&
                   (j.status == JobStatus.DONE || j.status == JobStatus.FAILED);
        });
    }

    /** Expose job map snapshot for monitoring. */
    public Map<String, IndexingJob> getAllJobs() {
        return Map.copyOf(jobs);
    }
}
