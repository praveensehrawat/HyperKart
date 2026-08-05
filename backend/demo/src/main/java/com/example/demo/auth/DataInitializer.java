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

        String defaultPass = passwordEncoder.encode("password123");

        // 1. Seed Admin Account
        if (userRepository.findByEmail("admin@HYPERKART.com").isEmpty()) {
            User admin = User.builder()
                    .name("System Administrator")
                    .email("admin@HYPERKART.com")
                    .password(defaultPass)
                    .role("ADMIN")
                    .provider("LOCAL")
                    .forceLoggedOut(false)
                    .build();
            userRepository.save(admin);
            log.info("Seeded Admin Account: admin@HYPERKART.com / password123");
        } else {
            // Update password to ensure password123 works
            User admin = userRepository.findByEmail("admin@HYPERKART.com").get();
            admin.setPassword(defaultPass);
            userRepository.save(admin);
        }

        // 2. Seed Seller Account
        User sellerUser;
        if (userRepository.findByEmail("john.doe@gmail.com").isEmpty()) {
            sellerUser = User.builder()
                    .name("John Doe")
                    .email("john.doe@gmail.com")
                    .password(defaultPass)
                    .role("SELLER")
                    .provider("LOCAL")
                    .forceLoggedOut(false)
                    .build();
            sellerUser = userRepository.save(sellerUser);
            log.info("Seeded Seller Account: john.doe@gmail.com / password123");
        } else {
            sellerUser = userRepository.findByEmail("john.doe@gmail.com").get();
            sellerUser.setPassword(defaultPass);
            sellerUser.setRole("SELLER");
            userRepository.save(sellerUser);
        }

        // 3. Seed Driver Account
        if (userRepository.findByEmail("driver@HYPERKART.com").isEmpty()) {
            User driver = User.builder()
                    .name("Rajesh Express Driver")
                    .email("driver@HYPERKART.com")
                    .password(defaultPass)
                    .role("DRIVER")
                    .provider("LOCAL")
                    .forceLoggedOut(false)
                    .build();
            userRepository.save(driver);
            log.info("Seeded Driver Account: driver@HYPERKART.com / password123");
        } else {
            User driver = userRepository.findByEmail("driver@HYPERKART.com").get();
            driver.setPassword(defaultPass);
            driver.setRole("DRIVER");
            userRepository.save(driver);
        }

        // 4. Seed Buyer Account
        if (userRepository.findByEmail("buyer@HYPERKART.com").isEmpty()) {
            User buyer = User.builder()
                    .name("Anita Kumar")
                    .email("buyer@HYPERKART.com")
                    .password(defaultPass)
                    .role("BUYER")
                    .provider("LOCAL")
                    .forceLoggedOut(false)
                    .build();
            userRepository.save(buyer);
            log.info("Seeded Buyer Account: buyer@HYPERKART.com / password123");
        } else {
            User buyer = userRepository.findByEmail("buyer@HYPERKART.com").get();
            buyer.setPassword(defaultPass);
            buyer.setRole("BUYER");
            userRepository.save(buyer);
        }

        log.info("Demo accounts initialized successfully! All passwords set to 'password123'");
    }
}
