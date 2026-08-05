package com.example.demo.wallet;

import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

/**
 * Payout Repository Interface
 * ===========================
 * Data access operations for delivery agent wallet withdrawal requests.
 */
public interface PayoutRepository extends MongoRepository<PayoutRequest, String> {
    List<PayoutRequest> findByDriverId(String driverId);
    List<PayoutRequest> findByStatus(String status);
}
