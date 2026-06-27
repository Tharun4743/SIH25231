package com.aura.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UploadResponse {
    private String id;
    private String name;
    private Integer pageCount;
    private Integer chunksCreated;
    private String status;
}
