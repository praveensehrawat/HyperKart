package com.example.demo.pantry;

import com.example.demo.order.Order;
import com.example.demo.order.OrderRepository;
import com.example.demo.user.User;
import com.example.demo.user.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@RequiredArgsConstructor
public class PantryService {

    private final PantryRepository pantryRepository;
    private final OrderRepository orderRepository;
    private final UserService userService;
    private final SimpMessagingTemplate messagingTemplate;

    public List<PantryItem> getUserPantry(String userEmail) {
        User user = userService.findByEmail(userEmail);
        String userId = (user != null) ? user.getId() : "default-buyer";

        seedDemoPantryIfEmpty(userId);
        List<PantryItem> items = pantryRepository.findByUserId(userId);

        // Update depletion percentages dynamically based on time elapsed
        Instant now = Instant.now();
        for (PantryItem item : items) {
            if (item.getLastPurchasedAt() != null && item.getConsumptionCycleDays() > 0) {
                long hoursElapsed = ChronoUnit.HOURS.between(item.getLastPurchasedAt(), now);
                long totalCycleHours = item.getConsumptionCycleDays() * 24L;
                int pct = Math.min(100, Math.max(10, (int) ((hoursElapsed * 100) / totalCycleHours)));
                item.setDepletionPercentage(pct);
                if (pct >= 80) {
                    item.setStatus("REORDER_SUGGESTED");
                } else {
                    item.setStatus("STOCKED");
                }
                pantryRepository.save(item);
            }
        }

        return items;
    }

    public Order quickReorder(String userEmail, String pantryItemId) {
        User user = userService.findByEmail(userEmail);
        PantryItem item = pantryRepository.findById(pantryItemId)
                .orElseThrow(() -> new IllegalArgumentException("Pantry item not found: " + pantryItemId));

        // Create automated order
        Instant now = Instant.now();
        String otp = String.format("%04d", new Random().nextInt(10000));

        Order.OrderItem orderItem = Order.OrderItem.builder()
                .productId(item.getProductId())
                .productName(item.getProductName())
                .quantity(1)
                .unitPrice(item.getUnitPrice())
                .build();

        Order order = Order.builder()
                .buyerId(user != null ? user.getId() : "default-buyer")
                .sellerId(item.getSellerId() != null ? item.getSellerId() : "seller-chawla")
                .items(List.of(orderItem))
                .totalAmount(item.getUnitPrice())
                .status("PENDING")
                .deliveryAddress("Home Address (Pantry Auto-Replenish)")
                .paymentMethod("COD")
                .paymentStatus("PENDING")
                .deliveryOtp(otp)
                .priority("NORMAL")
                .targetDeliveryMinutes(20)
                .createdAt(now)
                .updatedAt(now)
                .build();

        order = orderRepository.save(order);

        // Reset depletion velocity to 0% after purchase
        item.setLastPurchasedAt(now);
        item.setPredictedDepletionAt(now.plus(item.getConsumptionCycleDays(), ChronoUnit.DAYS));
        item.setDepletionPercentage(10);
        item.setStatus("STOCKED");
        pantryRepository.save(item);

        // Broadcast notification
        try {
            Map<String, Object> msg = Map.of(
                    "type", "pantry_reorder",
                    "productName", item.getProductName(),
                    "orderId", order.getId(),
                    "timestamp", System.currentTimeMillis()
            );
            messagingTemplate.convertAndSend("/topic/updates", (Object) msg);
        } catch (Exception ignored) {}

        return order;
    }

    public PantryItem toggleAutoReplenish(String pantryItemId) {
        PantryItem item = pantryRepository.findById(pantryItemId)
                .orElseThrow(() -> new IllegalArgumentException("Pantry item not found: " + pantryItemId));
        item.setAutoReplenishEnabled(!item.isAutoReplenishEnabled());
        return pantryRepository.save(item);
    }

    private void seedDemoPantryIfEmpty(String userId) {
        if (pantryRepository.findByUserId(userId).isEmpty()) {
            Instant now = Instant.now();
            PantryItem milk = PantryItem.builder()
                    .userId(userId)
                    .productId("p-milk-1")
                    .productName("🥛 Amul Taaza T-Special Fresh Milk (1L)")
                    .category("Dairy & Eggs")
                    .unitPrice(2.50)
                    .sellerId("seller-chawla")
                    .shopName("Chawla Kiryana Store")
                    .consumptionCycleDays(2)
                    .lastPurchasedAt(now.minus(42, ChronoUnit.HOURS)) // 42 hrs ago -> ~88% depleted
                    .predictedDepletionAt(now.plus(6, ChronoUnit.HOURS))
                    .depletionPercentage(88)
                    .autoReplenishEnabled(true)
                    .status("REORDER_SUGGESTED")
                    .build();

            PantryItem bread = PantryItem.builder()
                    .userId(userId)
                    .productId("p-bread-1")
                    .productName("🍞 Brown Harvest Multi-Grain Bread (400g)")
                    .category("Bakery")
                    .unitPrice(1.80)
                    .sellerId("seller-chawla")
                    .shopName("Chawla Kiryana Store")
                    .consumptionCycleDays(3)
                    .lastPurchasedAt(now.minus(60, ChronoUnit.HOURS)) // 60 hrs ago -> ~83% depleted
                    .predictedDepletionAt(now.plus(12, ChronoUnit.HOURS))
                    .depletionPercentage(83)
                    .autoReplenishEnabled(true)
                    .status("REORDER_SUGGESTED")
                    .build();

            PantryItem eggs = PantryItem.builder()
                    .userId(userId)
                    .productId("p-eggs-1")
                    .productName("🥚 Farm Fresh White Eggs (12 Pieces)")
                    .category("Dairy & Eggs")
                    .unitPrice(3.20)
                    .sellerId("seller-chawla")
                    .shopName("Chawla Kiryana Store")
                    .consumptionCycleDays(5)
                    .lastPurchasedAt(now.minus(30, ChronoUnit.HOURS)) // ~25% depleted
                    .predictedDepletionAt(now.plus(90, ChronoUnit.HOURS))
                    .depletionPercentage(25)
                    .autoReplenishEnabled(false)
                    .status("STOCKED")
                    .build();

            pantryRepository.saveAll(List.of(milk, bread, eggs));
        }
    }
}
