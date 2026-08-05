package com.example.demo.ai.dto;

import com.example.demo.product.Product;
import lombok.Data;

import java.util.List;

/**
 * Recommendation Response DTO
 * ===========================
 * Parsing target schema returned by FastAPI recommendation engine.
 */
@Data
public class RecommendationResponse {
    // Sorted list of recommended products
    private List<Product> recommendations;
    // Generated natural language insight text
    private String aiInsight;
    // Scoring strategy source classification (e.g. hybrid, rule-based)
    private String source;
}
