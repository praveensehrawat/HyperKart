package com.example.demo.pantry;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * Household Pantry Auto-Replenishment Item Document
 * =================================================
 * Tracks household consumption velocity of daily staples (Milk, Bread, Eggs, Butter)
 * and calculates predicted depletion dates for 1-Tap Zero-Touch auto-reordering.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "pantry_items")
public class PantryItem {

    @Id
    private String id;
    private String userId;
    private String productId;
    private String productName;
    private String category;
    private double unitPrice;
    private String sellerId;
    private String shopName;
    private String imageUrl;

    @Builder.Default
    private int consumptionCycleDays = 2; // e.g. Reorder every 2 days for Milk
    private Instant lastPurchasedAt;
    private Instant predictedDepletionAt;
    
    @Builder.Default
    private int depletionPercentage = 85; // 0 to 100%
    @Builder.Default
    private boolean autoReplenishEnabled = true;
    private String status; // STOCKED, REORDER_SUGGESTED, DEPLETED
}
