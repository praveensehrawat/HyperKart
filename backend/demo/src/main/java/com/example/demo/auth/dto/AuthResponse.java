package com.example.demo.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Authentication Response Data Object
 * ===================================
 * Summarizes session parameters returned to user post registration or login.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {
    // Session authorization JWT token string
    private String token;
    // Profile unique identifier
    private String id;
    // User profile full name
    private String name;
    // Profile email address username
    private String email;
    // User account system role
    private String role;
    // Authentication provider (LOCAL, GOOGLE, FACEBOOK)
    private String provider;
    // User profile avatar URL
    private String avatarUrl;
}
