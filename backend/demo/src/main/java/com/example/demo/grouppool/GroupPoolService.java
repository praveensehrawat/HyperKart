package com.example.demo.grouppool;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@RequiredArgsConstructor
public class GroupPoolService {

    private final GroupPoolRepository groupPoolRepository;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Retrieves all active neighborhood pools. Seeds demo pools if empty.
     */
    public List<GroupPool> getActivePools() {
        seedDemoPoolsIfEmpty();
        
        List<GroupPool> pools = groupPoolRepository.findAll();
        Instant now = Instant.now();

        // Check for expiration
        for (GroupPool pool : pools) {
            if ("ACTIVE".equals(pool.getStatus()) && pool.getExpiresAt() != null && now.isAfter(pool.getExpiresAt())) {
                if (pool.getParticipantsCount() >= pool.getTargetParticipants()) {
                    pool.setStatus("UNLOCKED");
                } else {
                    pool.setStatus("EXPIRED");
                }
                groupPoolRepository.save(pool);
            }
        }

        return groupPoolRepository.findByStatus("ACTIVE");
    }

    /**
     * Creates a new community group buying pool.
     */
    public GroupPool createPool(String neighborhoodName, String creatorName, String creatorId, String shopName, String sellerId) {
        Instant now = Instant.now();
        List<String> names = new ArrayList<>();
        names.add(creatorName != null ? creatorName : "Local Resident");

        GroupPool pool = GroupPool.builder()
                .neighborhoodName(neighborhoodName != null ? neighborhoodName : "Zirakpur Royal Palms Society")
                .creatorName(creatorName != null ? creatorName : "Local Resident")
                .creatorId(creatorId != null ? creatorId : "user-gen-1")
                .shopName(shopName != null ? shopName : "Chawla Kiryana Store")
                .sellerId(sellerId != null ? sellerId : "seller-chawla")
                .participantsCount(1)
                .targetParticipants(2)
                .discountPercent(10.0)
                .freeDeliveryUnlocked(false)
                .participantNames(names)
                .status("ACTIVE")
                .createdAt(now)
                .expiresAt(now.plus(30, ChronoUnit.MINUTES))
                .build();

        pool = groupPoolRepository.save(pool);

        // Broadcast WebSocket alert
        broadcastPoolUpdate("NEW_POOL", pool);

        return pool;
    }

    /**
     * Joins an existing community pool.
     */
    public GroupPool joinPool(String poolId, String participantName) {
        GroupPool pool = groupPoolRepository.findById(poolId)
                .orElseThrow(() -> new IllegalArgumentException("Group pool not found: " + poolId));

        if (!"ACTIVE".equals(pool.getStatus())) {
            throw new IllegalStateException("Group pool is no longer active.");
        }

        int newCount = pool.getParticipantsCount() + 1;
        pool.setParticipantsCount(newCount);
        
        if (pool.getParticipantNames() == null) {
            pool.setParticipantNames(new ArrayList<>());
        }
        pool.getParticipantNames().add(participantName != null ? participantName : "Neighbor Buyer");

        // Unlock Free Delivery & 10% Discount when target is reached
        if (newCount >= pool.getTargetParticipants()) {
            pool.setFreeDeliveryUnlocked(true);
            pool.setDiscountPercent(10.0);
            pool.setStatus("UNLOCKED");
        }

        pool = groupPoolRepository.save(pool);

        // Broadcast WebSocket live update
        broadcastPoolUpdate("JOIN_POOL", pool);

        return pool;
    }

    private void seedDemoPoolsIfEmpty() {
        if (groupPoolRepository.count() == 0) {
            Instant now = Instant.now();
            GroupPool p1 = GroupPool.builder()
                    .id("pool-vip-road")
                    .neighborhoodName("Royal Palms Society, VIP Road")
                    .creatorName("Amit Sharma")
                    .creatorId("user-demo-1")
                    .shopName("Chawla Kiryana Store")
                    .sellerId("seller-chawla")
                    .participantsCount(1)
                    .targetParticipants(2)
                    .discountPercent(10.0)
                    .freeDeliveryUnlocked(false)
                    .participantNames(List.of("Amit Sharma"))
                    .status("ACTIVE")
                    .createdAt(now)
                    .expiresAt(now.plus(22, ChronoUnit.MINUTES))
                    .build();

            GroupPool p2 = GroupPool.builder()
                    .id("pool-fresh-mart")
                    .neighborhoodName("Green Enclave, Sector 4")
                    .creatorName("Priya Verma")
                    .creatorId("user-demo-2")
                    .shopName("Zirakpur Fresh Mart")
                    .sellerId("seller-fresh")
                    .participantsCount(1)
                    .targetParticipants(2)
                    .discountPercent(10.0)
                    .freeDeliveryUnlocked(false)
                    .participantNames(List.of("Priya Verma"))
                    .status("ACTIVE")
                    .createdAt(now)
                    .expiresAt(now.plus(18, ChronoUnit.MINUTES))
                    .build();

            groupPoolRepository.saveAll(List.of(p1, p2));
        }
    }

    private void broadcastPoolUpdate(String eventType, GroupPool pool) {
        try {
            Map<String, Object> msg = new LinkedHashMap<>();
            msg.put("type", "group_pool_update");
            msg.put("eventType", eventType);
            msg.put("poolId", pool.getId());
            msg.put("neighborhoodName", pool.getNeighborhoodName());
            msg.put("participantsCount", pool.getParticipantsCount());
            msg.put("unlocked", pool.isFreeDeliveryUnlocked());
            msg.put("shopName", pool.getShopName());
            messagingTemplate.convertAndSend("/topic/updates", (Object) msg);
        } catch (Exception e) {
            System.err.println("Failed broadcasting pool update: " + e.getMessage());
        }
    }
}
