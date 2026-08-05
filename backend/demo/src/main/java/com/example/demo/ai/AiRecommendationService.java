package com.example.demo.ai;

import com.example.demo.geo.GeoService;
import com.example.demo.order.Order;
import com.example.demo.order.OrderRepository;
import com.example.demo.product.Product;
import com.example.demo.product.ProductRepository;
import com.example.demo.seller.Seller;
import com.example.demo.seller.SellerService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.*;
import java.util.stream.Collectors;

/**
 * AI Recommendations Service
 * ==========================
 * Handles business logic for product matching and ranking. Communicates with external
 * FastAPI AI engine; implements local heuristic fallback scoring when offline.
 */
@Service
@RequiredArgsConstructor
public class AiRecommendationService {

    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;
    private final SellerService sellerService;
    private final GeoService geoService;
    private final WebClient.Builder webClientBuilder;

    @Value("${ai.service.url:http://localhost:8000}")
    private String aiServiceUrl;

    @Value("${openai.api-key:}")
    private String openAiApiKey;

    /**
     * Main recommendation compiler. Queries nearby merchants, checks buyer history categories,
     * packages requests, and invokes remote AI ranking engine. Falls back to local scoring if offline.
     */
    public Map<String, Object> getRecommendations(String query, Double lat, Double lng, String weather, String timeOfDay, String userId) {
        List<Product> products = productRepository.findByActiveTrue();
        
        // Find sellers within a default 10km radius if coordinates are provided
        List<Map<String, Object>> nearbySellers = (lat != null && lng != null)
                ? sellerService.findNearby(lat, lng, 10)
                : List.of();

        // Extract historical product purchase categories to personalization set context
        Set<String> preferredCategories = new HashSet<>();
        if (userId != null) {
            orderRepository.findByBuyerId(userId, org.springframework.data.domain.PageRequest.of(0, 20))
                    .forEach(order -> order.getItems().forEach(item -> {
                        productRepository.findById(item.getProductId())
                                .ifPresent(p -> preferredCategories.add(p.getCategory()));
                    }));
        }

        // Parse entities into plain DTO map payloads
        List<Map<String, Object>> productList = products.stream()
                .map(p -> Map.<String, Object>of(
                        "id", p.getId(),
                        "name", p.getName(),
                        "description", p.getDescription() != null ? p.getDescription() : "",
                        "category", p.getCategory(),
                        "sellerId", p.getSellerId(),
                        "stock", p.getStock(),
                        "price", p.getPrice(),
                        "imageUrl", p.getImageUrl() != null ? p.getImageUrl() : ""
                ))
                .collect(Collectors.toList());

        List<Map<String, Object>> sellerList = nearbySellers.stream()
                .map(m -> Map.<String, Object>of(
                        "seller", Map.<String, Object>of(
                                "id", ((Seller) m.get("seller")).getId(),
                                "shopName", ((Seller) m.get("seller")).getShopName(),
                                "address", ((Seller) m.get("seller")).getAddress()
                        ),
                        "distanceKm", m.get("distanceKm")
                ))
                .collect(Collectors.toList());

        Map<String, Object> requestBody = new LinkedHashMap<>();
        requestBody.put("products", productList);
        requestBody.put("query", query);
        requestBody.put("nearby_sellers", sellerList);
        requestBody.put("preferred_categories", new ArrayList<>(preferredCategories));
        requestBody.put("weather", weather);
        requestBody.put("time_of_day", timeOfDay);

        try {
            // Submit request to FastAPI recommendation engine (type-safe reference avoids unchecked warning)
            Map<String, Object> response = webClientBuilder.build()
                    .post()
                    .uri(aiServiceUrl + "/api/recommend")
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .block();

            if (response != null) {
                response.put("nearbySellers", nearbySellers.stream().limit(5).collect(Collectors.toList()));
                return response;
            }
        } catch (Exception e) {
            System.err.println("FastAPI call failed, falling back to local scoring: " + e.getMessage());
        }

        // Fallback: Compute relevance using local heuristic scoring loop
        List<Product> scored = scoreProducts(products, query, nearbySellers, weather, timeOfDay, userId);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("recommendations", scored.stream().limit(8).collect(Collectors.toList()));
        result.put("nearbySellers", nearbySellers.stream().limit(5).collect(Collectors.toList()));
        result.put("source", "rule-based (fallback)");

        if (query != null && !query.isBlank()) {
            result.put("aiInsight", "Based on your search, we found great local options nearby. Check the recommended products above!");
        } else if ((weather != null && !weather.isBlank()) || (timeOfDay != null && !timeOfDay.isBlank())) {
            result.put("aiInsight", String.format("Suggestions optimized for a %s %s. Check out the recommended products above!", 
                    weather != null ? weather : "", timeOfDay != null ? timeOfDay : ""));
        }

        return result;
    }

