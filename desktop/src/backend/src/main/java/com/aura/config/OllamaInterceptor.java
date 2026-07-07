package com.aura.config;

import org.springframework.http.HttpRequest;
import org.springframework.http.client.ClientHttpRequestExecution;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.stereotype.Component;
import java.io.IOException;
import java.util.Set;

@Component
public class OllamaInterceptor implements ClientHttpRequestInterceptor {

    private static final Set<String> ALLOWED_HOSTS = Set.of(
        "localhost", "127.0.0.1"
    );

    @Override
    public ClientHttpResponse intercept(
            HttpRequest request,
            byte[] body,
            ClientHttpRequestExecution execution) throws IOException {

        String host = request.getURI().getHost();
        if (host != null && !ALLOWED_HOSTS.contains(host)) {
            throw new IllegalStateException(
                "BLOCKED: External call to " + host + ". AURA is offline-only."
            );
        }
        return execution.execute(request, body);
    }
}
