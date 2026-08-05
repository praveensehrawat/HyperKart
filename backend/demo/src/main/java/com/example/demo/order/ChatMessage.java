package com.example.demo.order;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.Instant;

/**
 * Chat Message Sub-Entity
 * =======================
 * Data model for single chat messages exchanged between buyers and delivery drivers.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessage {
    private String senderId;
    private String senderName;
    private String senderRole; // e.g. BUYER, DRIVER, ADMIN
    private String message;
    private Instant timestamp;
}
