package com.example.demo.common;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Server Liveness Health Controller
 * ================================
 * Simple public check route utilized by deployment probes and orchestration platforms.
 */
@RestController
@RequestMapping("/api/health")
public class HealthController {

    /**
     * Returns application service details and database status signals.
     */
    @GetMapping
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of("status", "UP", "service", "HYPERKART-commerce"));
    }
}
