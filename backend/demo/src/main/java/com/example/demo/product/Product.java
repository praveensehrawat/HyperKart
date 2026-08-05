package com.example.demo.product;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * Product Inventory Entity Document
 * ================================
 * Stores product details, price records, categories, and inventory stock quantities.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "products")
public class Product {

    @Id
    private String id;

    @Indexed
    private String sellerId;

    private String name;
    private String description;
    
    @Indexed
    private String category;
    
    private double price;
    private int stock;
    private String imageUrl;
    
    @Indexed
    private boolean active;
}
