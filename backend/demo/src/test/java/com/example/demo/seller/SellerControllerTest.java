package com.example.demo.seller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.mongodb.core.geo.GeoJsonPoint;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;
import java.util.Map;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
public class SellerControllerTest {

    @Mock
    private SellerService sellerService;

    @InjectMocks
    private SellerController sellerController;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(sellerController).build();
    }

    @Test
    @DisplayName("GET /api/sellers - returns list of sellers")
    void testListSellers() throws Exception {
        Seller seller = Seller.builder()
                .id("seller1")
                .shopName("Test Shop")
                .location(new GeoJsonPoint(76.82, 30.66))
                .build();
        
        when(sellerService.findAll()).thenReturn(List.of(seller));

        mockMvc.perform(get("/api/sellers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("seller1"))
                .andExpect(jsonPath("$[0].shopName").value("Test Shop"));
    }

    @Test
    @DisplayName("GET /api/sellers/{id} - returns single seller")
    void testGetSeller() throws Exception {
        Seller seller = Seller.builder()
                .id("seller1")
                .shopName("Test Shop")
                .build();

        when(sellerService.findById("seller1")).thenReturn(seller);

        mockMvc.perform(get("/api/sellers/seller1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("seller1"))
                .andExpect(jsonPath("$.shopName").value("Test Shop"));
    }

    @Test
    @DisplayName("GET /api/sellers/nearby - returns nearby sellers with distance")
    void testGetNearbySellers() throws Exception {
        Map<String, Object> nearbySeller = Map.of(
                "id", "seller1",
                "shopName", "Nearby Shop",
                "distanceKm", 2.5
        );

        when(sellerService.findNearby(30.66, 76.82, 10.0)).thenReturn(List.of(nearbySeller));

        mockMvc.perform(get("/api/sellers/nearby")
                        .param("lat", "30.66")
                        .param("lng", "76.82")
                        .param("radiusKm", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("seller1"))
                .andExpect(jsonPath("$[0].shopName").value("Nearby Shop"))
                .andExpect(jsonPath("$[0].distanceKm").value(2.5));
    }
}
