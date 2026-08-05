package com.example.demo.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Social Authentication Request DTO
 * =================================
 * Holds payload parameters sent during Google or Facebook single sign-on requests.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SocialAuthRequest {
    private String provider; // "GOOGLE" or "FACEBOOK"
    private String providerId; // Provider specific user id
    private String email;
    private String name;
    private String avatarUrl;
    private String role; // BUYER, SELLER, DRIVER
    private String token; // ID Token or Access Token from provider SDK
}
