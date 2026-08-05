package com.example.demo.review;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Customer Ratings & Reviews REST Controller
 * ==========================================
 * Exposes API routes to post order reviews, fetch seller ratings summaries,
 * and list public customer comments.
 */
@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    @PostMapping
    public ResponseEntity<Review> createReview(
            @AuthenticationPrincipal UserDetails user,
            @Valid @RequestBody ReviewRequest request) {
        return ResponseEntity.ok(reviewService.createReview(user.getUsername(), request));
    }

    @GetMapping("/seller/{sellerId}")
    public ResponseEntity<List<Review>> getSellerReviews(@PathVariable String sellerId) {
        return ResponseEntity.ok(reviewService.findBySellerId(sellerId));
    }

    @GetMapping("/seller/{sellerId}/summary")
    public ResponseEntity<Map<String, Object>> getSellerSummary(@PathVariable String sellerId) {
        return ResponseEntity.ok(reviewService.getSellerRatingSummary(sellerId));
    }
}
