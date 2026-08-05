package com.example.demo.auth;

import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Collection;
import java.util.Collections;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class JwtServiceTest {

    private JwtService jwtService;

    @Mock
    private UserDetails userDetails;

    private final String SECRET = "test-secret-key-for-jwt-testing-min-256-bits";
    private final long EXPIRATION = 86400000L;
    private final String EMAIL = "test@example.com";

    @BeforeEach
    void setUp() {
        jwtService = new JwtService();
        ReflectionTestUtils.setField(jwtService, "secret", SECRET);
        ReflectionTestUtils.setField(jwtService, "expirationMs", EXPIRATION);
    }

    private void mockUserDetails() {
        when(userDetails.getUsername()).thenReturn(EMAIL);
        Collection<? extends GrantedAuthority> authorities = Collections.singleton(new SimpleGrantedAuthority("ROLE_BUYER"));
        when((Collection<GrantedAuthority>) userDetails.getAuthorities()).thenReturn((Collection) authorities);
    }

    @Test
    @DisplayName("generateToken should create a valid token")
    void generateToken_shouldCreateValidToken() {
        mockUserDetails();
        String token = jwtService.generateToken(userDetails);
        assertThat(token).isNotNull().isNotEmpty();
    }

    @Test
    @DisplayName("extractUsername should return correct email")
    void extractUsername_shouldReturnCorrectEmail() {
        mockUserDetails();
        String token = jwtService.generateToken(userDetails);
        String username = jwtService.extractUsername(token);
        assertThat(username).isEqualTo(EMAIL);
    }

    @Test
    @DisplayName("isTokenValid should return true for valid token")
    void isTokenValid_shouldReturnTrueForValidToken() {
        mockUserDetails();
        String token = jwtService.generateToken(userDetails);
        boolean isValid = jwtService.isTokenValid(token, userDetails);
        assertThat(isValid).isTrue();
    }

    @Test
    @DisplayName("isTokenValid should return false for wrong user")
    void isTokenValid_shouldReturnFalseForWrongUser() {
        mockUserDetails();
        String token = jwtService.generateToken(userDetails);
        
        UserDetails wrongUser = org.mockito.Mockito.mock(UserDetails.class);
        when(wrongUser.getUsername()).thenReturn("wrong@example.com");
        
        boolean isValid = jwtService.isTokenValid(token, wrongUser);
        assertThat(isValid).isFalse();
    }

    @Test
    @DisplayName("Token with expired time should be invalid")
    void isTokenExpired_shouldThrowExceptionOrBeInvalid() {
        mockUserDetails();
        ReflectionTestUtils.setField(jwtService, "expirationMs", -1000L); // Negative expiration
        String expiredToken = jwtService.generateToken(userDetails);
        
        assertThrows(io.jsonwebtoken.ExpiredJwtException.class, () -> {
            jwtService.isTokenValid(expiredToken, userDetails);
        });
    }
}
