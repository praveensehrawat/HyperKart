package com.example.demo.ai;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * AI Recommendations Controller
 * ============================
 * Exposes REST endpoints to request personalized recommendations and geolocated smart search matches.
 */
@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiRecommendationService aiService;

    /**
     * Retrieves personalized products recommendations based on search terms, geocoded position,
     * and optional user transaction history records.
     *
     * @param query  optional search term query
     * @param lat    optional geolocation latitude coordinates
     * @param lng    optional geolocation longitude coordinates
     * @param user   authenticated user credentials context
     * @return map container containing recommended products, map lists, and AI insights
     */
    @GetMapping("/recommendations")
    public ResponseEntity<Map<String, Object>> recommendations(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lng,
            @RequestParam(required = false) String weather,
            @RequestParam(required = false) String timeOfDay,
            @AuthenticationPrincipal UserDetails user) {
        String userId = user != null ? user.getUsername() : null;
        return ResponseEntity.ok(aiService.getRecommendations(query, lat, lng, weather, timeOfDay, userId));
    }

    /**
     * Performs a non-personalized geocoded search match query.
     *
     * @param q      required search keyword query
     * @param lat    optional latitude coordinate
     * @param lng    optional longitude coordinate
     * @return smart recommendations map container
     */
    @GetMapping("/search")
    public ResponseEntity<Map<String, Object>> search(
            @RequestParam String q,
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lng,
            @RequestParam(required = false) String weather,
            @RequestParam(required = false) String timeOfDay) {
        return ResponseEntity.ok(aiService.smartSearch(q, lat, lng, weather, timeOfDay));
    }

    /**
     * AI Autonomous Price Bargainer & Dynamic Haggling Endpoint
     */
    @PostMapping("/bargain")
    public ResponseEntity<Map<String, Object>> bargain(@RequestBody Map<String, Object> payload) {
        String productId = (String) payload.get("productId");
        double requestedPrice = Double.parseDouble(payload.get("requestedPrice").toString());
        int quantity = Integer.parseInt(payload.getOrDefault("quantity", 1).toString());
        return ResponseEntity.ok(aiService.negotiateBargain(productId, requestedPrice, quantity));
    }

    /**
     * AI Recipe-to-Cart 1-Click Bundler Endpoint
     */
    @PostMapping("/recipe-bundle")
    public ResponseEntity<Map<String, Object>> recipeBundle(@RequestBody Map<String, Object> payload) {
        String prompt = (String) payload.getOrDefault("prompt", "Shahi Paneer");
        int servings = Integer.parseInt(payload.getOrDefault("servings", 4).toString());
        return ResponseEntity.ok(aiService.parseRecipeBundle(prompt, servings));
    }
}
