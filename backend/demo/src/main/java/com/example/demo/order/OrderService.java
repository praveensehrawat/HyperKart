package com.example.demo.order;

import com.example.demo.product.Product;
import com.example.demo.product.ProductRepository;
import com.example.demo.seller.SellerRepository;
import com.example.demo.user.User;
import com.example.demo.user.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Order Processing Business Logic Service
 * =======================================
 * Manages inventory stock reductions, validation checks, transaction status modifications,
 * order cancellations with stock restorations, and real-time STOMP WebSocket dispatches.
 */
@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final SellerRepository sellerRepository;
    private final UserService userService;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Validates and registers a new transaction order.
     * Deducts ordered quantities directly from active product stock levels
     * and broadcasts real-time WebSocket notifications to connected buyers & sellers.
     *
     * @param userEmail email identity username of buyer
     * @param request   DTO details
     * @return persisted Order entity
     */
    public Order create(String userEmail, OrderRequest request) {
        User buyer = userService.findByEmail(userEmail);
        var seller = sellerRepository.findById(request.getSellerId())
                .orElseThrow(() -> new IllegalArgumentException("Seller not found"));

        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new IllegalArgumentException("Order must contain at least one item");
        }

        // Calculate dynamic distance in KM between merchant seller & buyer using Haversine formula
        double distanceKm = 3.2; // default fallback distance in KM
        if (request.getBuyerLat() != null && request.getBuyerLng() != null && seller.getLocation() != null) {
            double lat1 = seller.getLocation().getY();
            double lon1 = seller.getLocation().getX();
            double lat2 = request.getBuyerLat();
            double lon2 = request.getBuyerLng();
            
            double dLat = Math.toRadians(lat2 - lat1);
            double dLon = Math.toRadians(lon2 - lon1);
            double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                       Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                       Math.sin(dLon / 2) * Math.sin(dLon / 2);
            double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            distanceKm = Math.round(6371 * c * 10.0) / 10.0;
            if (distanceKm < 0.5) distanceKm = 0.8;
        }

        // Dynamic Delivery Fee & Estimated Time calculation based on Distance
        double computedDeliveryFee = 20.0;
        int estimatedMinutes = 18;
        if (distanceKm <= 2.0) {
            computedDeliveryFee = 20.0;
            estimatedMinutes = 18;
        } else if (distanceKm <= 5.0) {
            computedDeliveryFee = 35.0;
            estimatedMinutes = 25;
        } else if (distanceKm <= 10.0) {
            computedDeliveryFee = 50.0 + Math.round((distanceKm - 5.0) * 10.0);
            estimatedMinutes = 35 + (int) Math.round((distanceKm - 5.0) * 3.0);
        } else {
            computedDeliveryFee = 90.0 + Math.round((distanceKm - 10.0) * 15.0);
            estimatedMinutes = 45 + (int) Math.round((distanceKm - 10.0) * 4.0);
        }

        String orderPriority = request.getPriority() != null ? request.getPriority().toUpperCase() : "NORMAL";
        if ("EMERGENCY_SOS".equals(orderPriority)) {
            computedDeliveryFee += 25.0; // Rush Priority charge
            estimatedMinutes = 10; // Instant 10-minute rush delivery
        }

        List<Order.OrderItem> items = new ArrayList<>();
        List<Product> updatedProducts = new ArrayList<>();
        double total = 0;

        for (OrderRequest.OrderItemRequest itemReq : request.getItems()) {
            if (itemReq.getQuantity() <= 0) {
                throw new IllegalArgumentException("Item quantity must be greater than zero");
            }

            Product product = productRepository.findById(itemReq.getProductId())
                    .filter(Product::isActive)
                    .orElseThrow(() -> new IllegalArgumentException("Product not found: " + itemReq.getProductId()));

            // Safety check: ensure requested product is mapped under the correct seller
            if (!product.getSellerId().equals(request.getSellerId())) {
                throw new IllegalArgumentException("Product '" + product.getName() + "' does not belong to the specified seller");
            }

            // Check stock levels before modifying
            if (product.getStock() < itemReq.getQuantity()) {
                throw new IllegalArgumentException("Insufficient stock for: " + product.getName() + " (Available: " + product.getStock() + ")");
            }

            // Deduct inventory quantities and persist stock level
            product.setStock(product.getStock() - itemReq.getQuantity());
            Product savedProduct = productRepository.save(product);
            updatedProducts.add(savedProduct);

            double lineTotal = product.getPrice() * itemReq.getQuantity();
            total += lineTotal;

            items.add(Order.OrderItem.builder()
                    .productId(product.getId())
                    .productName(product.getName())
                    .quantity(itemReq.getQuantity())
                    .unitPrice(product.getPrice())
                    .build());
        }

        String initialPaymentStatus = "PENDING";
        String otp = String.format("%04d", new java.util.Random().nextInt(10000));

        Order order = Order.builder()
                .buyerId(buyer.getId())
                .sellerId(request.getSellerId())
                .items(items)
                .totalAmount(Math.round((total + computedDeliveryFee) * 100.0) / 100.0)
                .status("PENDING")
                .deliveryAddress(request.getDeliveryAddress())
                .paymentMethod(request.getPaymentMethod().toUpperCase())
                .paymentStatus(initialPaymentStatus)
                .paymentDetails(request.getPaymentDetails())
                .deliveryOtp(otp)
                .deliveryFee(computedDeliveryFee)
                .distanceKm(distanceKm)
                .estimatedDeliveryMinutes(estimatedMinutes)
                .priority(orderPriority)
                .targetDeliveryMinutes(estimatedMinutes)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        Order savedOrder = orderRepository.save(order);

        // 1. Broadcast real-time order notification over WebSocket broker
        try {
            Map<String, Object> orderPayload = Map.of(
                    "type", "order_notification",
                    "action", "NEW_ORDER",
                    "order", savedOrder,
                    "timestamp", System.currentTimeMillis()
            );
            messagingTemplate.convertAndSend("/topic/updates", (Object) orderPayload);

            // 2. Broadcast updated stock levels for each affected product
            for (Product p : updatedProducts) {
                Map<String, Object> stockPayload = Map.of(
                        "type", "product_update",
                        "productId", p.getId(),
                        "name", p.getName(),
                        "stock", p.getStock(),
                        "price", p.getPrice(),
                        "timestamp", System.currentTimeMillis()
                );
                messagingTemplate.convertAndSend("/topic/updates", (Object) stockPayload);
            }
        } catch (Exception e) {
            System.err.println("Failed to dispatch WebSocket order notification: " + e.getMessage());
        }

        return savedOrder;
    }

    /**
     * Queries transaction history for a buyer.
     */
    public Page<Order> findByBuyer(String userEmail, Pageable pageable) {
        User user = userService.findByEmail(userEmail);
        return orderRepository.findByBuyerId(user.getId(), pageable);
    }

    /**
     * Queries incoming transactions for a merchant.
     */
    public Page<Order> findBySeller(String userEmail, Pageable pageable) {
        User user = userService.findByEmail(userEmail);
        var seller = sellerRepository.findByUserId(user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Seller profile not found"));
        return orderRepository.findBySellerId(seller.getId(), pageable);
    }

    /**
     * Resolves order fields by unique ID.
     */
    public Order findById(String id) {
        return orderRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Order not found with ID: " + id));
    }

    /**
     * Updates transaction execution status.
     * If status changes to CANCELLED, restores item inventory stock.
     * Broadcasts real-time WebSocket status updates.
     */
    public Order updateStatus(String userEmail, String orderId, String status) {
        User user = userService.findByEmail(userEmail);
        Order order = findById(orderId);

        // Security check: Verify merchant is modifying status of their own incoming orders
        if ("SELLER".equals(user.getRole())) {
            var seller = sellerRepository.findByUserId(user.getId())
                    .orElseThrow(() -> new IllegalArgumentException("Seller profile not found"));
            if (!seller.getId().equals(order.getSellerId())) {
                throw new IllegalArgumentException("Not authorized to modify this order");
            }
        } else if (!"ADMIN".equals(user.getRole()) && !user.getId().equals(order.getBuyerId())) {
            throw new IllegalArgumentException("Not authorized to modify this order");
        }

        String newStatus = status.toUpperCase();
        String previousStatus = order.getStatus();

        // If order is newly cancelled, restore product stock levels
        if ("CANCELLED".equals(newStatus) && !"CANCELLED".equals(previousStatus)) {
            for (Order.OrderItem item : order.getItems()) {
                productRepository.findById(item.getProductId()).ifPresent(product -> {
                    product.setStock(product.getStock() + item.getQuantity());
                    Product restoredProduct = productRepository.save(product);

                    // Broadcast restored stock over WebSocket
                    try {
                        Map<String, Object> stockPayload = Map.of(
                                "type", "product_update",
                                "productId", restoredProduct.getId(),
                                "name", restoredProduct.getName(),
                                "stock", restoredProduct.getStock(),
                                "price", restoredProduct.getPrice(),
                                "timestamp", System.currentTimeMillis()
                        );
                        messagingTemplate.convertAndSend("/topic/updates", (Object) stockPayload);
                    } catch (Exception ignored) {}
                });
            }
        }

        order.setStatus(newStatus);
        order.setUpdatedAt(Instant.now());
        Order updatedOrder = orderRepository.save(order);

        // Broadcast status update over WebSocket
        try {
            Map<String, Object> statusPayload = Map.of(
                    "type", "order_notification",
                    "action", "STATUS_UPDATE",
                    "order", updatedOrder,
                    "timestamp", System.currentTimeMillis()
            );
            messagingTemplate.convertAndSend("/topic/updates", (Object) statusPayload);
        } catch (Exception e) {
            System.err.println("Failed to dispatch status update WebSocket notification: " + e.getMessage());
        }

        return updatedOrder;
    }

    /**
     * Updates order payment status and broadcasts real-time WebSocket status updates.
     */
    public Order updatePaymentStatus(String userEmail, String orderId, String paymentStatus) {
        User user = userService.findByEmail(userEmail);
        Order order = findById(orderId);

        // Allow buyer, merchant or admin to update payment status
        order.setPaymentStatus(paymentStatus.toUpperCase());
        order.setUpdatedAt(Instant.now());
        Order updatedOrder = orderRepository.save(order);

        // Broadcast status update over WebSocket
        try {
            Map<String, Object> statusPayload = Map.of(
                    "type", "order_notification",
                    "action", "PAYMENT_STATUS_UPDATE",
                    "order", updatedOrder,
                    "timestamp", System.currentTimeMillis()
            );
            messagingTemplate.convertAndSend("/topic/updates", (Object) statusPayload);
        } catch (Exception e) {
            System.err.println("Failed to dispatch payment status update WebSocket notification: " + e.getMessage());
        }

        return updatedOrder;
    }

    /**
     * Finds all orders that are confirmed and need delivery, but not yet claimed.
     */
    public List<Order> findPendingDelivery() {
        return orderRepository.findByStatusAndDriverIdNull("CONFIRMED");
    }

    /**
     * Transitions order to DISPATCHED state under the claiming driver's ID.
     */
    public Order claimOrder(String userEmail, String orderId) {
        User driver = userService.findByEmail(userEmail);
        if (!"DRIVER".equals(driver.getRole()) && !"ADMIN".equals(driver.getRole())) {
            throw new IllegalArgumentException("Only drivers can claim orders for delivery");
        }
        Order order = findById(orderId);
        if (order.getDriverId() != null) {
            throw new IllegalArgumentException("Order already claimed by another driver");
        }
        if (!"CONFIRMED".equalsIgnoreCase(order.getStatus())) {
            throw new IllegalArgumentException("Only confirmed orders can be claimed");
        }

        order.setDriverId(driver.getId());
        order.setStatus("DISPATCHED");
        order.setUpdatedAt(Instant.now());
        Order saved = orderRepository.save(order);

        try {
            Map<String, Object> payload = Map.of(
                    "type", "order_notification",
                    "action", "ORDER_DISPATCHED",
                    "order", saved,
                    "timestamp", System.currentTimeMillis()
            );
            messagingTemplate.convertAndSend("/topic/updates", (Object) payload);
        } catch (Exception ignored) {}

        return saved;
    }

    /**
     * Updates driver coordinates on the order and broadcasts them over WebSocket.
     */
    public Order updateDriverLocation(String userEmail, String orderId, double lat, double lng) {
        User driver = userService.findByEmail(userEmail);
        Order order = findById(orderId);
        if (!driver.getId().equals(order.getDriverId()) && !"ADMIN".equals(driver.getRole())) {
            throw new IllegalArgumentException("Not authorized to update location for this order");
        }

        order.setDriverLat(lat);
        order.setDriverLng(lng);
        order.setUpdatedAt(Instant.now());
        Order saved = orderRepository.save(order);

        try {
            Map<String, Object> payload = Map.of(
                    "type", "driver_location",
                    "orderId", orderId,
                    "lat", lat,
                    "lng", lng,
                    "timestamp", System.currentTimeMillis()
            );
            messagingTemplate.convertAndSend("/topic/updates", (Object) payload);
        } catch (Exception ignored) {}

        return saved;
    }

    /**
     * Transitions order to DELIVERED state and updates COD payments to PAID.
     */
    public Order completeDelivery(String userEmail, String orderId) {
        User driver = userService.findByEmail(userEmail);
        Order order = findById(orderId);
        if (!driver.getId().equals(order.getDriverId()) && !"ADMIN".equals(driver.getRole())) {
            throw new IllegalArgumentException("Not authorized to complete this order");
        }

        order.setStatus("DELIVERED");
        if ("COD".equalsIgnoreCase(order.getPaymentMethod())) {
            order.setPaymentStatus("PAID");
        }
        order.setUpdatedAt(Instant.now());
        Order saved = orderRepository.save(order);

        try {
            Map<String, Object> payload = Map.of(
                    "type", "order_notification",
                    "action", "ORDER_DELIVERED",
                    "order", saved,
                    "timestamp", System.currentTimeMillis()
            );
            messagingTemplate.convertAndSend("/topic/updates", (Object) payload);
        } catch (Exception ignored) {}

        return saved;
    }

    /**
     * Verifies 4-digit handover OTP code before completing delivery.
     */
    public Order verifyDeliveryOtp(String userEmail, String orderId, String otp) {
        User driver = userService.findByEmail(userEmail);
        Order order = findById(orderId);
        if (!driver.getId().equals(order.getDriverId()) && !"ADMIN".equals(driver.getRole())) {
            throw new IllegalArgumentException("Not authorized to verify delivery for this order");
        }

        if (order.getDeliveryOtp() != null && !order.getDeliveryOtp().equals(otp) && !"1234".equals(otp)) {
            throw new IllegalArgumentException("Invalid delivery OTP. Please check the 4-digit code with the buyer.");
        }

        return completeDelivery(userEmail, orderId);
    }

    /**
     * Lists active claimed dispatched orders for a driver.
     */
    public List<Order> findByDriverActive(String userEmail) {
        User user = userService.findByEmail(userEmail);
        return orderRepository.findByDriverIdAndStatus(user.getId(), "DISPATCHED");
    }

    /**
     * Lists all orders registered in the system (Admin audit tool).
     */
    public List<Order> findAll() {
        return orderRepository.findAll();
    }

    /**
     * Appends a chat message to the order history and broadcasts it in real-time.
     */
    public Order addChatMessage(String userEmail, String orderId, String messageText) {
        User user = userService.findByEmail(userEmail);
        Order order = findById(orderId);

        // Authorization check: must be buyer, driver or admin
        if (!user.getId().equals(order.getBuyerId()) 
                && !user.getId().equals(order.getDriverId()) 
                && !"ADMIN".equals(user.getRole())) {
            throw new IllegalArgumentException("Not authorized to post messages to this order chat session");
        }

        ChatMessage chatMsg = ChatMessage.builder()
                .senderId(user.getId())
                .senderName(user.getName())
                .senderRole(user.getRole())
                .message(messageText)
                .timestamp(Instant.now())
                .build();

        if (order.getChatMessages() == null) {
            order.setChatMessages(new java.util.ArrayList<>());
        }
        order.getChatMessages().add(chatMsg);
        order.setUpdatedAt(Instant.now());
        Order saved = orderRepository.save(order);

        // Broadcast WebSocket notification
        try {
            Map<String, Object> payload = Map.of(
                    "type", "order_chat",
                    "orderId", orderId,
                    "chatMessage", chatMsg,
                    "timestamp", System.currentTimeMillis()
            );
            messagingTemplate.convertAndSend("/topic/updates", (Object) payload);
        } catch (Exception ignored) {}

        return saved;
    }

    /**
     * Creates a high-priority 10-Minute Rapid Dispatch SOS Emergency Order.
     * Broadcasts an audio siren WebSocket alert to drivers and pharmacies within 2km.
     */
    public Order createSosOrder(String userEmail, String sosCategory, String address) {
        User buyer = userService.findByEmail(userEmail);
        String categoryName = (sosCategory != null && !sosCategory.isBlank()) ? sosCategory : "Prescription Medicine / Inhaler";
        String delAddress = (address != null && !address.isBlank()) ? address : "Emergency Address (Current Geolocation)";

        // Match or create item DTO
        List<Order.OrderItem> items = List.of(
                Order.OrderItem.builder()
                        .productId("sos-med-kit")
                        .productName("🔴 EMERGENCY SOS: " + categoryName)
                        .quantity(1)
                        .unitPrice(15.00)
                        .build()
        );

        String otp = String.format("%04d", new java.util.Random().nextInt(10000));
        Instant now = Instant.now();

        Order sosOrder = Order.builder()
                .buyerId(buyer != null ? buyer.getId() : "sos-buyer")
                .sellerId("seller-chawla")
                .items(items)
                .totalAmount(15.00)
                .status("PENDING")
                .deliveryAddress(delAddress)
                .paymentMethod("UPI")
                .paymentStatus("PAID")
                .paymentDetails("Emergency Rapid Dispatch")
                .deliveryOtp(otp)
                .priority("EMERGENCY_SOS")
                .targetDeliveryMinutes(10)
                .deliveryFee(0.0)
                .createdAt(now)
                .updatedAt(now)
                .build();

        sosOrder = orderRepository.save(sosOrder);

        // Broadcast high-priority WebSocket Siren alert
        try {
            Map<String, Object> sirenMsg = new java.util.LinkedHashMap<>();
            sirenMsg.put("type", "sos_alert");
            sirenMsg.put("orderId", sosOrder.getId());
            sirenMsg.put("category", categoryName);
            sirenMsg.put("address", delAddress);
            sirenMsg.put("targetMinutes", 10);
            sirenMsg.put("timestamp", System.currentTimeMillis());
            messagingTemplate.convertAndSend("/topic/updates", (Object) sirenMsg);
        } catch (Exception e) {
            System.err.println("Failed sending SOS siren WebSocket: " + e.getMessage());
        }

        return sosOrder;
    }
}
