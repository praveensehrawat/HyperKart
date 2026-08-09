package com.example.demo.common;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

/**
 * Global HTTP REST Exception Interceptor Advice
 * ============================================
 * Intercepts thrown application runtime exceptions, validation constraints errors,
 * and security authorization failures, returning clean, standardized HTTP JSON error responses.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * Intercepts DTO validation failures (@Valid constraints on request bodies).
     *
     * @return 400 Bad Request payload with detailed field validation messages
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationExceptions(MethodArgumentNotValidException ex) {
        Map<String, String> fieldErrors = new HashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(error ->
                fieldErrors.put(error.getField(), error.getDefaultMessage())
        );

        String primaryError = fieldErrors.isEmpty() ? "Validation failed" : fieldErrors.values().iterator().next();

        Map<String, Object> response = new HashMap<>();
        response.put("error", primaryError);
        response.put("fieldErrors", fieldErrors);

        return ResponseEntity.badRequest().body(response);
    }

    /**
     * Intercepts business logic validation failures and illegal arguments.
     *
     * @return 400 Bad Request payload
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleIllegalArgument(IllegalArgumentException ex) {
        return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
    }

    /**
     * Intercepts authentication credential validation failures.
     *
     * @return 401 Unauthorized payload
     */
    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<Map<String, String>> handleBadCredentials(BadCredentialsException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("error", "Invalid email or password credentials"));
    }

    /**
     * Intercepts unauthorized security permission failures.
     *
     * @return 403 Forbidden payload
     */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, String>> handleAccessDenied(AccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("error", "Access denied: You do not possess required permissions for this operation"));
    }

    /**
     * Intercepts MongoDB database connection failures and timeouts cleanly.
     *
     * @return 503 Service Unavailable payload
     */
    @ExceptionHandler({org.springframework.dao.DataAccessException.class, com.mongodb.MongoException.class})
    public ResponseEntity<Map<String, String>> handleDatabaseException(Exception ex) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Map.of("error", "Database connection issue. Connecting to MongoDB Atlas cloud instance, please retry in a few seconds."));
    }

    /**
     * Catches generic unhandled runtime errors.
     *
     * @return 500 Internal Server Error payload
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleGeneric(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", ex.getMessage() != null ? ex.getMessage() : "Internal server error"));
    }
}
