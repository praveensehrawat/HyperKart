package com.example.demo.ai.dto;

import com.example.demo.product.Product;
import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

/**
 * Recommendation Request DTO
 * ==========================
 * Data payload format sent to FastAPI recommendation endpoint.
 */
@Data
@Builder
public class RecommendationRequest {
    // List of active inventory products to score
    private List<Product> products;
    // User search keywords
    private String query;
    // Map list of nearby seller profiles and computed distance offsets
    private List<Map<String, Object>> nearby_sellers;
    // List of historical categories purchased by current user
    private List<String> preferred_categories;
}
