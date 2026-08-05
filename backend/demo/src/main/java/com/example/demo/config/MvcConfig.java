package com.example.demo.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Spring MVC Static Resource Configuration
 * ========================================
 * Maps public web requests for /uploads/** to the server's local file storage uploads directory.
 */
@Configuration
public class MvcConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Map uploads URL to file system path
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:uploads/");
    }
}
