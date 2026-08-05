package com.example.demo.product;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
public class ProductControllerTest {

    private MockMvc mockMvc;

    @Mock
    private ProductService productService;

    @InjectMocks
    private ProductController productController;

    private Product testProduct;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(productController)
                .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver())
                .build();

        testProduct = Product.builder()
                .id("prod-1")
                .sellerId("seller-1")
                .name("Test Product")
                .description("Test Description")
                .category("Electronics")
                .price(99.99)
                .stock(10)
                .imageUrl("http://example.com/img.jpg")
                .active(true)
                .build();
    }

    @Test
    @DisplayName("GET /api/products should return paginated list of products")
    void listProducts() throws Exception {
        Page<Product> productPage = new PageImpl<>(List.of(testProduct), PageRequest.of(0, 10), 1);
        when(productService.findAll(any(Pageable.class))).thenReturn(productPage);

        mockMvc.perform(get("/api/products")
                .param("page", "0")
                .param("size", "10")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value("prod-1"))
                .andExpect(jsonPath("$.content[0].name").value("Test Product"))
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    @DisplayName("GET /api/products/{id} should return single product")
    void getProduct() throws Exception {
        when(productService.findById("prod-1")).thenReturn(testProduct);

        mockMvc.perform(get("/api/products/prod-1")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("prod-1"))
                .andExpect(jsonPath("$.name").value("Test Product"));
    }

    @Test
    @DisplayName("GET /api/products/seller/{sellerId} should return seller's products")
    void getProductsBySeller() throws Exception {
        when(productService.findBySeller("seller-1")).thenReturn(List.of(testProduct));

        mockMvc.perform(get("/api/products/seller/seller-1")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("prod-1"))
                .andExpect(jsonPath("$[0].sellerId").value("seller-1"));
    }

    @Test
    @DisplayName("GET /api/products/search?query=apple should return matching products")
    void searchProducts() throws Exception {
        when(productService.search("Test")).thenReturn(List.of(testProduct));

        mockMvc.perform(get("/api/products/search")
                .param("query", "Test")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("prod-1"))
                .andExpect(jsonPath("$[0].name").value("Test Product"));
    }
}
