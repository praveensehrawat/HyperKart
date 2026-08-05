package com.example.demo.product;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.List;

/**
 * Product Repository Interface
 * ============================
 * Handles database operations for active products and listings.
 */
public interface ProductRepository extends MongoRepository<Product, String> {
    Page<Product> findByActiveTrue(Pageable pageable);
    List<Product> findByActiveTrue();
    List<Product> findBySellerIdAndActiveTrue(String sellerId);
    List<Product> findByCategoryAndActiveTrue(String category);
    
    @Query("{ 'active': true, '$or': [ { 'name': { '$regex': ?0, '$options': 'i' } }, { 'description': { '$regex': ?0, '$options': 'i' } }, { 'category': { '$regex': ?0, '$options': 'i' } } ] }")
    List<Product> searchActiveProducts(String keyword);

    void deleteBySellerId(String sellerId);
}
