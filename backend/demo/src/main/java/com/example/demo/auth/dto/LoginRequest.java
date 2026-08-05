package com.example.demo.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Login Request Data Object
 * =========================
 * Form validation schema mapping credentials verification requests.
 */
@Data
public class LoginRequest {
    @NotBlank 
    @Email
    private String email;
    
    @NotBlank
    private String password;
}
