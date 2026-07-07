package com.aura;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import java.io.File;

@SpringBootApplication
public class AuraApplication {
    public static void main(String[] args) {
        // Enforce the same SQLite database directory between root and subdirectory launches
        String userDir = System.getProperty("user.dir");
        File dataDir;
        if (userDir.endsWith("backend")) {
            dataDir = new File(new File(userDir).getParentFile(), "data");
        } else {
            dataDir = new File(userDir, "data");
        }
        if (!dataDir.exists()) {
            dataDir.mkdirs();
        }
        // Set the SQLite database path system property to override application.yml dynamically
        String dbPath = new File(dataDir, "aura.db").getAbsolutePath();
        System.setProperty("spring.datasource.url", "jdbc:sqlite:" + dbPath);

        SpringApplication.run(AuraApplication.class, args);
    }
}
