package com.example.demo.order;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

/**
 * Order REST API Controller
 * ==========================
 * Manages HTTP endpoints to create transaction entries, query buyers/sellers orders history,
 * and patch execution statuses.
 */
@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    /**
     * Submits a new customer checkout order request.
     */
    @PostMapping
    public ResponseEntity<Order> create(
            @AuthenticationPrincipal UserDetails user,
            @Valid @RequestBody OrderRequest request) {
        return ResponseEntity.ok(orderService.create(user.getUsername(), request));
    }

    /**
     * Fetches current authenticated buyer's order history.
     */
    @GetMapping("/my")
    public ResponseEntity<Page<Order>> myOrders(
            @AuthenticationPrincipal UserDetails user,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(orderService.findByBuyer(user.getUsername(),
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))));
    }

    /**
     * Fetches current authenticated merchant's incoming orders.
     */
    @GetMapping("/seller")
    public ResponseEntity<Page<Order>> sellerOrders(
            @AuthenticationPrincipal UserDetails user,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(orderService.findBySeller(user.getUsername(),
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))));
    }

    /**
     * Looks up order metadata fields by unique ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<Order> getById(@PathVariable String id) {
        return ResponseEntity.ok(orderService.findById(id));
    }

    /**
     * Patches the status code details of an order.
     */
    @PatchMapping("/{id}/status")
    public ResponseEntity<Order> updateStatus(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable String id,
            @RequestParam String status) {
        return ResponseEntity.ok(orderService.updateStatus(user.getUsername(), id, status));
    }

    /**
     * Patches the payment status details of an order.
     */
    @PatchMapping("/{id}/payment-status")
    public ResponseEntity<Order> updatePaymentStatus(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable String id,
            @RequestParam String paymentStatus) {
        return ResponseEntity.ok(orderService.updatePaymentStatus(user.getUsername(), id, paymentStatus));
    }

    /**
     * Lists orders pending delivery.
     */
    @GetMapping("/pending-delivery")
    public ResponseEntity<List<Order>> pendingDelivery() {
        return ResponseEntity.ok(orderService.findPendingDelivery());
    }

    /**
     * Claims an order for delivery.
     */
    @PatchMapping("/{id}/claim")
    public ResponseEntity<Order> claimOrder(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable String id) {
        return ResponseEntity.ok(orderService.claimOrder(user.getUsername(), id));
    }

    /**
     * Updates delivery vehicle coordinates.
     */
    @PatchMapping("/{id}/driver-location")
    public ResponseEntity<Order> updateDriverLocation(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable String id,
            @RequestParam double lat,
            @RequestParam double lng) {
        return ResponseEntity.ok(orderService.updateDriverLocation(user.getUsername(), id, lat, lng));
    }

    /**
     * Finalizes order delivery.
     */
    @PatchMapping("/{id}/deliver")
    public ResponseEntity<Order> completeDelivery(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable String id) {
        return ResponseEntity.ok(orderService.completeDelivery(user.getUsername(), id));
    }

    /**
     * Verifies 4-digit handover OTP code before completing delivery.
     */
    @PostMapping("/{id}/verify-otp")
    public ResponseEntity<Order> verifyDeliveryOtp(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable String id,
            @RequestParam String otp) {
        return ResponseEntity.ok(orderService.verifyDeliveryOtp(user.getUsername(), id, otp));
    }

    /**
     * Retrieves active deliveries claimed by the driver.
     */
    @GetMapping("/driver/active")
    public ResponseEntity<List<Order>> driverActiveOrders(@AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(orderService.findByDriverActive(user.getUsername()));
    }

    /**
     * Posts a chat message from a buyer or driver to an active order.
     */
    @PostMapping("/{id}/chat")
    public ResponseEntity<Order> addChatMessage(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable String id,
            @RequestParam String message) {
        return ResponseEntity.ok(orderService.addChatMessage(user.getUsername(), id, message));
    }

    /**
     * Lists all system orders for Admin console.
     */
    @GetMapping("/admin/all")
    public ResponseEntity<List<Order>> getAllOrdersForAdmin() {
        return ResponseEntity.ok(orderService.findAll());
    }

    /**
     * 10-Minute Rapid Dispatch SOS Emergency Order Endpoint
     */
    @PostMapping("/sos")
    public ResponseEntity<Order> createSosOrder(
            @AuthenticationPrincipal UserDetails user,
            @RequestBody Map<String, String> payload) {
        String email = (user != null) ? user.getUsername() : "sos-buyer@HYPERKART.com";
        String category = payload.get("category");
        String address = payload.get("address");
        return ResponseEntity.ok(orderService.createSosOrder(email, category, address));
    }
}
