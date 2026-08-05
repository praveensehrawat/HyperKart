package com.example.demo.order;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;

/**
 * Order Entity Document
 * =====================
 * Mapped collection storing transaction order items, status values, delivery details,
 * and time stamps.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "orders")
public class Order {

    @Id
    private String id;

    @Indexed
    private String buyerId;

    @Indexed
    private String sellerId;

    private List<OrderItem> items;
    private double totalAmount;
    private String status; // e.g. PENDING, CONFIRMED, DELIVERED, CANCELLED
    private String deliveryAddress;
    private String paymentMethod; // e.g. CARD, UPI, COD
    private String paymentStatus; // e.g. PENDING, PAID
    private String paymentDetails; // e.g. card digits, txn info
    private String driverId;
    private Double driverLat;
    private Double driverLng;
    private String deliveryOtp;
    @Builder.Default
    private String priority = "NORMAL"; // NORMAL vs EMERGENCY_SOS
    @Builder.Default
    private int targetDeliveryMinutes = 30; // 10 mins for SOS emergency
    @Builder.Default
    private double deliveryFee = 25.00;
    private Double distanceKm;
    @Builder.Default
    private int estimatedDeliveryMinutes = 20;
    @Builder.Default
    private List<ChatMessage> chatMessages = new java.util.ArrayList<>();
    private Instant createdAt;
    private Instant updatedAt;

    /**
     * Snapshotted item detail parameters inside the order scope.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OrderItem {
        private String productId;
        private String productName;
        private int quantity;
        private double unitPrice;
    }
}
