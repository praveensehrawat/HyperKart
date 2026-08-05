package com.example.demo.auth;

import com.example.demo.user.User;
import com.example.demo.user.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Spring Security Custom User Details Service
 * ===========================================
 * Adapts MongoDB user entity records to the Spring Security UserDetails runtime specifications.
 * Enforces single designated system administrator authority restrictions.
 */
@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Value("${app.admin.email:admin@HYPERKART.com}")
    private String adminEmail;

    public CustomUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /**
     * Retrieves a user profile by email and maps registered roles to simple security authorities.
     * Enforces that ROLE_ADMIN is granted ONLY to the single designated administrator email.
     *
     * @param email unique email address username identifier
     * @return UserDetails profile representation
     * @throws UsernameNotFoundException if no user profile is registered under the given email
     */
    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));

        String userRole = user.getRole() != null ? user.getRole().toUpperCase() : "BUYER";
        
        // Single admin restriction: ROLE_ADMIN authority is strictly reserved for the designated admin email
        if ("ADMIN".equals(userRole)) {
            if (!user.getEmail().equalsIgnoreCase(adminEmail)) {
                // Downgrade any non-designated admin user to BUYER
                userRole = "BUYER";
            }
        }

        return new org.springframework.security.core.userdetails.User(
                user.getEmail(),
                user.getPassword() != null ? user.getPassword() : "[SOCIAL_AUTH]",
                List.of(new SimpleGrantedAuthority("ROLE_" + userRole))
        );
    }
}

