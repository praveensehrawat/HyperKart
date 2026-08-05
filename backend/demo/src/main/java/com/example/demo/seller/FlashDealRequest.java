package com.example.demo.seller;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class FlashDealRequest {
    @NotBlank
    private String dealTitle;
    private int discountPercent;
    private String category;
}
