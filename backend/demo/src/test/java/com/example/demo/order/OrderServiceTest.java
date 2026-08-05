package com.example.demo.order;

import com.example.demo.product.Product;
import com.example.demo.product.ProductRepository;
import com.example.demo.seller.Seller;
import com.example.demo.seller.SellerRepository;
import com.example.demo.user.User;
import com.example.demo.user.UserService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.mongodb.core.geo.GeoJsonPoint;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.List;
import java.util.Optional;
import java.util.Collections;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class OrderServiceTest {

    @Mock
    private OrderRepository orderRepository;
    
    @Mock
    private ProductRepository productRepository;
    
    @Mock
    private SellerRepository sellerRepository;
    
    @Mock
    private UserService userService;
    
    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @InjectMocks
    private OrderService orderService;

    @Test
    @DisplayName("create - success: returns saved Order with correct totals and status PENDING")
    void testCreateOrderSuccess() {
        User buyer = User.builder().id("buyer-1").name("Test").email("buyer@test.com").role("BUYER").build();
        when(userService.findByEmail("buyer@test.com")).thenReturn(buyer);

        Seller seller = Seller.builder().id("seller-1").userId("s-user-1").shopName("Test Shop")
                .location(new GeoJsonPoint(76.82, 30.66)).active(true).build();
        when(sellerRepository.findById("seller-1")).thenReturn(Optional.of(seller));

        Product product = Product.builder().id("prod-1").sellerId("seller-1").name("Apples")
                .category("Fruits").price(1.99).stock(50).active(true).build();
        when(productRepository.findById("prod-1")).thenReturn(Optional.of(product));
        when(productRepository.save(any(Product.class))).thenAnswer(inv -> inv.getArgument(0));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> { 
            Order o = inv.getArgument(0); 
            o.setId("order-1"); 
            return o; 
        });

        lenient().doNothing().when(messagingTemplate).convertAndSend(anyString(), (Object) any());

        OrderRequest.OrderItemRequest itemReq = new OrderRequest.OrderItemRequest();
        itemReq.setProductId("prod-1");
        itemReq.setQuantity(5);

        OrderRequest request = new OrderRequest();
        request.setSellerId("seller-1");
        request.setItems(List.of(itemReq));
        request.setDeliveryAddress("123 Test Street");
        request.setPaymentMethod("COD");

        Order order = orderService.create("buyer@test.com", request);

        assertThat(order).isNotNull();
        assertThat(order.getId()).isEqualTo("order-1");
        assertThat(order.getStatus()).isEqualTo("PENDING");
        assertThat(order.getItems()).hasSize(1);
        
        verify(productRepository).save(any(Product.class));
        assertThat(product.getStock()).isEqualTo(45);
    }

    @Test
    @DisplayName("create - failure: empty items -> IllegalArgumentException")
    void testCreateOrderEmptyItems() {
        User buyer = User.builder().id("buyer-1").name("Test").email("buyer@test.com").role("BUYER").build();
        when(userService.findByEmail("buyer@test.com")).thenReturn(buyer);

        Seller seller = Seller.builder().id("seller-1").userId("s-user-1").shopName("Test Shop").active(true).build();
        when(sellerRepository.findById("seller-1")).thenReturn(Optional.of(seller));

        OrderRequest request = new OrderRequest();
        request.setSellerId("seller-1");
        request.setItems(Collections.emptyList());

        assertThatThrownBy(() -> orderService.create("buyer@test.com", request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("at least one item");
    }

    @Test
    @DisplayName("create - failure: insufficient stock -> IllegalArgumentException")
    void testCreateOrderInsufficientStock() {
        User buyer = User.builder().id("buyer-1").name("Test").email("buyer@test.com").role("BUYER").build();
        lenient().when(userService.findByEmail("buyer@test.com")).thenReturn(buyer);

        Seller seller = Seller.builder().id("seller-1").userId("s-user-1").shopName("Test Shop").active(true).build();
        lenient().when(sellerRepository.findById("seller-1")).thenReturn(Optional.of(seller));

        Product product = Product.builder().id("prod-1").sellerId("seller-1").price(1.99).stock(2).active(true).build();
        lenient().when(productRepository.findById("prod-1")).thenReturn(Optional.of(product));

        OrderRequest.OrderItemRequest itemReq = new OrderRequest.OrderItemRequest();
        itemReq.setProductId("prod-1");
        itemReq.setQuantity(5);

        OrderRequest request = new OrderRequest();
        request.setSellerId("seller-1");
        request.setItems(List.of(itemReq));

        assertThatThrownBy(() -> orderService.create("buyer@test.com", request))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("updateStatus - cancellation restores product stock")
    void testUpdateStatusCancellationRestoresStock() {
        // updateStatus(String userEmail, String orderId, String status)
        User admin = User.builder().id("admin-1").name("Admin").email("admin@test.com").role("ADMIN").build();
        when(userService.findByEmail("admin@test.com")).thenReturn(admin);

        Order.OrderItem item = Order.OrderItem.builder().productId("prod-1").quantity(5).unitPrice(1.99).build();
        Order order = Order.builder().id("order-1").buyerId("buyer-1").sellerId("seller-1").status("PENDING").items(List.of(item)).build();
        
        when(orderRepository.findById("order-1")).thenReturn(Optional.of(order));
        
        Product product = Product.builder().id("prod-1").stock(10).build();
        when(productRepository.findById("prod-1")).thenReturn(Optional.of(product));
        when(productRepository.save(any(Product.class))).thenAnswer(inv -> inv.getArgument(0));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));

        lenient().doNothing().when(messagingTemplate).convertAndSend(anyString(), (Object) any());

        Order updatedOrder = orderService.updateStatus("admin@test.com", "order-1", "CANCELLED");

        assertThat(updatedOrder.getStatus()).isEqualTo("CANCELLED");
        assertThat(product.getStock()).isEqualTo(15);
    }

    @Test
    @DisplayName("findById - returns order")
    void testFindByIdSuccess() {
        Order order = Order.builder().id("order-1").build();
        when(orderRepository.findById("order-1")).thenReturn(Optional.of(order));

        Order found = orderService.findById("order-1");
        assertThat(found).isNotNull();
        assertThat(found.getId()).isEqualTo("order-1");
    }

    @Test
    @DisplayName("findById - not found -> IllegalArgumentException")
    void testFindByIdNotFound() {
        when(orderRepository.findById("order-1")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> orderService.findById("order-1"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
