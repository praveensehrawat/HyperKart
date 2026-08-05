package com.example.demo.review;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ReviewRequest {

    @NotBlank
    private String orderId;

    @Min(1)
    @Max(5)
    private int rating;

    private String comment;
    private String imageUrl;
}
