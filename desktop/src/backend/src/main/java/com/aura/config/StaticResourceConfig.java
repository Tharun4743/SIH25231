package com.aura.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;
import java.io.IOException;

/**
 * W-03 FIX: Replaced all System.out.println statements with SLF4J logger calls.
 * The previous implementation logged on every static resource request (high frequency),
 * polluting production logs and signalling unfinished production hardening.
 */
@Configuration
public class StaticResourceConfig implements WebMvcConfigurer {

    private static final Logger log = LoggerFactory.getLogger(StaticResourceConfig.class);

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String userDir = System.getProperty("user.dir");
        java.io.File distDir;
        if (userDir.endsWith("backend")) {
            distDir = new java.io.File(new java.io.File(userDir).getParentFile(), "frontend/dist");
        } else {
            distDir = new java.io.File(userDir, "frontend/dist");
        }
        String resourceLocation = "file:///" + distDir.getAbsolutePath().replace("\\", "/") + "/";
        java.io.File uploadDir = new java.io.File(userDir, "uploads");
        if (!uploadDir.exists()) {
            uploadDir.mkdirs();
        }
        String uploadLocation = "file:///" + uploadDir.getAbsolutePath().replace("\\", "/") + "/";
        log.info("[AURA] Registering uploads directory path: {}", uploadLocation);

        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(uploadLocation);

        log.info("[AURA] Registering static resource directory path: {}", resourceLocation);

        registry.addResourceHandler("/**")
                .addResourceLocations(resourceLocation)
                .resourceChain(true)
                .addResolver(new PathResourceResolver() {
                    @Override
                    protected Resource getResource(String resourcePath, Resource location) throws IOException {
                        Resource requestedResource = location.createRelative(resourcePath);
                        // W-03 FIX: Demoted per-request logging to DEBUG to avoid log noise in production.
                        log.debug("[AURA] getResource - path: '{}', exists: {}, readable: {}",
                            resourcePath, requestedResource.exists(), requestedResource.isReadable());
                        // Return the resource if it exists and is not a directory
                        if (requestedResource.exists() && requestedResource.isReadable()) {
                            try {
                                if (requestedResource.getFile().isFile()) {
                                    return requestedResource;
                                }
                            } catch (Exception e) {
                                // Fallback if getFile() is not supported (e.g. JAR resource)
                                return requestedResource;
                            }
                        }
                        // Fallback to index.html for Single Page Application client-side routing
                        log.debug("[AURA] getResource - falling back to index.html for path: '{}'", resourcePath);
                        return location.createRelative("index.html");
                    }
                });
    }

    @Override
    public void addViewControllers(org.springframework.web.servlet.config.annotation.ViewControllerRegistry registry) {
        registry.addViewController("/").setViewName("forward:/index.html");
    }
}
