package com.example.demo.user;

import com.example.demo.auth.dto.AuthResponse;
import com.example.demo.auth.dto.LoginRequest;
import com.example.demo.auth.dto.RegisterRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

/**
 * User Account Operations Service
 * ==============================
 * Handles register signup checks, updates credentials passwords hash keys,
 * and checks login verifications.
 */
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final com.example.demo.auth.JwtService jwtService;
    private final com.example.demo.auth.CustomUserDetailsService userDetailsService;

    /**
     * Registers a new user account profile. Encodes credentials passwords using BCrypt.
     * Generates a signed JWT session token.
     *
     * @param request signup metadata fields
     * @return credentials payload container
     */
    /**
     * Registers a new user account profile. Encodes credentials passwords using BCrypt.
     * Generates a signed JWT session token and records client IP address.
     */
    public AuthResponse register(RegisterRequest request, String ipAddress) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email already registered");
        }

        String role = request.getRole() != null ? request.getRole().toUpperCase() : "BUYER";
        if (role.equals("ADMIN")) {
            throw new IllegalArgumentException("Registration with ADMIN role is not permitted.");
        }
        if (!role.equals("BUYER") && !role.equals("SELLER") && !role.equals("DRIVER")) {
            throw new IllegalArgumentException("Role must be BUYER, SELLER or DRIVER");
        }

        String now = java.time.format.DateTimeFormatter.ISO_INSTANT.format(java.time.Instant.now());
        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(role)
                .lastLoginIp(ipAddress != null ? ipAddress : "127.0.0.1")
                .lastLoginAt(now)
                .forceLoggedOut(false)
                .build();

        user = userRepository.save(user);
        String token = jwtService.generateToken(userDetailsService.loadUserByUsername(user.getEmail()));

        return AuthResponse.builder()
                .token(token)
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .build();
    }

    /**
     * Checks credentials verifications against authentication managers.
     * Generates signed JWT session tokens and updates client IP address.
     */
    public AuthResponse login(LoginRequest request, String ipAddress) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("Invalid credentials"));

        String now = java.time.format.DateTimeFormatter.ISO_INSTANT.format(java.time.Instant.now());
        user.setLastLoginIp(ipAddress != null ? ipAddress : "127.0.0.1");
        user.setLastLoginAt(now);
        user.setForceLoggedOut(false);
        userRepository.save(user);

        String token = jwtService.generateToken(userDetailsService.loadUserByUsername(user.getEmail()));

        return AuthResponse.builder()
                .token(token)
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .provider(user.getProvider())
                .avatarUrl(user.getAvatarUrl())
                .build();
    }

    /**
     * Authenticates or auto-registers a user signing in via Google or Facebook.
     */
    public AuthResponse socialLogin(com.example.demo.auth.dto.SocialAuthRequest request, String ipAddress) {
        String email = request.getEmail();
        if (email == null || email.trim().isEmpty()) {
            throw new IllegalArgumentException("Social authentication failed: Email address is required from provider.");
        }

        String provider = request.getProvider() != null ? request.getProvider().toUpperCase() : "GOOGLE";
        String role = request.getRole() != null ? request.getRole().toUpperCase() : "BUYER";
        if (role.equals("ADMIN")) {
            role = "BUYER";
        }

        String now = java.time.format.DateTimeFormatter.ISO_INSTANT.format(java.time.Instant.now());

        User user = userRepository.findByEmail(email.trim()).orElse(null);

        if (user == null) {
            // New user registration via Social Login
            user = User.builder()
                    .name(request.getName() != null && !request.getName().isBlank() ? request.getName() : email.split("@")[0])
                    .email(email.trim())
                    .password(null) // No local password for social accounts
                    .role(role)
                    .provider(provider)
                    .providerId(request.getProviderId())
                    .avatarUrl(request.getAvatarUrl())
                    .lastLoginIp(ipAddress != null ? ipAddress : "127.0.0.1")
                    .lastLoginAt(now)
                    .forceLoggedOut(false)
                    .build();
        } else {
            // Existing user login
            if (user.isForceLoggedOut()) {
                throw new IllegalArgumentException("Your session has been terminated by System Administrator.");
            }
            user.setLastLoginIp(ipAddress != null ? ipAddress : "127.0.0.1");
            user.setLastLoginAt(now);
            user.setForceLoggedOut(false);
            if (request.getAvatarUrl() != null && !request.getAvatarUrl().isBlank()) {
                user.setAvatarUrl(request.getAvatarUrl());
            }
            if (user.getProviderId() == null) {
                user.setProviderId(request.getProviderId());
            }
        }

        user = userRepository.save(user);

        String token = jwtService.generateToken(userDetailsService.loadUserByUsername(user.getEmail()));

        return AuthResponse.builder()
                .token(token)
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .provider(user.getProvider())
                .avatarUrl(user.getAvatarUrl())
                .build();
    }

    /**
     * Looks up user profile by email index.
     */
    public User findByEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        if (user.isForceLoggedOut()) {
            throw new IllegalArgumentException("Your session has been terminated by System Administrator. Please login again.");
        }
        return user;
    }

    /**
     * Retrieves all registered user accounts for System Administrator directory.
     */
    public java.util.List<User> findAllUsers() {
        return userRepository.findAll();
    }

    /**
     * Forces immediate account logout by toggling forceLoggedOut flag.
     */
    public User forceLogoutUser(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
        user.setForceLoggedOut(true);
        return userRepository.save(user);
    }

    /**
     * Deletes a registered account from database.
     */
    public void deleteUser(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
        if ("ADMIN".equals(user.getRole())) {
            throw new IllegalArgumentException("Cannot delete designated System Administrator account");
        }
        userRepository.deleteById(userId);
    }

    /**
     * Resets password for any user account (BUYER, SELLER, DRIVER, ADMIN).
     */
    public void resetPassword(String email, String newPassword) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("No account registered with email: " + email));
        if (newPassword == null || newPassword.trim().length() < 6) {
            throw new IllegalArgumentException("New password must be at least 6 characters long.");
        }
        user.setPassword(passwordEncoder.encode(newPassword.trim()));
        user.setForceLoggedOut(false);
        userRepository.save(user);
    }
}