    /**
     * Wrapper proxy for non-personalized search calls.
     */
    public Map<String, Object> smartSearch(String query, Double lat, Double lng, String weather, String timeOfDay) {
        return getRecommendations(query, lat, lng, weather, timeOfDay, null);
    }

    /**
     * Computes scoring profiles for a list of products.
     */
    private List<Product> scoreProducts(
            List<Product> products,
            String query,
            List<Map<String, Object>> nearbySellers,
            String weather,
            String timeOfDay,
            String userId) {

        Set<String> preferredCategories = new HashSet<>();
        if (userId != null) {
            orderRepository.findByBuyerId(userId, org.springframework.data.domain.PageRequest.of(0, 20))
                    .forEach(order -> order.getItems().forEach(item -> {
                        productRepository.findById(item.getProductId())
                                .ifPresent(p -> preferredCategories.add(p.getCategory()));
                    }));
        }

        Set<String> nearbySellerIds = nearbySellers.stream()
                .map(m -> ((Seller) m.get("seller")).getId())
                .collect(Collectors.toSet());

        String q = query != null ? query.toLowerCase() : "";

        java.util.stream.Stream<Product> stream = products.stream();
        if (query != null && !query.trim().isEmpty()) {
            final String finalQ = query.trim().toLowerCase();
            final String[] words = finalQ.split("\\s+");
            stream = stream.filter(p -> {
                boolean matchesFull = p.getName().toLowerCase().contains(finalQ) 
                                      || p.getCategory().toLowerCase().contains(finalQ) 
                                      || (p.getDescription() != null && p.getDescription().toLowerCase().contains(finalQ));
                if (matchesFull) return true;
                for (String w : words) {
                    if (w.length() > 1 && (p.getName().toLowerCase().contains(w) 
                                           || p.getCategory().toLowerCase().contains(w) 
                                           || (p.getDescription() != null && p.getDescription().toLowerCase().contains(w)))) {
                        return true;
                    }
                }
                return false;
            });
        }

        return stream
                .sorted((a, b) -> Double.compare(
                        score(b, q, preferredCategories, nearbySellerIds, weather, timeOfDay),
                        score(a, q, preferredCategories, nearbySellerIds, weather, timeOfDay)))
                .collect(Collectors.toList());
    }

    /**
     * Scored weight allocations:
     * - Seller Proximity: +15
     * - Name Match: +10
     * - Preferred Category History: +8
     * - Category Match: +7
     * - Description Keyword Match: +5
     * - Available Stock: +2
     * - Weather Boost: +12
     * - Time of Day Boost: +12
     */
    private double score(Product p, String query, Set<String> preferredCategories, Set<String> nearbySellerIds, String weather, String timeOfDay) {
        double score = 0;
        if (!query.isBlank()) {
            if (p.getName().toLowerCase().contains(query)) score += 10;
            if (p.getDescription() != null && p.getDescription().toLowerCase().contains(query)) score += 5;
            if (p.getCategory().toLowerCase().contains(query)) score += 7;
        }
        if (preferredCategories.contains(p.getCategory())) score += 8;
        if (nearbySellerIds.contains(p.getSellerId())) score += 15;
        if (p.getStock() > 0) score += 2;

        // Weather keywords mappings
        Map<String, List<String>> weatherItems = Map.of(
            "cold", List.of("tea", "coffee", "soup", "cocoa", "jacket", "sweater", "heater", "hot chocolate", "porridge"),
            "hot", List.of("ice cream", "cold drink", "soda", "juice", "lemonade", "ice", "fan", "ac", "watermelon", "cucumber", "salad"),
            "rainy", List.of("umbrella", "raincoat", "tea", "soup", "boots", "poncho"),
            "sunny", List.of("sunglasses", "sunscreen", "hat", "ice cream", "juice", "lemonade")
        );

        Map<String, List<String>> timeItems = Map.of(
            "morning", List.of("breakfast", "tea", "coffee", "milk", "bread", "butter", "egg", "cereal", "oatmeal", "juice"),
            "afternoon", List.of("lunch", "meal", "soda", "rice", "sandwich", "salad", "fruit"),
            "evening", List.of("tea", "coffee", "snacks", "cookies", "chips", "soup"),
            "night", List.of("dinner", "milk", "snack", "dessert", "tea", "chamomile", "pillow")
        );

        if (weather != null && !weather.isBlank()) {
            String w = weather.toLowerCase();
            List<String> keywords = weatherItems.get(w);
            if (keywords != null) {
                for (String kw : keywords) {
                    if (p.getName().toLowerCase().contains(kw) || p.getCategory().toLowerCase().contains(kw) 
                            || (p.getDescription() != null && p.getDescription().toLowerCase().contains(kw))) {
                        score += 12;
                        break;
                    }
                }
            }
        }

        if (timeOfDay != null && !timeOfDay.isBlank()) {
            String t = timeOfDay.toLowerCase();
            List<String> keywords = timeItems.get(t);
            if (keywords != null) {
                for (String kw : keywords) {
                    if (p.getName().toLowerCase().contains(kw) || p.getCategory().toLowerCase().contains(kw)
                            || (p.getDescription() != null && p.getDescription().toLowerCase().contains(kw))) {
                        score += 12;
                        break;
                    }
                }
            }
        }

        return score;
    }

