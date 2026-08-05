package com.example.demo.auth;

import com.example.demo.seller.Seller;
import com.example.demo.seller.SellerRepository;
import com.example.demo.user.User;
import com.example.demo.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Demo Data Initializer
 * =====================
 * Pre-seeds default test accounts for Admin, Seller, Driver, and Buyer roles
 * with BCrypt encrypted passwords on application startup.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final SellerRepository sellerRepository;
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

        // 2. Seed Seller Account
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
        userRepository.save(sellerUser);
        log.info("Seeded Seller Account: john.doe@gmail.com / Password123!");

        // 3. Seed Driver Account
        String driverEmail = "driver@hyperkart.com";
        User driver = userRepository.findByEmailIgnoreCase(driverEmail)
                .orElseGet(() -> userRepository.findByEmailIgnoreCase("driver@HYPERKART.com").orElse(null));
        if (driver == null) {
            driver = User.builder()
                    .name("Rajesh Express Driver")
                    .email(driverEmail)
                    .password(defaultPass)
                    .role("DRIVER")
                    .provider("LOCAL")
                    .forceLoggedOut(false)
                    .build();
        } else {
            driver.setEmail(driverEmail);
            driver.setPassword(defaultPass);
            driver.setRole("DRIVER");
        }
        userRepository.save(driver);
        log.info("Seeded Driver Account: driver@hyperkart.com / Password123!");

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

        log.info("Demo accounts initialized successfully! All default passwords set to 'Password123!'");
    }
}
