package com.example.demo.seller;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

/**
 * Seller Repository Interface
 * ==========================
 * Data access operations for merchant seller profiles.
 */
public interface SellerRepository extends MongoRepository<Seller, String> {
    Optional<Seller> findByUserId(String userId);
    List<Seller> findByActiveTrue();
    List<Seller> findByStatus(String status);
}
