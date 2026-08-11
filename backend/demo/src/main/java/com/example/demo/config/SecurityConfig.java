package com.example.demo.config;

import com.example.demo.auth.JwtAuthFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import com.example.demo.auth.AdminTokenFilter;

import java.util.List;

/**
 * Web Security Configuration
 * ==========================
 * Configures spring security filter chain policies, routes access permissions,
 * CORS integration settings, authentication manager beans, and password encoders.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final AdminTokenFilter adminTokenFilter;

    @Value("${cors.allowed-origins}")
    private String allowedOrigins;

    /**
     * Constructs and defines security policies on HTTP endpoints.
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // Permit all OPTIONS preflight requests
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        // Frontend static assets, uploads and SPA routes
                        .requestMatchers("/", "/index.html", "/favicon.svg", "/icons.svg", "/assets/**", "/uploads/**").permitAll()
                        .requestMatchers("/login", "/register", "/products", "/sellers", "/cart",
                                         "/checkout", "/orders", "/ai", "/seller-dashboard", "/admin", "/admin-dashboard").permitAll()
                        // Public authentication and health checks
                        .requestMatchers("/api/auth/**", "/api/health", "/api/users/test").permitAll()
                        
                        // Strict endpoints for Administrators
                        .requestMatchers("/api/users/all").hasRole("ADMIN")
                        .requestMatchers("/api/users/*/force-logout").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/users/*").hasRole("ADMIN")
                        .requestMatchers("/api/sellers/pending").hasRole("ADMIN")
                        .requestMatchers("/api/sellers/*/approve").hasRole("ADMIN")
                        .requestMatchers("/api/orders/admin/all").hasRole("ADMIN")
                        .requestMatchers("/api/wallet/admin/**").hasRole("ADMIN")
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")

                        // Endpoints for Drivers
                        .requestMatchers("/api/orders/*/claim").hasAnyRole("DRIVER", "ADMIN")
                        .requestMatchers("/api/orders/*/driver-location").hasAnyRole("DRIVER", "ADMIN")
                        .requestMatchers("/api/orders/*/deliver").hasAnyRole("DRIVER", "ADMIN")
                        .requestMatchers("/api/orders/*/verify-otp").hasAnyRole("DRIVER", "ADMIN")
                        .requestMatchers("/api/orders/pending-delivery").hasAnyRole("DRIVER", "ADMIN")
                        .requestMatchers("/api/orders/driver/active").hasAnyRole("DRIVER", "ADMIN")
                        .requestMatchers("/api/wallet/driver/**").hasAnyRole("DRIVER", "ADMIN")

                        // Endpoints for Sellers
                        .requestMatchers(HttpMethod.POST, "/api/upload/**").hasAnyRole("SELLER", "ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/products/**").hasAnyRole("SELLER", "ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/products/**").hasAnyRole("SELLER", "ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/products/**").hasAnyRole("SELLER", "ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/sellers/**").hasAnyRole("SELLER", "ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/sellers/**").hasAnyRole("SELLER", "ADMIN")

                        // Public queries (GET products / sellers / AI recommendations / reviews)
                        .requestMatchers(HttpMethod.GET, "/api/products/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/sellers/nearby").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/sellers/*").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/sellers").permitAll()
                        .requestMatchers("/api/ai/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/reviews/**").permitAll()
                        
                        .requestMatchers("/api/pantry/**").permitAll()
                        .requestMatchers("/api/orders/sos").permitAll()
                        .requestMatchers("/api/grouppools/**").permitAll()
                        .requestMatchers("/api/public/**").permitAll()
                        .requestMatchers("/ws/**").permitAll()
                        .requestMatchers("/api/realtime/**").permitAll()
                        .anyRequest().authenticated()
                )
                // Filter chains: Process custom security filters before standard username-password auth filters
                .addFilterBefore(adminTokenFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    /**
     * Configures default CORS policy behaviors.
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(List.of("*"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    /**
     * BCrypt encoder strategy bean for user password hashing operations.
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(8);
    }

    /**
     * Standard authentication manager bean from configuration registry.
     */
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}
