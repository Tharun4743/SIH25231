package com.aura.model;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessage {
    private String id;
    private String role; // "user" or "assistant"
    private String text;
    private String timestamp;
}
