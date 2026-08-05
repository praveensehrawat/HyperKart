package com.example.demo.common;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.Map;

/**
 * Public Analytics and Metadata Controller
 * =======================================
 * Unprotected routes tracking simulation metrics and prometheus metrics formats.
 */
@RestController
@RequestMapping("/api/public")
public class PublicController {

    private final AdminSettingsService adminSettingsService;
    private final DemoPublisherService demoPublisherService;
    private final SimpMessagingTemplate messagingTemplate;

    @org.springframework.beans.factory.annotation.Value("${app.admin.email:admin@HYPERKART.com}")
    private String adminEmail;

    public PublicController(AdminSettingsService adminSettingsService, DemoPublisherService demoPublisherService, SimpMessagingTemplate messagingTemplate) {
        this.adminSettingsService = adminSettingsService;
        this.demoPublisherService = demoPublisherService;
        this.messagingTemplate = messagingTemplate;
    }

    /**
     * Gets designated system admin configuration email.
     */
    @GetMapping("/test-admin-email")
    public Map<String, Object> getTestAdminEmail() {
        return Map.of("testAdminEmail", adminEmail);
    }

    /**
     * Aggregates background event count details and broadcast rates.
     */
    @GetMapping("/metrics")
    public Map<String, Object> getMetrics() {
        return Map.of(
                "publishedCount", demoPublisherService.getPublishedCount(),
                "lastPublishedAt", demoPublisherService.getLastPublishedAt(),
                "running", demoPublisherService.isRunning(),
                "rate", demoPublisherService.getRate()
        );
    }

    /**
     * Formats internal metrics to Prometheus exposition metrics format specifications.
     */
    @GetMapping("/metrics/prometheus")
    public String getPrometheusMetrics() {
        StringBuilder sb = new StringBuilder();
        sb.append("# HELP demo_published_count Number of demo published events\n");
        sb.append("# TYPE demo_published_count counter\n");
        sb.append("demo_published_count ").append(demoPublisherService.getPublishedCount()).append("\n");
        sb.append("# HELP demo_last_published_timestamp Last published timestamp in milliseconds\n");
        sb.append("# TYPE demo_last_published_timestamp gauge\n");
        sb.append("demo_last_published_timestamp ").append(demoPublisherService.getLastPublishedAt()).append("\n");
        return sb.toString();
    }

    /**
     * Receives public payloads and forwards them over websocket updates channels.
     */
    @PostMapping("/broadcast")
    public org.springframework.http.ResponseEntity<Void> publicBroadcast(@RequestBody Map<String, Object> payload) {
        messagingTemplate.convertAndSend("/topic/updates", (Object) payload);
        return org.springframework.http.ResponseEntity.ok().build();
    }
}
