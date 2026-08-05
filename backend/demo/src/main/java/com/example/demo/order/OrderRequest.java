package com.example.demo.order;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

/**
 * Order Creation Request DTO
 * ==========================
 * Validation schema mapping checkout submissions payload.
 */
@Data
public class OrderRequest {
    @NotBlank
    private String sellerId;
    
    @NotEmpty
    private List<OrderItemRequest> items;
    
    @NotBlank
    private String deliveryAddress;

    @NotBlank
    private String paymentMethod;

    private String paymentDetails;

    private Double buyerLat;

    private Double buyerLng;

    private String priority; // NORMAL vs EMERGENCY_SOS

    /**
     * Sub-DTO mapping requested item parameters.
     */
    @Data
    public static class OrderItemRequest {
        @NotBlank
        private String productId;
        
        private int quantity;
    }
}
