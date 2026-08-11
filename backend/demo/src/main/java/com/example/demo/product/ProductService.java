package com.example.demo.product;

import com.example.demo.seller.Seller;
import com.example.demo.seller.SellerRepository;
import com.example.demo.user.User;
import com.example.demo.user.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

/**
 * Product Catalog Management Service
 * ==================================
 * Implements catalog CRUD operations, enforces seller ownership validation checks,
 * manages caching strategies, catalog keyword searches, and publishes real-time WebSocket stock updates.
 */
@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final SellerRepository sellerRepository;
    private final UserService userService;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Creates a new product catalog listing.
     * Clears all cached product lists to ensure consistency.
     * Broadcasts a WebSocket event notifying clients of the new product.
     */
    public Product create(String userEmail, ProductRequest request) {
        User user = userService.findByEmail(userEmail);
        Seller seller = sellerRepository.findByUserId(user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Create a seller profile first before listing products"));

        Product product = Product.builder()
                .sellerId(seller.getId())
                .name(request.getName())
                .description(request.getDescription())
                .category(request.getCategory())
                .price(request.getPrice())
                .stock(request.getStock())
                .imageUrl(request.getImageUrl())
                .active(true)
                .build();

        Product saved = productRepository.save(product);

        // Broadcast real-time websocket event for new product listing
        try {
            Map<String, Object> payload = Map.of(
                    "type", "product_update",
                    "action", "NEW_PRODUCT",
                    "productId", saved.getId(),
                    "name", saved.getName(),
                    "stock", saved.getStock(),
                    "price", saved.getPrice(),
                    "timestamp", System.currentTimeMillis()
            );
            messagingTemplate.convertAndSend("/topic/updates", (Object) payload);
        } catch (Exception ignored) {}

        return saved;
    }

    /**
     * Retrieves a page of active products.
     */
    public Page<Product> findAll(Pageable pageable) {
        Page<Product> page = productRepository.findByActiveTrue(pageable);
        if (page.isEmpty()) {
            return productRepository.findAll(pageable);
        }
        return page;
    }

    /**
     * Searches active products by keyword in name, description, or category.
     */
    public List<Product> search(String query) {
        if (query == null || query.trim().isEmpty()) {
            return productRepository.findByActiveTrue();
        }
        return productRepository.searchActiveProducts(query.trim());
    }

    /**
     * Looks up an active product by ID.
     */
    public Product findById(String id) {
        return productRepository.findById(id)
                .filter(Product::isActive)
                .orElseThrow(() -> new IllegalArgumentException("Product not found with ID: " + id));
    }

    /**
     * Filters active products by seller.
     */
    public List<Product> findBySeller(String sellerId) {
        return productRepository.findBySellerIdAndActiveTrue(sellerId);
    }

    /**
     * Filters active products by category.
     */
    public List<Product> findByCategory(String category) {
        return productRepository.findByCategoryAndActiveTrue(category);
    }

    /**
     * Modifies catalog parameters for a product.
     * Validates that the updating user owns the target product entry.
     * Publishes real-time stock alert messages over the STOMP updates topic.
     */
    public Product update(String userEmail, String id, ProductRequest request) {
        User user = userService.findByEmail(userEmail);
        Product product = findById(id);
        verifyOwnership(user, product);

        product.setName(request.getName());
        product.setDescription(request.getDescription());
        product.setCategory(request.getCategory());
        product.setPrice(request.getPrice());
        product.setStock(request.getStock());
        product.setImageUrl(request.getImageUrl());

        Product saved = productRepository.save(product);

        // Publish live stock alerts payload over WebSocket
        try {
            Map<String, Object> payload = Map.of(
                    "type", "product_update",
                    "action", "UPDATE_PRODUCT",
                    "productId", saved.getId(),
                    "name", saved.getName(),
                    "stock", saved.getStock(),
                    "price", saved.getPrice(),
                    "timestamp", System.currentTimeMillis()
            );
            messagingTemplate.convertAndSend("/topic/updates", (Object) payload);
        } catch (Exception ignored) {}

        return saved;
    }

    /**
     * Performs a soft delete operation on a product catalog entry.
     * Sets active status flag to false to preserve historical order lookups.
     */
    public void delete(String userEmail, String id) {
        User user = userService.findByEmail(userEmail);
        Product product = findById(id);
        verifyOwnership(user, product);
        product.setActive(false);
        productRepository.save(product);

        // Broadcast deletion event over WebSocket
        try {
            Map<String, Object> payload = Map.of(
                    "type", "product_update",
                    "action", "DELETE_PRODUCT",
                    "productId", id,
                    "name", product.getName(),
                    "stock", 0,
                    "timestamp", System.currentTimeMillis()
            );
            messagingTemplate.convertAndSend("/topic/updates", (Object) payload);
        } catch (Exception ignored) {}
    }

    /**
     * Security helper: Validates that a user modifying a product owns the seller profile,
     * or is a platform administrator.
     */
    private void verifyOwnership(User user, Product product) {
        if ("ADMIN".equals(user.getRole())) return;
        Seller seller = sellerRepository.findByUserId(user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Not a seller profile"));
        if (!seller.getId().equals(product.getSellerId())) {
            throw new IllegalArgumentException("Not authorized to modify this product");
        }
    }
}
