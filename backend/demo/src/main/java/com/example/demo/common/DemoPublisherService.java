package com.example.demo.common;

import com.example.demo.product.Product;
import com.example.demo.product.ProductRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import org.springframework.beans.factory.DisposableBean;
import java.util.List;
import java.util.Random;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Background Product Update Simulator
 * ===================================
 * Periodically modifies random product stocks and broadcasts changes over the WebSocket topic channel.
 */
@Service
public class DemoPublisherService implements DisposableBean {

    private final ProductRepository productRepository;
    private final SimpMessagingTemplate messagingTemplate;
    
    // Core single thread executor loop to isolate simulation schedules
    private final ScheduledExecutorService executor = Executors.newSingleThreadScheduledExecutor();
    private ScheduledFuture<?> future;
    
    private final AtomicLong rateMs = new AtomicLong(15000);
    private final AtomicBoolean running = new AtomicBoolean(false);
    private final Random random = new Random();

    private final AtomicLong publishedCount = new AtomicLong(0);
    private volatile long lastPublishedAt = 0L;

    public DemoPublisherService(ProductRepository productRepository, SimpMessagingTemplate messagingTemplate) {
        this.productRepository = productRepository;
        this.messagingTemplate = messagingTemplate;
    }

    /**
     * Spawns/Starts periodic background publishers.
     */
    public synchronized void start() {
        if (running.get()) return;
        long rate = rateMs.get();
        future = executor.scheduleAtFixedRate(this::publishRandomProductUpdate, 0, rate, TimeUnit.MILLISECONDS);
        running.set(true);
    }

    /**
     * Suspends/Stops the periodic execution handle.
     */
    public synchronized void stop() {
        if (!running.get()) return;
        future.cancel(false);
        running.set(false);
    }

    /**
     * Dynamically sets a new polling frequency rate.
     */
    public synchronized void setRate(long ms) {
        rateMs.set(ms);
        if (running.get()) {
            stop();
            start();
        }
    }

    public boolean isRunning() { return running.get(); }
    public long getRate() { return rateMs.get(); }
    public long getPublishedCount() { return publishedCount.get(); }
    public long getLastPublishedAt() { return lastPublishedAt; }

    /**
     * Simulation body: Modifies stock levels of a random active catalog product
     * and broadcasts websocket payloads to all connected clients.
     */
    public void publishRandomProductUpdate() {
        try {
            List<Product> all = productRepository.findByActiveTrue();
            if (all == null || all.isEmpty()) return;
            
            // Choose product profile randomly
            Product p = all.get(random.nextInt(all.size()));
            int delta = random.nextInt(7) - 3; // Shift variance offset (-3 to +3)
            int newStock = Math.max(0, p.getStock() + delta);
            
            p.setStock(newStock);
            productRepository.save(p);
            
            // Format websocket payload message
            var payload = java.util.Map.of(
                    "type", "product_update",
                    "productId", p.getId(),
                    "name", p.getName(),
                    "stock", newStock,
                    "timestamp", System.currentTimeMillis()
            );
            
            // Push update payload over the global updates topic broker
            messagingTemplate.convertAndSend("/topic/updates", (Object) payload);

            publishedCount.incrementAndGet();
            lastPublishedAt = System.currentTimeMillis();
        } catch (Exception e) {
            System.err.println("DemoPublisherService publish error: " + e.getMessage());
        }
    }

    /**
     * Interface cleanup hook triggered during application container shutdown.
     */
    @Override
    public void destroy() {
        stop();
        executor.shutdownNow();
    }
}
