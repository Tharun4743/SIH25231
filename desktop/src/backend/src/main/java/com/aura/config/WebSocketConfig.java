package com.aura.config;

import com.aura.websocket.ChatWebSocketHandler;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

/**
 * CF-04 FIX: WebSocket allowed origins restricted to localhost only.
 *
 * Previous config used setAllowedOrigins("*"), allowing any browser tab
 * (including rogue cross-origin pages) to open a WebSocket to /ws/chat
 * and drive arbitrary RAG queries or leak document context.
 *
 * Restricted to localhost:8080 and 127.0.0.1:8080 — the only valid origins
 * for an Electron-hosted local application.
 */
@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final ChatWebSocketHandler chatWebSocketHandler;

    public WebSocketConfig(ChatWebSocketHandler chatWebSocketHandler) {
        this.chatWebSocketHandler = chatWebSocketHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(chatWebSocketHandler, "/ws/chat")
                // CF-04 FIX: Only accept connections from the local backend origin
                .setAllowedOrigins(
                    "http://localhost:8080",
                    "http://127.0.0.1:8080"
                );
    }
}
