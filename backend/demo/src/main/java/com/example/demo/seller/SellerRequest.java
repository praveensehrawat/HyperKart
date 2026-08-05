package com.example.demo.seller;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * Seller Creation/Modification Request DTO
 * ========================================
 * Validates signup inputs creating merchant shops.
 */
@Data
public class SellerRequest {
    @NotBlank
    private String shopName;
    
    private String description;
    
    @NotBlank
    private String address;
    
    private String phone;
    
    @NotNull
    private Double latitude;
    
    @NotNull
    private Double longitude;
}
