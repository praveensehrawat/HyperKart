package com.example.demo.common;

import com.example.demo.order.Order;
import com.example.demo.order.OrderRepository;
import com.example.demo.product.Product;
import com.example.demo.product.ProductRepository;
import com.example.demo.seller.Seller;
import com.example.demo.seller.SellerRepository;
import com.example.demo.user.User;
import com.example.demo.user.UserRepository;
import org.springframework.data.mongodb.core.geo.GeoJsonPoint;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * Administration Controls API Endpoint
 * =====================================
 * Handles seeding data, toggling simulation status flags, querying overall platform statistics,
 * and managing admin settings values.
 */
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final ProductRepository productRepository;
    private final DemoPublisherService demoPublisherService;
    private final AdminSettingsService adminSettingsService;
    private final UserRepository userRepository;
    private final SellerRepository sellerRepository;
    private final OrderRepository orderRepository;

    public AdminController(ProductRepository productRepository, 
                           DemoPublisherService demoPublisherService, 
                           AdminSettingsService adminSettingsService,
                           UserRepository userRepository,
                           SellerRepository sellerRepository,
                           OrderRepository orderRepository) {
        this.productRepository = productRepository;
        this.demoPublisherService = demoPublisherService;
        this.adminSettingsService = adminSettingsService;
        this.userRepository = userRepository;
        this.sellerRepository = sellerRepository;
        this.orderRepository = orderRepository;
    }

    /**
     * Retrieves all registered user accounts. Restricted to administrators.
     */
    @GetMapping("/users")
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(userRepository.findAll());
    }

    /**
     * Computes high-level platform statistics and metric summaries.
     */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getPlatformStats() {
        long totalUsers = userRepository.count();
        long totalSellers = sellerRepository.count();
        long totalProducts = productRepository.count();
        long totalOrders = orderRepository.count();

        double totalRevenue = orderRepository.findAll().stream()
                .mapToDouble(Order::getTotalAmount)
                .sum();

        return ResponseEntity.ok(Map.of(
                "totalUsers", totalUsers,
                "totalSellers", totalSellers,
                "totalProducts", totalProducts,
                "totalOrders", totalOrders,
                "totalRevenue", Math.round(totalRevenue * 100.0) / 100.0
        ));
    }

    /**
     * Resets the database catalog entries for the mock merchant seller profile
     * and seeds a collection of common grocery items.
     *
     * @return counts of inserted records
     */
    @PostMapping("/seed")
    public ResponseEntity<Map<String, Object>> seedDemoData() {
        productRepository.deleteBySellerId("demo-seller");
        productRepository.deleteBySellerId("seller-chawla");
        productRepository.deleteBySellerId("seller-fresh");
        sellerRepository.deleteById("seller-chawla");
        sellerRepository.deleteById("seller-fresh");

        // Seed Seller 1 User if not exists
        String seller1Email = "john.doe@gmail.com";
        User seller1 = userRepository.findByEmail(seller1Email).orElse(null);
        if (seller1 == null) {
            seller1 = User.builder()
                    .name("john doe")
                    .email(seller1Email)
                    .password("$2a$10$8.UnVuG9HHgffUDAlk8GP.3n.K3H56.x82a93b.b93c83.d83c83.") // dummy encoded pass
                    .role("SELLER")
                    .build();
            seller1 = userRepository.save(seller1);
        }

        Seller s1 = Seller.builder()
                .id("seller-chawla")
                .userId(seller1.getId())
                .shopName("Chawla Kiryana Store")
                .description("Your neighborhood grocer for fresh foods, spices, grains, and daily essentials.")
                .address("VIP Road, Zirakpur, Punjab")
                .phone("9876543210")
                .location(new GeoJsonPoint(76.822, 30.665))
                .active(true)
                .build();
        sellerRepository.save(s1);

        // Seed Seller 2 User if not exists
        String seller2Email = "johnndoe@gmail.com";
        User seller2 = userRepository.findByEmail(seller2Email).orElse(null);
        if (seller2 == null) {
            seller2 = User.builder()
                    .name("john")
                    .email(seller2Email)
                    .password("$2a$10$8.UnVuG9HHgffUDAlk8GP.3n.K3H56.x82a93b.b93c83.d83c83.")
                    .role("SELLER")
                    .build();
            seller2 = userRepository.save(seller2);
        }

        Seller s2 = Seller.builder()
                .id("seller-fresh")
                .userId(seller2.getId())
                .shopName("Zirakpur Fresh Mart")
                .description("Local organic farm produce, fresh fruits, vegetables, and daily dairy items.")
                .address("Ambala Chandigarh Expressway, Zirakpur")
                .phone("9876543211")
                .location(new GeoJsonPoint(76.825, 30.655))
                .active(true)
                .build();
        sellerRepository.save(s2);

        List<Product> demo = List.of(
                Product.builder().sellerId("seller-chawla").name("Fresh Apples").description("Crisp local apples").category("Fruits").price(1.99).stock(50).imageUrl("").active(true).build(),
                Product.builder().sellerId("seller-chawla").name("Organic Milk").description("1L organic milk").category("Dairy").price(0.99).stock(30).imageUrl("").active(true).build(),
                Product.builder().sellerId("seller-chawla").name("Brown Bread").description("Wholegrain loaf").category("Bakery").price(1.29).stock(20).imageUrl("").active(true).build(),
                Product.builder().sellerId("seller-fresh").name("Tomatoes").description("Fresh tomatoes per kg").category("Vegetables").price(2.49).stock(40).imageUrl("").active(true).build(),
                Product.builder().sellerId("seller-fresh").name("Eggs (6)").description("Free-range eggs, pack of 6").category("Grocery").price(1.79).stock(60).imageUrl("").active(true).build()
        );

        productRepository.saveAll(demo);
        return ResponseEntity.ok(Map.of("inserted", demo.size()));
    }

    /**
     * Starts the automatic background stock-update events publisher.
     */
    @PostMapping("/publisher/start")
    public ResponseEntity<Map<String, Object>> startPublisher() {
        demoPublisherService.start();
        return ResponseEntity.ok(Map.of("running", true));
    }

    /**
     * Stops the background stock-update publisher loop.
     */
    @PostMapping("/publisher/stop")
    public ResponseEntity<Map<String, Object>> stopPublisher() {
        demoPublisherService.stop();
        return ResponseEntity.ok(Map.of("running", false));
    }

    /**
     * Updates the periodic interval delay configuration for background stock events.
     */
    @PostMapping("/publisher/rate")
    public ResponseEntity<Map<String, Object>> setRate(@RequestBody Map<String, Object> body) {
        Object r = body.get("rate");
        long rate = 15000;
        if (r instanceof Number) rate = ((Number) r).longValue();
        demoPublisherService.setRate(rate);
        return ResponseEntity.ok(Map.of("rate", rate));
    }

    /**
     * Returns a summary of metrics containing current background scheduler details.
     */
    @GetMapping("/publisher/status")
    public ResponseEntity<Map<String, Object>> getStatus() {
        return ResponseEntity.ok(Map.of(
                "running", demoPublisherService.isRunning(),
                "rate", demoPublisherService.getRate(),
                "publishedCount", demoPublisherService.getPublishedCount(),
                "lastPublishedAt", demoPublisherService.getLastPublishedAt()
        ));
    }

    /**
     * Gets current test admin settings.
     */
    @GetMapping("/settings")
    public ResponseEntity<Map<String, Object>> getSettings() {
        return ResponseEntity.ok(Map.of("testAdminEmail", adminSettingsService.getTestAdminEmail()));
    }

    /**
     * Overwrites the active test admin email configuration.
     */
    @PostMapping("/settings")
    public ResponseEntity<Map<String, Object>> setSettings(@RequestBody Map<String, Object> body) {
        Object e = body.get("testAdminEmail");
        String email = e == null ? null : e.toString();
        adminSettingsService.setTestAdminEmail(email);
        return ResponseEntity.ok(Map.of("testAdminEmail", email));
    }
}
