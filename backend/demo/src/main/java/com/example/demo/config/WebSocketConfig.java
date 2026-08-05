package com.example.demo.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * WebSocket and STOMP Configuration
 * =================================
 * Configures the live updates broker registry and establishes SockJS/STOMP connection endpoints.
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    /**
     * Sets destination prefixes and message routing brokers.
     */
    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Enforce basic in-memory broker on the topic prefix
        config.enableSimpleBroker("/topic");
        // Prefix for client message handler mapping rules
        config.setApplicationDestinationPrefixes("/app");
    }

    /**
     * Registers STOMP endpoints mapped to the user connection path.
     */
    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Expose endpoint '/ws' with SockJS fallback layers enabled
        registry.addEndpoint("/ws").setAllowedOriginPatterns("*").withSockJS();
    }
}
