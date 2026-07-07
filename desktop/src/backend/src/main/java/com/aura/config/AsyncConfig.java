package com.aura.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;
import java.util.concurrent.ThreadPoolExecutor;

/**
 * Phase 1 Fix: Enables Spring @Async and provides a bounded executor for
 * document-indexing jobs. This keeps document uploads non-blocking — HTTP
 * threads return immediately while the heavy Ollama embedding work runs in
 * a dedicated pool.
 *
 * Pool sizing:
 *   - corePoolSize = 2  : Enough for sequential background indexing on a local desktop
 *   - maxPoolSize  = 4  : Allow burst of concurrent uploads without memory explosion
 *   - queueCapacity = 50 : Back-pressure cap — reject gracefully if overwhelmed
 *   - CallerRunsPolicy  : If the queue is full, the caller thread handles the task
 *                         (graceful degradation — never silently drops work)
 */
@Configuration
@EnableAsync
public class AsyncConfig {

    @Bean(name = "documentIndexingExecutor")
    public Executor documentIndexingExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(4);
        executor.setQueueCapacity(50);
        executor.setThreadNamePrefix("aura-indexer-");
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(30);
        executor.initialize();
        return executor;
    }
}
