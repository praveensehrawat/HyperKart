package com.example.demo.grouppool;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GroupPoolRepository extends MongoRepository<GroupPool, String> {
    List<GroupPool> findByStatus(String status);
}
