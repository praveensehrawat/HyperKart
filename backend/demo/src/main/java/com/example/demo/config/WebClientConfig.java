package com.example.demo.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

/**
 * WebClient Configuration
 * =======================
 * Declares reactive WebClient builder beans to perform asynchronous HTTP queries
 * (e.g., communicating with the FastAPI AI microservice).
 */
@Configuration
public class WebClientConfig {

    /**
     * Declares the reactive WebClient.Builder bean.
     *
     * @return the default WebClient builder instance
     */
    @Bean
    public WebClient.Builder webClientBuilder() {
        return WebClient.builder();
    }

    /**
     * Constructs the standard non-blocking reactive HTTP client bean.
     *
     * @param builder the autowired WebClient builder
     * @return the configured WebClient instance
     */
    @Bean
    public WebClient webClient(WebClient.Builder builder) {
        return builder.build();
    }
}
