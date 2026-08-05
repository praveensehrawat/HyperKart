package com.example.demo.grouppool;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/grouppools")
@RequiredArgsConstructor
public class GroupPoolController {

    private final GroupPoolService groupPoolService;

    @GetMapping
    public ResponseEntity<List<GroupPool>> getActivePools() {
        return ResponseEntity.ok(groupPoolService.getActivePools());
    }

    @PostMapping("/create")
    public ResponseEntity<GroupPool> createPool(@RequestBody Map<String, String> payload) {
        String neighborhood = payload.get("neighborhoodName");
        String creatorName = payload.get("creatorName");
        String creatorId = payload.get("creatorId");
        String shopName = payload.get("shopName");
        String sellerId = payload.get("sellerId");
        return ResponseEntity.ok(groupPoolService.createPool(neighborhood, creatorName, creatorId, shopName, sellerId));
    }

    @PostMapping("/{id}/join")
    public ResponseEntity<GroupPool> joinPool(@PathVariable String id, @RequestBody Map<String, String> payload) {
        String participantName = payload.getOrDefault("participantName", "Neighbor Buyer");
        return ResponseEntity.ok(groupPoolService.joinPool(id, participantName));
    }
}
