package com.example.demo.wallet;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Driver Digital Wallet & Payout REST Controller
 * ===============================================
 * REST endpoints to view wallet balances, request withdrawals, and approve payout requests.
 */
@RestController
@RequestMapping("/api/wallet")
@RequiredArgsConstructor
public class WalletController {

    private final WalletService walletService;

    @GetMapping("/driver")
    public ResponseEntity<Map<String, Object>> getDriverWallet(@AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(walletService.getDriverWalletSummary(user.getUsername()));
    }

    @PostMapping("/driver/payout")
    public ResponseEntity<PayoutRequest> requestPayout(
            @AuthenticationPrincipal UserDetails user,
            @RequestParam double amount,
            @RequestParam(required = false) String bankDetails) {
        return ResponseEntity.ok(walletService.requestPayout(user.getUsername(), amount, bankDetails));
    }

    @GetMapping("/admin/payouts")
    public ResponseEntity<List<PayoutRequest>> getPendingPayouts() {
        return ResponseEntity.ok(walletService.findAllPendingPayouts());
    }

    @PatchMapping("/admin/payouts/{id}/approve")
    public ResponseEntity<PayoutRequest> approvePayout(@PathVariable String id) {
        return ResponseEntity.ok(walletService.approvePayout(id));
    }
}
