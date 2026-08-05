package com.example.demo.config;

import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Configuration;

/**
 * Cache Configuration
 * ===================
 * Bootstraps local cache manager engines in the application runtime.
 * Enables annotation-driven cache management (e.g. @Cacheable, @CacheEvict).
 */
@Configuration
@EnableCaching
public class CacheConfig {
}
