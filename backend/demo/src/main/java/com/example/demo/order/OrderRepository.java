package com.example.demo.order;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

/**
 * Order Repository Interface
 * ==========================
 * Data access layer using spring data MongoDB repository.
 */
public interface OrderRepository extends MongoRepository<Order, String> {
    Page<Order> findByBuyerId(String buyerId, Pageable pageable);
    Page<Order> findBySellerId(String sellerId, Pageable pageable);
    List<Order> findByStatusAndDriverIdNull(String status);
    List<Order> findByDriverIdAndStatus(String driverId, String status);
}
