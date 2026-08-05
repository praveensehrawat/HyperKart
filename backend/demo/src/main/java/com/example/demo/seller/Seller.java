package com.example.demo.seller;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.geo.GeoJsonPoint;
import org.springframework.data.mongodb.core.index.GeoSpatialIndexType;
import org.springframework.data.mongodb.core.index.GeoSpatialIndexed;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * Seller Merchant Profile Document
 * ================================
 * Stores shop configurations and 2dsphere location coordinates for proximity distance sorting.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "sellers")
public class Seller {

    @Id
    private String id;

    @Indexed(unique = true)
    private String userId;

    private String shopName;
    private String description;
    private String address;
    private String phone;
    
    // Configures geospatial indexing to enable $near sphere searches
    @GeoSpatialIndexed(type = GeoSpatialIndexType.GEO_2DSPHERE)
    private GeoJsonPoint location;
    
    private boolean active;
    @Builder.Default
    private String status = "PENDING_APPROVAL";
}
