package com.example.demo.auth;

import com.example.demo.auth.dto.AuthResponse;
import com.example.demo.auth.dto.LoginRequest;
import com.example.demo.auth.dto.RegisterRequest;
import com.example.demo.user.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Authentication REST Controller
 * ==============================
 * Exposes API routes to process account registrations and login request verifications.
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;

    private String getClientIp(HttpServletRequest request) {
        String xf = request.getHeader("X-Forwarded-For");
        if (xf != null && !xf.isEmpty()) {
            return xf.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    /**
     * Registers a new buyer or seller account.
     */
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request, HttpServletRequest servletRequest) {
        return ResponseEntity.ok(userService.register(request, getClientIp(servletRequest)));
    }

    /**
     * Verifies account credentials and generates login sessions.
     */
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request, HttpServletRequest servletRequest) {
        return ResponseEntity.ok(userService.login(request, getClientIp(servletRequest)));
    }

    /**
     * Authenticates or auto-registers users via Social providers (Google, Facebook).
     */
    @PostMapping("/social")
    public ResponseEntity<AuthResponse> socialLogin(@RequestBody com.example.demo.auth.dto.SocialAuthRequest request, HttpServletRequest servletRequest) {
        return ResponseEntity.ok(userService.socialLogin(request, getClientIp(servletRequest)));
    }

    /**
     * Google SSO login endpoint
     */
    @PostMapping("/google")
    public ResponseEntity<AuthResponse> googleLogin(@RequestBody com.example.demo.auth.dto.SocialAuthRequest request, HttpServletRequest servletRequest) {
        if (request.getProvider() == null || request.getProvider().isBlank()) {
            request.setProvider("GOOGLE");
        }
        return ResponseEntity.ok(userService.socialLogin(request, getClientIp(servletRequest)));
    }

    /**
     * Facebook SSO login endpoint
     */
    @PostMapping("/facebook")
    public ResponseEntity<AuthResponse> facebookLogin(@RequestBody com.example.demo.auth.dto.SocialAuthRequest request, HttpServletRequest servletRequest) {
        if (request.getProvider() == null || request.getProvider().isBlank()) {
            request.setProvider("FACEBOOK");
        }
        return ResponseEntity.ok(userService.socialLogin(request, getClientIp(servletRequest)));
    }

    /**
     * Verifies registered email address for password reset verification.
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<java.util.Map<String, String>> forgotPassword(@RequestBody java.util.Map<String, String> body) {
        String email = body.get("email");
        if (email == null || email.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", "Email is required"));
        }
        try {
            userService.findByEmail(email.trim());
            return ResponseEntity.ok(java.util.Map.of(
                "message", "Account email verified successfully.",
                "email", email.trim()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", e.getMessage()));
        }
    }

    /**
     * Resets account password for any role (BUYER, SELLER, DRIVER, ADMIN).
     */
    @PostMapping("/reset-password")
    public ResponseEntity<java.util.Map<String, String>> resetPassword(@RequestBody java.util.Map<String, String> body) {
        String email = body.get("email");
        String newPassword = body.get("newPassword");
        try {
            userService.resetPassword(email, newPassword);
            return ResponseEntity.ok(java.util.Map.of(
                "message", "Password successfully reset! You can now log in with your new password."
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", e.getMessage()));
        }
    }
}
