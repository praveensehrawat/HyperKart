package com.example.demo.pantry;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PantryRepository extends MongoRepository<PantryItem, String> {
    List<PantryItem> findByUserId(String userId);
}
