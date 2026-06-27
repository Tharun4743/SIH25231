package com.aura.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;
import java.io.IOException;

@Configuration
public class StaticResourceConfig implements WebMvcConfigurer {

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
        System.out.println("[AURA] Registering uploads directory path: " + uploadLocation);

        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(uploadLocation);

        System.out.println("[AURA] Registering static resource directory path: " + resourceLocation);

        registry.addResourceHandler("/**")
                .addResourceLocations(resourceLocation)
                .resourceChain(true)
                .addResolver(new PathResourceResolver() {
                    @Override
                    protected Resource getResource(String resourcePath, Resource location) throws IOException {
                        Resource requestedResource = location.createRelative(resourcePath);
                        System.out.println("[AURA] getResource - path: '" + resourcePath + "', exists: " + requestedResource.exists() + ", readable: " + requestedResource.isReadable());
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
                        System.out.println("[AURA] getResource - falling back to index.html for path: '" + resourcePath + "'");
                        return location.createRelative("index.html");
                    }
                });
    }

    @Override
    public void addViewControllers(org.springframework.web.servlet.config.annotation.ViewControllerRegistry registry) {
        registry.addViewController("/").setViewName("forward:/index.html");
    }
}
