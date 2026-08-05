package com.example.demo.review;

import com.example.demo.order.Order;
import com.example.demo.order.OrderService;
import com.example.demo.user.User;
import com.example.demo.user.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Customer Review & Ratings Operations Service
 * ============================================
 * Handles review submissions, rating aggregations, and merchant status badges.
 */
@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final UserService userService;
    private final OrderService orderService;

    public Review createReview(String userEmail, ReviewRequest request) {
        User buyer = userService.findByEmail(userEmail);
        Order order = orderService.findById(request.getOrderId());

        if (!buyer.getId().equals(order.getBuyerId())) {
            throw new IllegalArgumentException("Only the buyer can review this order");
        }

        if (!"DELIVERED".equals(order.getStatus())) {
            throw new IllegalArgumentException("Reviews are only permitted on delivered orders");
        }

        if (reviewRepository.findByOrderId(request.getOrderId()).isPresent()) {
            throw new IllegalArgumentException("You have already reviewed this order");
        }

        Review review = Review.builder()
                .orderId(order.getId())
                .sellerId(order.getSellerId())
                .buyerId(buyer.getId())
                .buyerName(buyer.getName())
                .rating(Math.max(1, Math.min(5, request.getRating())))
                .comment(request.getComment())
                .imageUrl(request.getImageUrl())
                .createdAt(Instant.now())
                .build();

        return reviewRepository.save(review);
    }

    public List<Review> findBySellerId(String sellerId) {
        return reviewRepository.findBySellerId(sellerId);
    }

    public Map<String, Object> getSellerRatingSummary(String sellerId) {
        List<Review> reviews = reviewRepository.findBySellerId(sellerId);
        if (reviews.isEmpty()) {
            return Map.of("averageRating", 5.0, "totalReviews", 0, "badge", "New Merchant 🌱");
        }

        double avg = reviews.stream().mapToInt(Review::getRating).average().orElse(5.0);
        avg = Math.round(avg * 10.0) / 10.0;

        String badge = "Verified Merchant 🏪";
        if (avg >= 4.7 && reviews.size() >= 2) {
            badge = "Top Rated Merchant 🏆";
        } else if (avg >= 4.0) {
            badge = "Super Fast Delivery ⚡";
        }

        return Map.of("averageRating", avg, "totalReviews", reviews.size(), "badge", badge);
    }
}
