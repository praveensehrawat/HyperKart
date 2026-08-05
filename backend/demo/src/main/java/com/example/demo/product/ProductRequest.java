package com.example.demo.product;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * Product Creation/Modification Request DTO
 * =========================================
 * Form validation parameters mapping product catalog insertions.
 */
@Data
public class ProductRequest {
    @NotBlank
    private String name;
    
    private String description;
    
    @NotBlank
    private String category;
    
    @NotNull
    @Min(0)
    private Double price;
    
    @NotNull
    @Min(0)
    private Integer stock;
    
    private String imageUrl;
}
