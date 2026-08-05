package com.example.demo.review;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * Customer Shop Review & Rating Entity
 * =====================================
 * Document mapped collection storing 1-5 star ratings, buyer feedback, and merchant responses.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "reviews")
public class Review {

    @Id
    private String id;

    @Indexed
    private String orderId;

    @Indexed
    private String sellerId;

    private String buyerId;
    private String buyerName;
    private int rating; // 1 to 5
    private String comment;
    private String imageUrl;
    private Instant createdAt;
}
