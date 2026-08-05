package com.example.demo.geo;

import com.example.demo.seller.Seller;
import org.springframework.data.mongodb.core.geo.GeoJsonPoint;
import org.springframework.stereotype.Service;

/**
 * HYPERKART Geolocation Utility Service
 * ======================================
 * Manages spatial operations including GeoJsonPoint creations and distance
 * calculations using Haversine formulas.
 */
@Service
public class GeoService {

    /**
     * Maps coordinate pairs to MongoDB GeoJSON Point formats.
     *
     * @param longitude coordinate value
     * @param latitude coordinate value
     * @return constructed GeoJsonPoint container
     */
    public GeoJsonPoint toPoint(double longitude, double latitude) {
        return new GeoJsonPoint(longitude, latitude);
    }

    /**
     * Resolves physical distance in kilometers between customer coordinates and seller shop coordinates.
     */
    public double distanceKm(double lat1, double lng1, Seller seller) {
        if (seller.getLocation() == null) {
            return Double.MAX_VALUE;
        }
        return distanceKm(lat1, lng1,
                seller.getLocation().getY(),
                seller.getLocation().getX());
    }

    /**
     * Haversine formula implementing great-circle distance computations between two coordinate points.
     *
     * @return computed distance offset in kilometers
     */
    public double distanceKm(double lat1, double lng1, double lat2, double lng2) {
        double earthRadius = 6371.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}
