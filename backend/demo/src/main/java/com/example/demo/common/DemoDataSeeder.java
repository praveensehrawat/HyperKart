package com.example.demo.common;

import com.example.demo.order.Order;
import com.example.demo.order.OrderRepository;
import com.example.demo.product.Product;
import com.example.demo.product.ProductRepository;
import com.example.demo.seller.Seller;
import com.example.demo.seller.SellerRepository;
import com.example.demo.user.User;
import com.example.demo.user.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.data.mongodb.core.geo.GeoJsonPoint;

import java.time.Instant;
import java.util.List;

/**
 * Database Seeder Component
 * =========================
 * Restores initial designated admin user, merchant shop profiles, catalog product items,
 * and claimable delivery packages so products, sellers, and orders are visible across the app.
 */
@Component
public class DemoDataSeeder implements CommandLineRunner {

    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final SellerRepository sellerRepository;
    private final OrderRepository orderRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.email:admin@HYPERKART.com}")
    private String adminEmail;

    @Value("${app.admin.password:AdminPassword123!}")
    private String adminPassword;

    public DemoDataSeeder(ProductRepository productRepository, 
                           UserRepository userRepository, 
                           SellerRepository sellerRepository,
                           OrderRepository orderRepository,
                           PasswordEncoder passwordEncoder) {
        this.productRepository = productRepository;
        this.userRepository = userRepository;
        this.sellerRepository = sellerRepository;
        this.orderRepository = orderRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * Restores complete demo sellers, catalog products, and sample orders on startup.
     */
    @Override
    public void run(String... args) throws Exception {
        // 1. Ensure single designated admin user account exists
        User adminUser = userRepository.findByEmail(adminEmail).orElse(null);
        if (adminUser == null) {
            adminUser = User.builder()
                    .name("System Administrator")
                    .email(adminEmail)
                    .password(passwordEncoder.encode(adminPassword))
                    .role("ADMIN")
                    .build();
        } else {
            adminUser.setPassword(passwordEncoder.encode(adminPassword));
            adminUser.setRole("ADMIN");
        }
        adminUser = userRepository.save(adminUser);

        // Seed Default Demo Buyer Account
        String buyerEmail = "buyer@HYPERKART.com";
        User demoBuyer = userRepository.findByEmail(buyerEmail).orElse(null);
        if (demoBuyer == null) {
            demoBuyer = User.builder()
                    .name("Demo Customer")
                    .email(buyerEmail)
                    .password(passwordEncoder.encode("Password123!"))
                    .role("BUYER")
                    .build();
            userRepository.save(demoBuyer);
        } else {
            demoBuyer.setPassword(passwordEncoder.encode("Password123!"));
            userRepository.save(demoBuyer);
        }

        // Seed Default Demo Delivery Driver Account
        String driverEmail = "driver@HYPERKART.com";
        User demoDriver = userRepository.findByEmail(driverEmail).orElse(null);
        if (demoDriver == null) {
            demoDriver = User.builder()
                    .name("Rajesh Delivery Driver")
                    .email(driverEmail)
                    .password(passwordEncoder.encode("Password123!"))
                    .role("DRIVER")
                    .build();
            userRepository.save(demoDriver);
        } else {
            demoDriver.setPassword(passwordEncoder.encode("Password123!"));
            userRepository.save(demoDriver);
        }

        // 2. Initialize Seller 1 User & Shop Profile
        String seller1Email = "john.doe@gmail.com";
        User seller1 = userRepository.findByEmail(seller1Email).orElse(null);
        if (seller1 == null) {
            seller1 = User.builder()
                    .name("john doe")
                    .email(seller1Email)
                    .password(passwordEncoder.encode("Password123!"))
                    .role("SELLER")
                    .build();
            seller1 = userRepository.save(seller1);
        }

        Seller s1 = sellerRepository.findByUserId(seller1.getId())
                .orElseGet(() -> sellerRepository.findById("seller-chawla").orElse(null));
        if (s1 == null) {
            s1 = Seller.builder()
                    .id("seller-chawla")
                    .userId(seller1.getId())
                    .shopName("Chawla Kiryana Store")
                    .description("Your neighborhood grocer for fresh foods, spices, grains, and daily essentials.")
                    .address("VIP Road, Zirakpur, Punjab")
                    .phone("9876543210")
                    .location(new GeoJsonPoint(76.822, 30.665))
                    .active(true)
                    .status("APPROVED")
                    .build();
        } else {
            s1.setUserId(seller1.getId());
            s1.setStatus("APPROVED");
            s1.setActive(true);
            if (s1.getLocation() == null) {
                s1.setLocation(new GeoJsonPoint(76.822, 30.665));
            }
        }
        try {
            sellerRepository.save(s1);
        } catch (Exception e) {
            // Ignore duplicate key if already present
        }

        // 3. Initialize Seller 2 User & Shop Profile
        String seller2Email = "johnndoe@gmail.com";
        User seller2 = userRepository.findByEmail(seller2Email).orElse(null);
        if (seller2 == null) {
            seller2 = User.builder()
                    .name("john")
                    .email(seller2Email)
                    .password(passwordEncoder.encode("Password123!"))
                    .role("SELLER")
                    .build();
            seller2 = userRepository.save(seller2);
        }

        Seller s2 = sellerRepository.findByUserId(seller2.getId())
                .orElseGet(() -> sellerRepository.findById("seller-fresh").orElse(null));
        if (s2 == null) {
            s2 = Seller.builder()
                    .id("seller-fresh")
                    .userId(seller2.getId())
                    .shopName("Zirakpur Fresh Mart")
                    .description("Local organic farm produce, fresh fruits, vegetables, and daily dairy items.")
                    .address("Ambala Chandigarh Expressway, Zirakpur")
                    .phone("9876543211")
                    .location(new GeoJsonPoint(76.825, 30.655))
                    .active(true)
                    .status("APPROVED")
                    .build();
        } else {
            s2.setUserId(seller2.getId());
            s2.setStatus("APPROVED");
            s2.setActive(true);
            if (s2.getLocation() == null) {
                s2.setLocation(new GeoJsonPoint(76.825, 30.655));
            }
        }
        try {
            sellerRepository.save(s2);
        } catch (Exception e) {
            // Ignore duplicate key if already present
        }

        // 4. Initialize Seller 3 User & Pharmacy Shop Profile
        String seller3Email = "medplus.seller@gmail.com";
        User seller3 = userRepository.findByEmail(seller3Email).orElse(null);
        if (seller3 == null) {
            seller3 = User.builder()
                    .name("MedPlus Seller")
                    .email(seller3Email)
                    .password(passwordEncoder.encode("Password123!"))
                    .role("SELLER")
                    .build();
            seller3 = userRepository.save(seller3);
        }

        Seller s3 = sellerRepository.findByUserId(seller3.getId())
                .orElseGet(() -> sellerRepository.findById("seller-medplus").orElse(null));
        if (s3 == null) {
            s3 = Seller.builder()
                    .id("seller-medplus")
                    .userId(seller3.getId())
                    .shopName("Zirakpur MedPlus Pharmacy")
                    .description("Open 24/7 • Prescription medicines, health supplements, and medical supplies.")
                    .address("Sector 4 Main Road, Zirakpur")
                    .phone("9876543212")
                    .location(new GeoJsonPoint(76.818, 30.668))
                    .active(true)
                    .status("APPROVED")
                    .build();
        } else {
            s3.setUserId(seller3.getId());
            s3.setStatus("APPROVED");
            s3.setActive(true);
            if (s3.getLocation() == null) {
                s3.setLocation(new GeoJsonPoint(76.818, 30.668));
            }
        }
        try {
            sellerRepository.save(s3);
        } catch (Exception e) {
            // Ignore duplicate key if already present
        }

        // 5. Initialize Seller 4 User & Apparel Shop Profile
        String seller4Email = "trendz.seller@gmail.com";
        User seller4 = userRepository.findByEmail(seller4Email).orElse(null);
        if (seller4 == null) {
            seller4 = User.builder()
                    .name("Trendz Seller")
                    .email(seller4Email)
                    .password(passwordEncoder.encode("Password123!"))
                    .role("SELLER")
                    .build();
            seller4 = userRepository.save(seller4);
        }

        Seller s4 = sellerRepository.findByUserId(seller4.getId())
                .orElseGet(() -> sellerRepository.findById("seller-trendz").orElse(null));
        if (s4 == null) {
            s4 = Seller.builder()
                    .id("seller-trendz")
                    .userId(seller4.getId())
                    .shopName("Trendz Apparel Boutique")
                    .description("Latest fashion styles, summer cotton wear, and custom boutique apparel.")
                    .address("Elante Plaza, Zirakpur")
                    .phone("9876543213")
                    .location(new GeoJsonPoint(76.814, 30.663))
                    .active(true)
                    .status("APPROVED")
                    .build();
        } else {
            s4.setUserId(seller4.getId());
            s4.setStatus("APPROVED");
            s4.setActive(true);
            if (s4.getLocation() == null) {
                s4.setLocation(new GeoJsonPoint(76.814, 30.663));
            }
        }
        try {
            sellerRepository.save(s4);
        } catch (Exception e) {
            // Ignore duplicate key if already present
        }

        // 6. Seed/Update Products Catalog with normal market prices
        productRepository.deleteAll(); // Force refresh to update catalog prices
        List<Product> demo = List.of(
                Product.builder().sellerId("seller-chawla").name("Fresh Apples").description("Crisp local apples per kg").category("Fruits").price(120.00).stock(50).imageUrl("https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=600&q=80").active(true).build(),
                Product.builder().sellerId("seller-chawla").name("Organic Milk 1L").description("1L fresh organic dairy milk").category("Dairy").price(65.00).stock(30).imageUrl("https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=600&q=80").active(true).build(),
                Product.builder().sellerId("seller-chawla").name("Brown Whole Wheat Bread").description("Freshly baked wholegrain loaf").category("Bakery").price(45.00).stock(20).imageUrl("https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80").active(true).build(),
                Product.builder().sellerId("seller-chawla").name("Premium Cashew Nuts 250g").description("Roasted crunchy cashews").category("Snacks").price(280.00).stock(25).imageUrl("https://images.unsplash.com/photo-1509358271058-acd01cc9386a?auto=format&fit=crop&w=600&q=80").active(true).build(),
                Product.builder().sellerId("seller-fresh").name("Farm Fresh Tomatoes 1kg").description("Fresh juicy tomatoes per kg").category("Vegetables").price(40.00).stock(40).imageUrl("https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=600&q=80").active(true).build(),
                Product.builder().sellerId("seller-fresh").name("Organic Eggs (Pack of 6)").description("Free-range eggs, pack of 6").category("Grocery").price(54.00).stock(60).imageUrl("https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&w=600&q=80").active(true).build(),
                Product.builder().sellerId("seller-fresh").name("Fresh Orange Juice 1L").description("100% natural cold pressed juice").category("Beverages").price(110.00).stock(35).imageUrl("https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=600&q=80").active(true).build(),
                Product.builder().sellerId("seller-medplus").name("Paracetamol 500mg Tablets").description("Pain relief medication, strip of 10").category("Pharmacy").price(30.00).stock(100).imageUrl("https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80").active(true).build(),
                Product.builder().sellerId("seller-trendz").name("Cotton Summer T-Shirt").description("100% breathable cotton casual wear").category("Apparel").price(499.00).stock(15).imageUrl("https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80").active(true).build()
        );
        productRepository.saveAll(demo);
        System.out.println("Restored inventory catalog with normal market rates: seeded " + demo.size() + " products.");

        // 7. Seed Claimable Delivery Packages for Delivery Partners
        if (orderRepository.count() == 0) {
            Order o1 = Order.builder()
                    .id("demo-order-101")
                    .buyerId(adminUser.getId())
                    .sellerId("seller-chawla")
                    .items(List.of(
                            Order.OrderItem.builder().productId("p1").productName("Fresh Apples").quantity(2).unitPrice(1.99).build(),
                            Order.OrderItem.builder().productId("p2").productName("Organic Milk 1L").quantity(1).unitPrice(0.99).build()
                    ))
                    .totalAmount(9.97)
                    .status("CONFIRMED")
                    .deliveryAddress("Flat 402, Royal Palms, VIP Road, Zirakpur")
                    .paymentMethod("COD")
                    .paymentStatus("PENDING")
                    .deliveryOtp("8492")
                    .deliveryFee(5.00)
                    .createdAt(Instant.now())
                    .updatedAt(Instant.now())
                    .build();

            Order o2 = Order.builder()
                    .id("demo-order-102")
                    .buyerId(adminUser.getId())
                    .sellerId("seller-fresh")
                    .items(List.of(
                            Order.OrderItem.builder().productId("p4").productName("Farm Fresh Tomatoes 1kg").quantity(1).unitPrice(2.49).build(),
                            Order.OrderItem.builder().productId("p5").productName("Organic Eggs (Pack of 6)").quantity(2).unitPrice(1.79).build()
                    ))
                    .totalAmount(11.07)
                    .status("CONFIRMED")
                    .deliveryAddress("House 12B, Sector 4, Zirakpur")
                    .paymentMethod("UPI")
                    .paymentStatus("PAID")
                    .deliveryOtp("1234")
                    .deliveryFee(5.00)
                    .createdAt(Instant.now())
                    .updatedAt(Instant.now())
                    .build();

            Order o3 = Order.builder()
                    .id("demo-order-103")
                    .buyerId(adminUser.getId())
                    .sellerId("seller-trendz")
                    .items(List.of(
                            Order.OrderItem.builder().productId("p9").productName("Cotton Summer T-Shirt").quantity(1).unitPrice(14.99).build()
                    ))
                    .totalAmount(19.99)
                    .status("CONFIRMED")
                    .deliveryAddress("Villa 89, Green Enclave, Zirakpur")
                    .paymentMethod("CARD")
                    .paymentStatus("PAID")
                    .deliveryOtp("5678")
                    .deliveryFee(5.00)
                    .createdAt(Instant.now())
                    .updatedAt(Instant.now())
                    .build();

            orderRepository.saveAll(List.of(o1, o2, o3));
            System.out.println("Restored claimable delivery packages for Delivery Partners.");
        }
    }
}
