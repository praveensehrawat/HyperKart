package com.example.demo.review;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

/**
 * Review Repository Interface
 * ===========================
 * Data access operations for shop ratings and customer feedback documents.
 */
public interface ReviewRepository extends MongoRepository<Review, String> {
    List<Review> findBySellerId(String sellerId);
    Optional<Review> findByOrderId(String orderId);
}
