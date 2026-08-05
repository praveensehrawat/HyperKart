package com.example.demo.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
public class AiControllerTest {

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @Mock
    private AiRecommendationService aiService;

    @InjectMocks
    private AiController aiController;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(aiController)
                .setCustomArgumentResolvers(new org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver())
                .build();
        objectMapper = new ObjectMapper();
    }

    @Test
    @DisplayName("GET /api/ai/recommendations - returns recommendations map")
    void testRecommendations() throws Exception {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("recommendations", List.of());
        result.put("source", "rule-based");

        when(aiService.getRecommendations(eq("apples"), any(), any(), any(), any(), any()))
                .thenReturn(result);

        mockMvc.perform(get("/api/ai/recommendations")
                        .param("query", "apples"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.source").value("rule-based"));

        verify(aiService).getRecommendations(eq("apples"), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("GET /api/ai/search - returns search results map")
    void testSearch() throws Exception {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("search_results", List.of());

        when(aiService.smartSearch(eq("milk"), any(), any(), any(), any()))
                .thenReturn(result);

        mockMvc.perform(get("/api/ai/search")
                        .param("q", "milk"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.search_results").isArray());

        verify(aiService).smartSearch(eq("milk"), any(), any(), any(), any());
    }

    @Test
    @DisplayName("POST /api/ai/bargain - returns bargain result map")
    void testBargain() throws Exception {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("status", "accepted");

        when(aiService.negotiateBargain(eq("prod-1"), eq(100.0), eq(2)))
                .thenReturn(result);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("productId", "prod-1");
        payload.put("requestedPrice", 100.0);
        payload.put("quantity", 2);

        mockMvc.perform(post("/api/ai/bargain")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("accepted"));

        verify(aiService).negotiateBargain(eq("prod-1"), eq(100.0), eq(2));
    }

    @Test
    @DisplayName("POST /api/ai/recipe-bundle - returns recipe bundle map")
    void testRecipeBundle() throws Exception {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("recipe", "Pasta");

        when(aiService.parseRecipeBundle(eq("Pasta"), eq(2)))
                .thenReturn(result);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("prompt", "Pasta");
        payload.put("servings", 2);

        mockMvc.perform(post("/api/ai/recipe-bundle")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.recipe").value("Pasta"));

        verify(aiService).parseRecipeBundle(eq("Pasta"), eq(2));
    }
}
