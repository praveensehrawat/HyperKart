package com.example.demo.user;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

/**
 * User Repository Interface
 * =========================
 * MongoDB queries access definitions for user account entities.
 */
public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
}
