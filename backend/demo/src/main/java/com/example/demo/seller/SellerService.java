package com.example.demo.seller;

import com.example.demo.geo.GeoService;
import com.example.demo.user.User;
import com.example.demo.user.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.geo.Circle;
import org.springframework.data.geo.Distance;
import org.springframework.data.geo.Metrics;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Seller Management Service
 * =========================
 * Processes merchant registrations, coordinates details modifications,
 * and compiles geospatial location query matches using MongoTemplates.
 */
@Service
@RequiredArgsConstructor
public class SellerService {

    private final SellerRepository sellerRepository;
    private final UserService userService;
    private final MongoTemplate mongoTemplate;
    private final GeoService geoService;

    /**
     * Establishes a new merchant profile.
     * Restricts execution context to sellers and administrators.
     */
    public Seller create(String userEmail, SellerRequest request) {
        User user = userService.findByEmail(userEmail);
        if (!"SELLER".equals(user.getRole()) && !"ADMIN".equals(user.getRole())) {
            throw new IllegalArgumentException("Only sellers can create shop profiles");
        }

        Seller seller = Seller.builder()
                .userId(user.getId())
                .shopName(request.getShopName())
                .description(request.getDescription())
                .address(request.getAddress())
                .phone(request.getPhone())
                .active(true)
                .location(geoService.toPoint(request.getLongitude(), request.getLatitude()))
                .build();

        return sellerRepository.save(seller);
    }

    /**
     * Lists active registered merchants.
     */
    public List<Seller> findAll() {
        return sellerRepository.findByActiveTrue();
    }

    /**
     * Looks up merchant detail profiles.
     */
    public Seller findById(String id) {
        return sellerRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Seller not found"));
    }

    /**
     * Updates an existing user's merchant credentials.
     */
    public Seller update(String userEmail, SellerRequest request) {
        Seller seller = sellerRepository.findByUserId(userService.findByEmail(userEmail).getId())
                .orElseThrow(() -> new IllegalArgumentException("Seller profile not found for user"));

        seller.setShopName(request.getShopName());
        seller.setDescription(request.getDescription());
        seller.setAddress(request.getAddress());
        seller.setPhone(request.getPhone());
        // Map decimal values to MongoDB GeoJsonPoint objects
        seller.setLocation(geoService.toPoint(request.getLongitude(), request.getLatitude()));

        return sellerRepository.save(seller);
    }

    /**
     * Performs a spherical distance check using MongoDB $within and $centerSphere queries.
     * Computes actual geodetic distance in kilometers and sorts outcomes in ascending order.
     *
     * @param lat      search center coordinate latitude
     * @param lng      search center coordinate longitude
     * @param radiusKm filter boundary radius in kilometers
     * @return sorted nearby seller details map listing
     */
    public List<Map<String, Object>> findNearby(double lat, double lng, double radiusKm) {
        Circle circle = new Circle(geoService.toPoint(lng, lat), new Distance(radiusKm, Metrics.KILOMETERS));
        Query query = new Query(Criteria.where("location").withinSphere(circle)
                .and("active").is(true)
                .and("status").is("APPROVED"));

        return mongoTemplate.find(query, Seller.class).stream()
                .map(seller -> {
                    double distance = geoService.distanceKm(lat, lng, seller);
                    return Map.<String, Object>of(
                            "seller", seller,
                            "distanceKm", Math.round(distance * 100.0) / 100.0
                    );
                })
                .sorted((a, b) -> Double.compare(
                        (Double) a.get("distanceKm"),
                        (Double) b.get("distanceKm")
                ))
                .collect(Collectors.toList());
    }

    /**
     * Lists all merchant profiles pending administrator review.
     */
    public List<Seller> findAllPending() {
        return sellerRepository.findByStatus("PENDING_APPROVAL");
    }

    private final org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate;

    /**
     * Approves a merchant profile, allowing it to list inventory and appear on search maps.
     */
    public Seller approveSeller(String sellerId) {
        Seller seller = findById(sellerId);
        seller.setStatus("APPROVED");
        return sellerRepository.save(seller);
    }

    /**
     * Broadcasts a real-time 2-hour flash deal alert over WebSocket topic /topic/updates.
     */
    public Map<String, Object> broadcastFlashDeal(String userEmail, FlashDealRequest request) {
        User user = userService.findByEmail(userEmail);
        Seller seller = sellerRepository.findByUserId(user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Seller profile not found"));

        Map<String, Object> payload = Map.of(
                "type", "flash_deal",
                "sellerId", seller.getId(),
                "shopName", seller.getShopName(),
                "dealTitle", request.getDealTitle(),
                "discountPercent", request.getDiscountPercent() > 0 ? request.getDiscountPercent() : 20,
                "category", request.getCategory() != null ? request.getCategory() : "General",
                "timestamp", System.currentTimeMillis()
        );

        try {
            messagingTemplate.convertAndSend("/topic/updates", (Object) payload);
        } catch (Exception ignored) {}

        return payload;
    }
}
