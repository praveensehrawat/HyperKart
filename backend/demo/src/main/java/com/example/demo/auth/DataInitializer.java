package com.example.demo.auth;

import com.example.demo.product.Product;
import com.example.demo.product.ProductRepository;
import com.example.demo.seller.Seller;
import com.example.demo.seller.SellerRepository;
import com.example.demo.user.User;
import com.example.demo.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.data.mongodb.core.geo.GeoJsonPoint;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Demo Data Initializer
 * =====================
 * Pre-seeds default test accounts for Admin, Seller, Driver, and Buyer roles
 * as well as active demo sellers and products on application startup.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final SellerRepository sellerRepository;
    private final ProductRepository productRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        log.info("Checking & seeding default authentication accounts...");

        String defaultPass = passwordEncoder.encode("Password123!");

        // 1. Seed Admin Account
        String adminEmail = "admin@hyperkart.com";
        User admin = userRepository.findByEmailIgnoreCase(adminEmail)
                .orElseGet(() -> userRepository.findByEmailIgnoreCase("admin@HYPERKART.com").orElse(null));
        if (admin == null) {
            admin = User.builder()
                    .name("System Administrator")
                    .email(adminEmail)
                    .password(defaultPass)
                    .role("ADMIN")
                    .provider("LOCAL")
                    .forceLoggedOut(false)
                    .build();
        } else {
            admin.setEmail(adminEmail);
            admin.setPassword(defaultPass);
            admin.setRole("ADMIN");
        }
        userRepository.save(admin);
        log.info("Seeded Admin Account: admin@hyperkart.com / Password123!");

        // 2. Seed Primary Seller Account
        String sellerEmail = "john.doe@gmail.com";
        User sellerUser = userRepository.findByEmailIgnoreCase(sellerEmail).orElse(null);
        if (sellerUser == null) {
            sellerUser = User.builder()
                    .name("John Doe")
                    .email(sellerEmail)
                    .password(defaultPass)
                    .role("SELLER")
                    .provider("LOCAL")
                    .forceLoggedOut(false)
                    .build();
        } else {
            sellerUser.setPassword(defaultPass);
            sellerUser.setRole("SELLER");
        }
        sellerUser = userRepository.save(sellerUser);
        log.info("Seeded Seller Account: john.doe@gmail.com / Password123!");

        // 3. Seed Captain Account
        String captainEmail = "captain@hyperkart.com";
        User captain = userRepository.findByEmailIgnoreCase(captainEmail)
                .orElseGet(() -> userRepository.findByEmailIgnoreCase("driver@hyperkart.com").orElse(null));
        if (captain == null) {
            captain = User.builder()
                    .name("Rajesh Express Captain")
                    .email(captainEmail)
                    .password(defaultPass)
                    .role("CAPTAIN")
                    .provider("LOCAL")
                    .forceLoggedOut(false)
                    .build();
        } else {
            captain.setEmail(captainEmail);
            captain.setPassword(defaultPass);
            captain.setRole("CAPTAIN");
        }
        userRepository.save(captain);
        log.info("Seeded Captain Account: captain@hyperkart.com / Password123!");

        // 4. Seed Buyer Account
        String buyerEmail = "buyer@hyperkart.com";
        User buyer = userRepository.findByEmailIgnoreCase(buyerEmail)
                .orElseGet(() -> userRepository.findByEmailIgnoreCase("buyer@HYPERKART.com").orElse(null));
        if (buyer == null) {
            buyer = User.builder()
                    .name("Anita Kumar")
                    .email(buyerEmail)
                    .password(defaultPass)
                    .role("BUYER")
                    .provider("LOCAL")
                    .forceLoggedOut(false)
                    .build();
        } else {
            buyer.setEmail(buyerEmail);
            buyer.setPassword(defaultPass);
            buyer.setRole("BUYER");
        }
        userRepository.save(buyer);
        log.info("Seeded Buyer Account: buyer@hyperkart.com / Password123!");

        // 5. Seed Demo Seller Shops if none exist
        if (sellerRepository.findAll().isEmpty()) {
            Seller freshMart = Seller.builder()
                    .userId(sellerUser.getId())
                    .shopName("Fresh & Organic Supermarket")
                    .description("Farm-fresh organic fruits, vegetables, dairy & everyday essentials")
                    .address("102 Main Street, Central Plaza, Delhi")
                    .phone("+91 9876543210")
                    .location(new GeoJsonPoint(77.2090, 28.6139))
                    .active(true)
                    .status("APPROVED")
                    .build();

            Seller techHub = Seller.builder()
                    .userId("tech_seller_id")
                    .shopName("Apex Electronics & Tech Hub")
                    .description("Latest smartphones, wireless earbuds, smartwatches & accessories")
                    .address("405 Silicon Avenue, Tech Park, Delhi")
                    .phone("+91 9812345678")
                    .location(new GeoJsonPoint(77.2150, 28.6200))
                    .active(true)
                    .status("APPROVED")
                    .build();

            Seller fashionApparel = Seller.builder()
                    .userId("fashion_seller_id")
                    .shopName("Velvet & Thread Apparel")
                    .description("Trendy menswear, womenswear, denim, jackets & urban streetwear")
                    .address("88 Promenade Mall, Fashion District, Delhi")
                    .phone("+91 9988776655")
                    .location(new GeoJsonPoint(77.2000, 28.6100))
                    .active(true)
                    .status("APPROVED")
                    .build();

            sellerRepository.saveAll(List.of(freshMart, techHub, fashionApparel));
            log.info("Seeded 3 Demo Seller Shops successfully!");
        }

        // 6. Seed Demo Products if none exist or none are active
        if (productRepository.findByActiveTrue().isEmpty()) {
            List<Seller> sellers = sellerRepository.findAll();
            String defaultSellerId = sellers.isEmpty() ? sellerUser.getId() : sellers.get(0).getId();

            Product p1 = Product.builder()
                    .sellerId(defaultSellerId)
                    .name("Organic Alphonso Mangoes (1kg)")
                    .description("Handpicked naturally ripened premium Alphonso mangoes from Ratnagiri farms.")
                    .category("Grocery")
                    .price(299.00)
                    .stock(50)
                    .imageUrl("https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=800&q=80")
                    .active(true)
                    .build();

            Product p2 = Product.builder()
                    .sellerId(defaultSellerId)
                    .name("Wireless Active Noise-Canceling Headphones")
                    .description("Immersive HD audio with 40-hour battery life and Bluetooth 5.3 multi-device pairing.")
                    .category("Electronics")
                    .price(2999.00)
                    .stock(30)
                    .imageUrl("https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80")
                    .active(true)
                    .build();

            Product p3 = Product.builder()
                    .sellerId(defaultSellerId)
                    .name("Smart Fitness Watch Ultra")
                    .description("AMOLED touch display with real-time heart rate monitoring, SpO2 tracking, and 100+ workout modes.")
                    .category("Electronics")
                    .price(1899.00)
                    .stock(25)
                    .imageUrl("https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80")
                    .active(true)
                    .build();

            Product p4 = Product.builder()
                    .sellerId(defaultSellerId)
                    .name("Classic Heavyweight Fleece Hoodie")
                    .description("Soft premium brushed cotton hoodie with adjustable drawstring hood and kangaroo pocket.")
                    .category("Fashion")
                    .price(1299.00)
                    .stock(40)
                    .imageUrl("https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800&q=80")
                    .active(true)
                    .build();

            Product p5 = Product.builder()
                    .sellerId(defaultSellerId)
                    .name("Fresh Whole Pasteurised Milk (1 Litre)")
                    .description("Rich cream farm-fresh pasteurized milk packed with natural calcium and vitamins.")
                    .category("Grocery")
                    .price(65.00)
                    .stock(100)
                    .imageUrl("https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=800&q=80")
                    .active(true)
                    .build();

            Product p6 = Product.builder()
                    .sellerId(defaultSellerId)
                    .name("Ergonomic Running Sneakers")
                    .description("Lightweight breathable mesh upper with responsive foam cushioning for maximum sports comfort.")
                    .category("Fashion")
                    .price(2199.00)
                    .stock(20)
                    .imageUrl("https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80")
                    .active(true)
                    .build();

            productRepository.saveAll(List.of(p1, p2, p3, p4, p5, p6));
            log.info("Seeded 6 Demo Products across Grocery, Electronics & Fashion categories!");
        }

        log.info("Demo accounts, sellers, and products initialized successfully! All default passwords set to 'Password123!'");
    }
}
