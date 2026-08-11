package com.example.demo.common;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

/**
 * KeepAliveScheduler
 * ==================
 * Automatically pings the live Render backend every 5 minutes to prevent
 * free-tier cloud instances from spinning down or sleeping due to inactivity.
 */
@Component
public class KeepAliveScheduler {

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * Executes self-ping every 5 minutes (300,000 ms) with an initial delay of 30 seconds.
     */
    @Scheduled(fixedRate = 300000, initialDelay = 30000)
    public void pingCloudBackend() {
        try {
            restTemplate.getForObject("https://hyperkart-backend.onrender.com/api/health", String.class);
        } catch (Exception ignored) {
            // Background keep-alive heartbeat handles exceptions silently
        }
    }
}
