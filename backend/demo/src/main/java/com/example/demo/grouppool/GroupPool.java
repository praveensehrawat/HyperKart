package com.example.demo.grouppool;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Neighborhood Group-Buying Community Pool Entity
 * ===============================================
 * Stores active community pools where nearby neighbors join together to unlock
 * 10% group discounts and free single-trip deliveries.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "group_pools")
public class GroupPool {

    @Id
    private String id;
    private String neighborhoodName; // e.g. "Royal Palms Society, Zirakpur"
    private String creatorName;
    private String creatorId;
    private String sellerId;
    private String shopName;
    
    @Builder.Default
    private int participantsCount = 1;
    @Builder.Default
    private int targetParticipants = 2;
    @Builder.Default
    private double discountPercent = 10.0;
    @Builder.Default
    private boolean freeDeliveryUnlocked = false;
    
    @Builder.Default
    private List<String> participantNames = new ArrayList<>();
    
    private String status; // ACTIVE, UNLOCKED, EXPIRED
    private Instant createdAt;
    private Instant expiresAt;
}
