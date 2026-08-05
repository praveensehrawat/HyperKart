package com.example.demo.wallet;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * Driver Wallet Payout Request Document
 * =====================================
 * Mapped collection storing delivery agent withdrawal requests, amounts, and admin approval status.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "payouts")
public class PayoutRequest {

    @Id
    private String id;

    @Indexed
    private String driverId;
    private String driverName;
    private double amount;
    private String status; // PENDING, APPROVED, REJECTED
    private String bankDetails;
    private Instant createdAt;
}
