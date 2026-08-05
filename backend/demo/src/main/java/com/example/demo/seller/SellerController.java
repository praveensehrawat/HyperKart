package com.example.demo.seller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Seller Merchant REST Controller
 * ===============================
 * Exposes API routes to establish shop details, retrieve registration indexes,
 * and filter merchants by distance proximity.
 */
@RestController
@RequestMapping("/api/sellers")
@RequiredArgsConstructor
public class SellerController {

    private final SellerService sellerService;

    /**
     * Creates a new seller profile.
     */
    @PostMapping
    public ResponseEntity<Seller> create(
            @AuthenticationPrincipal UserDetails user,
            @Valid @RequestBody SellerRequest request) {
        return ResponseEntity.ok(sellerService.create(user.getUsername(), request));
    }

    /**
     * Lists all registered active merchants.
     */
    @GetMapping
    public ResponseEntity<List<Seller>> findAll() {
        return ResponseEntity.ok(sellerService.findAll());
    }

    /**
     * Looks up merchant details by unique ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<Seller> getById(@PathVariable String id) {
        return ResponseEntity.ok(sellerService.findById(id));
    }

    /**
     * Modifies current authenticated user's shop profile.
     */
    @PutMapping
    public ResponseEntity<Seller> update(
            @AuthenticationPrincipal UserDetails user,
            @Valid @RequestBody SellerRequest request) {
        return ResponseEntity.ok(sellerService.update(user.getUsername(), request));
    }

    /**
     * Filters active merchants by physical distance proximity using geospatial coordinates.
     *
     * @param lat      center coordinate latitude
     * @param lng      center coordinate longitude
     * @param radiusKm maximum distance offset boundary filter
     * @return sorted list container of nearby sellers and distance parameters
     */
    @GetMapping("/nearby")
    public ResponseEntity<List<Map<String, Object>>> getNearby(
            @RequestParam double lat,
            @RequestParam double lng,
            @RequestParam(defaultValue = "10.0") double radiusKm) {
        return ResponseEntity.ok(sellerService.findNearby(lat, lng, radiusKm));
    }

    /**
     * Retrieves all pending seller profiles for administrator review.
     */
    @GetMapping("/pending")
    public ResponseEntity<List<Seller>> getPending() {
        return ResponseEntity.ok(sellerService.findAllPending());
    }

    /**
     * Approves a seller profile.
     */
    @PatchMapping("/{id}/approve")
    public ResponseEntity<Seller> approve(@PathVariable String id) {
        return ResponseEntity.ok(sellerService.approveSeller(id));
    }

    /**
     * Broadcasts a real-time flash deal alert to all connected buyers.
     */
    @PostMapping("/flash-deal")
    public ResponseEntity<Map<String, Object>> createFlashDeal(
            @AuthenticationPrincipal UserDetails user,
            @Valid @RequestBody FlashDealRequest request) {
        return ResponseEntity.ok(sellerService.broadcastFlashDeal(user.getUsername(), request));
    }
}
