package com.aura.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatRequest {
    private String message;
    private String sessionId;
    private Boolean filesBrain;
    private String filterDocId;
}
