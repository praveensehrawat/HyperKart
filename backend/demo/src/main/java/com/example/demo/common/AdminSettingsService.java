package com.example.demo.common;

import org.springframework.stereotype.Service;

import java.util.concurrent.atomic.AtomicReference;

/**
 * Thread-safe Admin Settings configuration store
 * ============================================
 * Holds runtime parameters in thread-safe atomic references.
 */
@Service
public class AdminSettingsService {
    // Stores the current active test admin email username
    private final AtomicReference<String> testAdminEmail = new AtomicReference<>(null);

    public String getTestAdminEmail() {
        return testAdminEmail.get();
    }

    public void setTestAdminEmail(String email) {
        testAdminEmail.set(email);
    }
}
