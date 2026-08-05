package com.example.demo.wallet;

import com.example.demo.order.Order;
import com.example.demo.order.OrderRepository;
import com.example.demo.user.User;
import com.example.demo.user.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Driver Digital Wallet & Payout Operations Service
 * =================================================
 * Computes delivery agent trip earnings ($5.00/trip), processes withdrawal requests,
 * and handles admin payout approvals.
 */
@Service
@RequiredArgsConstructor
public class WalletService {

    private final PayoutRepository payoutRepository;
    private final OrderRepository orderRepository;
    private final UserService userService;

    public Map<String, Object> getDriverWalletSummary(String userEmail) {
        User driver = userService.findByEmail(userEmail);
        List<Order> deliveredOrders = orderRepository.findByDriverIdAndStatus(driver.getId(), "DELIVERED");

        double totalEarnings = deliveredOrders.stream()
                .mapToDouble(Order::getDeliveryFee)
                .sum();

        List<PayoutRequest> payoutRequests = payoutRepository.findByDriverId(driver.getId());
        double withdrawn = payoutRequests.stream()
                .filter(p -> "APPROVED".equals(p.getStatus()))
                .mapToDouble(PayoutRequest::getAmount)
                .sum();

        double availableBalance = Math.max(0.0, Math.round((totalEarnings - withdrawn) * 100.0) / 100.0);

        return Map.of(
                "totalEarnings", Math.round(totalEarnings * 100.0) / 100.0,
                "withdrawn", Math.round(withdrawn * 100.0) / 100.0,
                "availableBalance", availableBalance,
                "completedTrips", deliveredOrders.size(),
                "history", deliveredOrders,
                "payouts", payoutRequests
        );
    }

    public PayoutRequest requestPayout(String userEmail, double amount, String bankDetails) {
        User driver = userService.findByEmail(userEmail);

        Map<String, Object> wallet = getDriverWalletSummary(userEmail);
        double availableBalance = (Double) wallet.get("availableBalance");

        if (amount <= 0 || amount > availableBalance) {
            throw new IllegalArgumentException("Invalid payout request amount. Max available: $" + availableBalance);
        }

        PayoutRequest request = PayoutRequest.builder()
                .driverId(driver.getId())
                .driverName(driver.getName())
                .amount(Math.round(amount * 100.0) / 100.0)
                .bankDetails(bankDetails != null ? bankDetails : "UPI / Direct Deposit")
                .status("PENDING")
                .createdAt(Instant.now())
                .build();

        return payoutRepository.save(request);
    }

    public List<PayoutRequest> findAllPendingPayouts() {
        return payoutRepository.findByStatus("PENDING");
    }

    public PayoutRequest approvePayout(String payoutId) {
        PayoutRequest req = payoutRepository.findById(payoutId)
                .orElseThrow(() -> new IllegalArgumentException("Payout request not found"));
        req.setStatus("APPROVED");
        return payoutRepository.save(req);
    }
}
