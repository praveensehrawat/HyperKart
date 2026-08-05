package com.example.demo.config;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * SPA Forwarding Controller
 * =========================
 * Forwards all non-API, non-static resource paths to index.html
 * to support React Router client-side navigation.
 */
@Controller
public class SpaController {

    @GetMapping(value = {"/", "/login", "/register", "/products", "/sellers", "/cart", 
                         "/checkout", "/orders", "/ai", "/seller-dashboard", "/admin"})
    public String forward() {
        return "forward:/index.html";
    }
}