    /**
     * AI Autonomous Price Bargainer & Dynamic Haggling Engine
     * Evaluates requested buyer price against stock volume and bulk quantity.
     */
    public Map<String, Object> negotiateBargain(String productId, double requestedPrice, int quantity) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new IllegalArgumentException("Product not found: " + productId));

        double originalPrice = product.getPrice();
        int stock = product.getStock();
        int qty = Math.max(1, quantity);

        // Calculate max allowed discount percentage based on quantity
        double maxDiscountPct = 0.03; // Default 3% for single item
        if (qty >= 5) {
            maxDiscountPct = 0.20; // 20% max discount for bulk 5+
        } else if (qty >= 3) {
            maxDiscountPct = 0.12; // 12% max discount for 3+
        } else if (qty >= 2) {
            maxDiscountPct = 0.07; // 7% max discount for 2
        }

        // Adjust for current stock availability
        if (stock > 30) {
            maxDiscountPct += 0.04; // High stock leniency (+4%)
        } else if (stock < 5) {
            maxDiscountPct = Math.max(0.0, maxDiscountPct - 0.08); // Low stock tightness (-8%)
        }

        double priceFloor = originalPrice * (1.0 - maxDiscountPct);
        priceFloor = Math.round(priceFloor * 100.0) / 100.0;

        String status;
        double finalPrice;
        double counterPrice = priceFloor;
        String message;

        if (requestedPrice >= priceFloor && requestedPrice < originalPrice) {
            status = "ACCEPTED";
            finalPrice = Math.round(requestedPrice * 100.0) / 100.0;
            double discPct = Math.round(((originalPrice - finalPrice) / originalPrice) * 100.0);
            message = String.format("🤝 Deal Accepted! I can give you %s for $%.2f each (Saved %.0f%%) for buying %d units!", 
                    product.getName(), finalPrice, discPct, qty);
        } else if (priceFloor < originalPrice) {
            status = "COUNTER_OFFER";
            finalPrice = counterPrice;
            double discPct = Math.round(((originalPrice - counterPrice) / originalPrice) * 100.0);
            message = String.format("💬 Counter-Offer: I can't go down to $%.2f, but since you're ordering %d units, how about $%.2f each (%.0f%% OFF)?", 
                    requestedPrice, qty, counterPrice, discPct);
        } else {
            status = "REJECTED";
            finalPrice = originalPrice;
            message = String.format("❌ Stock is high demand right now for %s. The best price I can offer is the original $%.2f each.", 
                    product.getName(), originalPrice);
        }

        double discPct = Math.max(0, Math.round(((originalPrice - finalPrice) / originalPrice) * 100.0));

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", status);
        response.put("productId", product.getId());
        response.put("productName", product.getName());
        response.put("originalPrice", originalPrice);
        response.put("requestedPrice", requestedPrice);
        response.put("finalPrice", finalPrice);
        response.put("counterPrice", counterPrice);
        response.put("quantity", qty);
        response.put("discountPercent", discPct);
        response.put("message", message);

        return response;
    }

    /**
     * AI Recipe-to-Cart 1-Click Ingredient Bundler Engine
     * Parses dish prompt into specific ingredients and matches closest local inventory items.
     */
    public Map<String, Object> parseRecipeBundle(String prompt, int servings) {
        List<Product> allProducts = productRepository.findByActiveTrue();
        String pLower = (prompt != null) ? prompt.toLowerCase() : "paneer";
        int people = Math.max(1, servings);

        String dishName = "Custom Recipe Bundle";
        if (pLower.contains("paneer")) dishName = "Shahi Paneer";
        else if (pLower.contains("coffee") || pLower.contains("sandwich")) dishName = "Cold Coffee & Sandwiches";
        else if (pLower.contains("chai") || pLower.contains("tea")) dishName = "Desi Masala Chai & Snacks";
        else if (pLower.contains("pizza") || pLower.contains("pasta")) dishName = "Italian Pasta & Garlic Bread";
        else if (pLower.contains("fruit") || pLower.contains("salad")) dishName = "Fresh Fruit & Green Salad";
        else if (prompt != null && !prompt.isBlank()) dishName = prompt.trim();

        // Match inventory items based on recipe requirements
        List<Map<String, Object>> bundleItems = new ArrayList<>();
        double rawSubtotal = 0.0;

        for (Product p : allProducts) {
            String nameLow = p.getName().toLowerCase();
            String catLow = p.getCategory().toLowerCase();

            boolean matches = false;
            int qtyNeeded = 1;

            if (dishName.contains("Paneer")) {
                if (nameLow.contains("paneer") || nameLow.contains("milk") || nameLow.contains("tomato") || nameLow.contains("onion") || nameLow.contains("butter") || nameLow.contains("spice") || catLow.contains("dairy") || catLow.contains("vegetables")) {
                    matches = true;
                    if (nameLow.contains("paneer")) qtyNeeded = (people > 3) ? 2 : 1;
                }
            } else if (dishName.contains("Coffee")) {
                if (nameLow.contains("coffee") || nameLow.contains("milk") || nameLow.contains("bread") || nameLow.contains("butter") || catLow.contains("beverage") || catLow.contains("bakery")) {
                    matches = true;
                }
            } else if (dishName.contains("Chai")) {
                if (nameLow.contains("tea") || nameLow.contains("milk") || nameLow.contains("sugar") || nameLow.contains("biscuit") || catLow.contains("beverage")) {
                    matches = true;
                }
            } else {
                // Keyword search match
                if (nameLow.contains(pLower) || catLow.contains(pLower)) {
                    matches = true;
                }
            }

            if (matches && bundleItems.size() < 5) {
                double linePrice = p.getPrice() * qtyNeeded;
                rawSubtotal += linePrice;

                Map<String, Object> itemMap = new LinkedHashMap<>();
                itemMap.put("id", p.getId());
                itemMap.put("name", p.getName());
                itemMap.put("category", p.getCategory());
                itemMap.put("unitPrice", p.getPrice());
                itemMap.put("quantity", qtyNeeded);
                itemMap.put("lineTotal", linePrice);
                itemMap.put("imageUrl", p.getImageUrl());
                itemMap.put("sellerId", p.getSellerId());
                itemMap.put("sellerName", "Local Kirana Store");
                bundleItems.add(itemMap);
            }
        }

        // Fallback: take first 3 products if empty
        if (bundleItems.isEmpty() && !allProducts.isEmpty()) {
            for (Product p : allProducts.stream().limit(3).collect(Collectors.toList())) {
                rawSubtotal += p.getPrice();
                Map<String, Object> itemMap = new LinkedHashMap<>();
                itemMap.put("id", p.getId());
                itemMap.put("name", p.getName());
                itemMap.put("category", p.getCategory());
                itemMap.put("unitPrice", p.getPrice());
                itemMap.put("quantity", 1);
                itemMap.put("lineTotal", p.getPrice());
                itemMap.put("imageUrl", p.getImageUrl());
                itemMap.put("sellerId", p.getSellerId());
                itemMap.put("sellerName", "Local Kirana Store");
                bundleItems.add(itemMap);
            }
        }

        double discount = Math.round(rawSubtotal * 0.05 * 100.0) / 100.0; // 5% Recipe Bundle Discount
        double finalTotal = Math.max(0.0, Math.round((rawSubtotal - discount) * 100.0) / 100.0);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("dishName", dishName);
        result.put("servings", people);
        result.put("items", bundleItems);
        result.put("rawSubtotal", rawSubtotal);
        result.put("recipeDiscount", discount);
        result.put("finalTotal", finalTotal);
        result.put("aiInsight", String.format("🍳 AI Recipe Engine compiled %d ingredients for %s (serves %d). 5%% Bundle Discount Applied!", 
                bundleItems.size(), dishName, people));

        return result;
    }
}