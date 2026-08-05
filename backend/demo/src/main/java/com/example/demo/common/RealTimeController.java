package com.example.demo.common;

import java.util.Map;
import java.util.HashMap;
import java.util.UUID;

import com.example.demo.product.ProductRepository;
import com.example.demo.product.Product;

import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Real-time Event Broadcaster Controller
 * =====================================
 * Handles REST trigger updates, manually maps inbound STOMP client payloads,
 * and handles mock notification dispatches.
 */
@RestController
@RequestMapping("/api/realtime")
public class RealTimeController {

    private final SimpMessagingTemplate messagingTemplate;
    private final ProductRepository productRepository;
    private final DemoPublisherService demoPublisherService;

    public RealTimeController(SimpMessagingTemplate messagingTemplate, ProductRepository productRepository, DemoPublisherService demoPublisherService) {
        this.messagingTemplate = messagingTemplate;
        this.productRepository = productRepository;
        this.demoPublisherService = demoPublisherService;
    }

    /**
     * REST endpoint forwarding general payloads to WebSocket updates topic.
     */
    @PostMapping("/broadcast")
    public ResponseEntity<Void> broadcast(@RequestBody Map<String, Object> payload) {
        messagingTemplate.convertAndSend("/topic/updates", (Object) payload);
        return ResponseEntity.ok().build();
    }

    /**
     * Maps STOMP message channel `/app/send` to broadcast topic `/topic/updates`.
     *
     * @param message inbound raw message payload map
     * @return broadcast payload response
     */
    @MessageMapping("/send")
    @SendTo("/topic/updates")
    public Map<String, Object> handleMessage(Map<String, Object> message) {
        return message;
    }

    /**
     * Simulates placing a new buyer order and broadcasts alerts to all seller dashboards.
     */
    @PostMapping("/trigger-order")
    public ResponseEntity<Void> triggerOrder(@RequestBody(required = false) Map<String, Object> body) {
        Map<String, Object> orderPayload = new HashMap<>();
        orderPayload.put("type", "order_notification");
        
        if (body != null && body.containsKey("order")) {
            orderPayload.put("order", body.get("order"));
        } else {
            // Retrieve default database catalog items to construct a realistic demo order DTO
            Product p = productRepository.findByActiveTrue().stream().findFirst().orElse(null);
            Map<String, Object> order = new HashMap<>();
            order.put("id", UUID.randomUUID().toString());
            order.put("buyerId", "demo-buyer");
            order.put("status", "PENDING");
            order.put("createdAt", System.currentTimeMillis());
            
            if (p != null) {
                Map<String, Object> item = new HashMap<>();
                item.put("productId", p.getId());
                item.put("productName", p.getName());
                item.put("quantity", 1);
                item.put("unitPrice", p.getPrice());
                order.put("items", java.util.List.of(item));
                order.put("totalAmount", p.getPrice());
            }
            orderPayload.put("order", order);
        }
        
        orderPayload.put("timestamp", System.currentTimeMillis());
        messagingTemplate.convertAndSend("/topic/updates", (Object) orderPayload);
        return ResponseEntity.ok().build();
    }
}
