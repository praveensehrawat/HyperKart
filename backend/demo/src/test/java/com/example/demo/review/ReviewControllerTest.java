package com.example.demo.review;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Collections;
import java.util.List;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
public class ReviewControllerTest {

    private MockMvc mockMvc;

    @Mock
    private ReviewService reviewService;

    @InjectMocks
    private ReviewController reviewController;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(reviewController).build();
    }

    @Test
    @DisplayName("GET /api/reviews/seller/{sellerId} - returns list of reviews")
    void testGetSellerReviews() throws Exception {
        Review review = Review.builder()
                .id("1")
                .sellerId("seller-123")
                .buyerName("John")
                .rating(5)
                .comment("Great!")
                .build();
        
        when(reviewService.findBySellerId("seller-123")).thenReturn(List.of(review));

        mockMvc.perform(get("/api/reviews/seller/seller-123"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.size()").value(1))
                .andExpect(jsonPath("$[0].id").value("1"))
                .andExpect(jsonPath("$[0].buyerName").value("John"))
                .andExpect(jsonPath("$[0].rating").value(5))
                .andExpect(jsonPath("$[0].comment").value("Great!"));

        verify(reviewService).findBySellerId("seller-123");
    }

    @Test
    @DisplayName("GET /api/reviews/seller/{sellerId} - returns empty list")
    void testGetSellerReviewsEmpty() throws Exception {
        when(reviewService.findBySellerId("seller-456")).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/reviews/seller/seller-456"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.size()").value(0));

        verify(reviewService).findBySellerId("seller-456");
    }
}
