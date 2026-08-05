package com.example.demo.pantry;

import com.example.demo.order.Order;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/pantry")
@RequiredArgsConstructor
public class PantryController {

    private final PantryService pantryService;

    @GetMapping
    public ResponseEntity<List<PantryItem>> getUserPantry(@AuthenticationPrincipal UserDetails user) {
        String email = (user != null) ? user.getUsername() : "default-buyer@HYPERKART.com";
        return ResponseEntity.ok(pantryService.getUserPantry(email));
    }

    @PostMapping("/reorder/{id}")
    public ResponseEntity<Order> quickReorder(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable String id) {
        String email = (user != null) ? user.getUsername() : "default-buyer@HYPERKART.com";
        return ResponseEntity.ok(pantryService.quickReorder(email, id));
    }

    @PostMapping("/toggle-auto/{id}")
    public ResponseEntity<PantryItem> toggleAutoReplenish(@PathVariable String id) {
        return ResponseEntity.ok(pantryService.toggleAutoReplenish(id));
    }
}
