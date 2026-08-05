package com.example.demo.product;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Products Directory REST API Controller
 * =====================================
 * Exposes API routes to query catalog directories, search items, create products (for sellers),
 * update stock levels, and delete entries.
 */
@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    /**
     * Creates a new product catalog listing.
     * Accessible by sellers and administrators.
     */
    @PostMapping
    public ResponseEntity<Product> create(
            @AuthenticationPrincipal UserDetails user,
            @Valid @RequestBody ProductRequest request) {
        return ResponseEntity.ok(productService.create(user.getUsername(), request));
    }

    /**
     * Queries active products database pages.
     */
    @GetMapping
    public ResponseEntity<Page<Product>> findAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(productService.findAll(PageRequest.of(page, size)));
    }

    /**
     * Searches active products matching a keyword.
     */
    @GetMapping("/search")
    public ResponseEntity<List<Product>> search(@RequestParam(required = false, defaultValue = "") String query) {
        return ResponseEntity.ok(productService.search(query));
    }

    /**
     * Looks up product details by unique ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<Product> getById(@PathVariable String id) {
        return ResponseEntity.ok(productService.findById(id));
    }

    /**
     * Queries all active products belonging to a merchant seller ID.
     */
    @GetMapping("/seller/{sellerId}")
    public ResponseEntity<List<Product>> getBySeller(@PathVariable String sellerId) {
        return ResponseEntity.ok(productService.findBySeller(sellerId));
    }

    /**
     * Queries products list matching a specific category name.
     */
    @GetMapping("/category/{category}")
    public ResponseEntity<List<Product>> getByCategory(@PathVariable String category) {
        return ResponseEntity.ok(productService.findByCategory(category));
    }

    /**
     * Modifies catalog parameters and stock counts for an existing product.
     */
    @PutMapping("/{id}")
    public ResponseEntity<Product> update(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable String id,
            @Valid @RequestBody ProductRequest request) {
        return ResponseEntity.ok(productService.update(user.getUsername(), id, request));
    }

    /**
     * Toggles the active flag of a product to false (Soft-deletes product).
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable String id) {
        productService.delete(user.getUsername(), id);
        return ResponseEntity.noContent().build();
    }
}
