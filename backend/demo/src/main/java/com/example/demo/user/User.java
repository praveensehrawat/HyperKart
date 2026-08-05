package com.example.demo.user;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import com.fasterxml.jackson.annotation.JsonIgnore;

/**
 * User Account Entity Document
 * ============================
 * Document storage mapper storing credentials profiles, emails, and account role tags.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "users")
public class User {

    @Id
    private String id;

    private String name;
    
    @Indexed(unique = true)
    private String email;
    
    @JsonIgnore
    private String password;
    private String role; // e.g. BUYER, SELLER, DRIVER, ADMIN
    @Builder.Default
    private String provider = "LOCAL"; // LOCAL, GOOGLE, FACEBOOK
    private String providerId;
    private String avatarUrl;
    private String lastLoginIp;
    private String lastLoginAt;
    @Builder.Default
    private boolean forceLoggedOut = false;
}
