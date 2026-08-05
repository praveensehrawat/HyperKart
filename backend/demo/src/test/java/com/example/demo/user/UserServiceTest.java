package com.example.demo.user;

import com.example.demo.auth.CustomUserDetailsService;
import com.example.demo.auth.JwtService;
import com.example.demo.auth.dto.LoginRequest;
import com.example.demo.auth.dto.RegisterRequest;
import com.example.demo.auth.dto.AuthResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private JwtService jwtService;

    @Mock
    private CustomUserDetailsService userDetailsService;

    @InjectMocks
    private UserService userService;

    private User testUser;
    private RegisterRequest registerRequest;
    private LoginRequest loginRequest;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id("user-1")
                .name("Test User")
                .email("test@example.com")
                .password("encoded-password")
                .role("BUYER")
                .forceLoggedOut(false)
                .build();

        registerRequest = new RegisterRequest();
        registerRequest.setName("Test User");
        registerRequest.setEmail("test@example.com");
        registerRequest.setPassword("password123");
        registerRequest.setRole("BUYER");

        loginRequest = new LoginRequest();
        loginRequest.setEmail("test@example.com");
        loginRequest.setPassword("password123");
    }

    @Test
    @DisplayName("Should successfully register a new user")
    void register_Success() {
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("encoded-password");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId("user-1");
            return u;
        });

        UserDetails userDetails = mock(UserDetails.class);
        when(userDetailsService.loadUserByUsername(anyString())).thenReturn(userDetails);
        when(jwtService.generateToken(any(UserDetails.class))).thenReturn("jwt-token");

        AuthResponse response = userService.register(registerRequest, "127.0.0.1");

        assertThat(response).isNotNull();
        assertThat(response.getToken()).isEqualTo("jwt-token");
        assertThat(response.getId()).isEqualTo("user-1");

        verify(userRepository).save(any(User.class));
    }

    @Test
    @DisplayName("Should throw exception when registering with existing email")
    void register_ExistingEmail() {
        when(userRepository.existsByEmail(anyString())).thenReturn(true);

        assertThrows(IllegalArgumentException.class, () -> userService.register(registerRequest, "127.0.0.1"));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("Should throw exception when registering as ADMIN")
    void register_AdminRole() {
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        registerRequest.setRole("ADMIN");

        assertThrows(IllegalArgumentException.class, () -> userService.register(registerRequest, "127.0.0.1"));
    }

    @Test
    @DisplayName("Should throw exception when registering with invalid role")
    void register_InvalidRole() {
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        registerRequest.setRole("INVALID");

        assertThrows(IllegalArgumentException.class, () -> userService.register(registerRequest, "127.0.0.1"));
    }

    @Test
    @DisplayName("Should successfully login")
    void login_Success() {
        UserDetails userDetails = mock(UserDetails.class);
        when(userRepository.findByEmail(anyString())).thenReturn(Optional.of(testUser));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(userDetailsService.loadUserByUsername(anyString())).thenReturn(userDetails);
        when(jwtService.generateToken(any(UserDetails.class))).thenReturn("jwt-token");

        AuthResponse response = userService.login(loginRequest, "127.0.0.1");

        assertThat(response).isNotNull();
        assertThat(response.getToken()).isEqualTo("jwt-token");
        verify(authenticationManager).authenticate(any(UsernamePasswordAuthenticationToken.class));
        verify(userRepository).save(any(User.class));
    }

    @Test
    @DisplayName("Should successfully find user by email")
    void findByEmail_Success() {
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));

        User foundUser = userService.findByEmail("test@example.com");

        assertThat(foundUser).isNotNull();
        assertThat(foundUser.getEmail()).isEqualTo("test@example.com");
    }

    @Test
    @DisplayName("Should throw exception when finding non-existent user")
    void findByEmail_NotFound() {
        when(userRepository.findByEmail("unknown@example.com")).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> userService.findByEmail("unknown@example.com"));
    }

    @Test
    @DisplayName("Should throw exception when finding force-logged-out user")
    void findByEmail_ForceLoggedOut() {
        testUser.setForceLoggedOut(true);
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));

        assertThrows(IllegalArgumentException.class, () -> userService.findByEmail("test@example.com"));
    }

    @Test
    @DisplayName("Should successfully force logout user")
    void forceLogoutUser_Success() {
        when(userRepository.findById("user-1")).thenReturn(Optional.of(testUser));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        userService.forceLogoutUser("user-1");

        assertThat(testUser.isForceLoggedOut()).isTrue();
        verify(userRepository).save(testUser);
    }

    @Test
    @DisplayName("Should delete user unless user is ADMIN")
    void deleteUser_Success() {
        when(userRepository.findById("user-1")).thenReturn(Optional.of(testUser));

        userService.deleteUser("user-1");

        verify(userRepository).deleteById("user-1");
    }

    @Test
    @DisplayName("Should throw exception when trying to delete ADMIN")
    void deleteUser_Admin() {
        testUser.setRole("ADMIN");
        when(userRepository.findById("user-1")).thenReturn(Optional.of(testUser));

        assertThrows(IllegalArgumentException.class, () -> userService.deleteUser("user-1"));
        verify(userRepository, never()).deleteById(anyString());
    }
}
