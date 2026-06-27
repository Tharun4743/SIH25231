package com.aura.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.io.File;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class AudioService {

    private final ObjectMapper objectMapper = new ObjectMapper();

    public Map<String, Object> transcribe(MultipartFile audio) {
        Map<String, Object> response = new HashMap<>();
        File tempFile = null;
        try {
            // 1. Save multipart to temporary wav/mp3 file
            tempFile = File.createTempFile("aura-audio-", ".wav");
            Files.copy(audio.getInputStream(), tempFile.toPath(), StandardCopyOption.REPLACE_EXISTING);

            // 2. Call Python Whisper Sidecar via ProcessBuilder
            String userDir = System.getProperty("user.dir");
            java.io.File sidecarDir;
            if (userDir.endsWith("backend")) {
                sidecarDir = new java.io.File(userDir, "sidecars");
            } else {
                sidecarDir = new java.io.File(new java.io.File(userDir, "backend"), "sidecars");
            }

            ProcessBuilder pb = new ProcessBuilder(PythonResolver.resolvePythonCommand(), "whisper_sidecar.py", tempFile.getAbsolutePath());
            pb.directory(sidecarDir);
            Process process = pb.start();

            int exitCode = process.waitFor();
            if (exitCode == 0) {
                // Parse stdout JSON output from sidecar
                Map<String, Object> sidecarResult = objectMapper.readValue(process.getInputStream(), new TypeReference<Map<String, Object>>() {});
                return sidecarResult;
            } else {
                System.err.println("Whisper sidecar exited with error code: " + exitCode);
            }
        } catch (Exception e) {
            System.err.println("Failed calling faster-whisper sidecar: " + e.getMessage());
        } finally {
            if (tempFile != null && tempFile.exists()) {
                tempFile.delete();
            }
        }

        // Offline fallback if local python environment is not fully configured
        response.put("transcript", "");
        response.put("simulated", true);
        response.put("error", "faster-whisper not installed. Run: pip install faster-whisper");
        List<Map<String, Object>> segments = new ArrayList<>();
        response.put("segments", segments);
        return response;
    }
}
