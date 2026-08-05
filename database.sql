-- ==============================================================================
-- HYPERKART Commerce Complete Production Database Dump / Schema File
-- Targeted for phpMyAdmin / MySQL / MariaDB (InfinityFree Host)
-- Database Name: shopneara_db (or if0_42467382_shopneara_db)
-- Includes DDL tables, users, merchants, products catalog, and delivery packages.
-- ==============================================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

-- --------------------------------------------------------
-- Table structure for table `users`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(128) NOT NULL,
  `email` VARCHAR(128) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `role` VARCHAR(32) NOT NULL DEFAULT 'BUYER', -- BUYER, SELLER, DRIVER, ADMIN
  `last_login_ip` VARCHAR(64) DEFAULT NULL,
  `last_login_at` DATETIME DEFAULT NULL,
  `force_logged_out` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `sellers`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `sellers` (
  `id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) NOT NULL,
  `shop_name` VARCHAR(128) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `address` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(32) DEFAULT NULL,
  `latitude` DECIMAL(10,8) DEFAULT 30.66500000,
  `longitude` DECIMAL(11,8) DEFAULT 76.82200000,
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  `status` VARCHAR(32) NOT NULL DEFAULT 'APPROVED', -- PENDING_APPROVAL, APPROVED, REJECTED
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sellers_user` (`user_id`),
  KEY `idx_sellers_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `products`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `products` (
  `id` VARCHAR(64) NOT NULL,
  `seller_id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(128) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `category` VARCHAR(64) NOT NULL,
  `price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `stock` INT NOT NULL DEFAULT 0,
  `image_url` VARCHAR(512) DEFAULT NULL,
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_products_seller` (`seller_id`),
  KEY `idx_products_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `orders`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `orders` (
  `id` VARCHAR(64) NOT NULL,
  `buyer_id` VARCHAR(64) NOT NULL,
  `seller_id` VARCHAR(64) NOT NULL,
  `total_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `status` VARCHAR(32) NOT NULL DEFAULT 'CONFIRMED', -- PENDING, CONFIRMED, DELIVERED, CANCELLED
  `delivery_address` VARCHAR(255) NOT NULL,
  `payment_method` VARCHAR(32) NOT NULL DEFAULT 'COD', -- COD, UPI, CARD
  `payment_status` VARCHAR(32) NOT NULL DEFAULT 'PENDING', -- PENDING, PAID
  `payment_details` VARCHAR(255) DEFAULT NULL,
  `driver_id` VARCHAR(64) DEFAULT NULL,
  `driver_lat` DECIMAL(10,8) DEFAULT NULL,
  `driver_lng` DECIMAL(11,8) DEFAULT NULL,
  `delivery_otp` VARCHAR(8) DEFAULT NULL,
  `priority` VARCHAR(32) NOT NULL DEFAULT 'NORMAL', -- NORMAL, EMERGENCY_SOS
  `target_delivery_minutes` INT NOT NULL DEFAULT 30,
  `delivery_fee` DECIMAL(6,2) NOT NULL DEFAULT 5.00,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_orders_buyer` (`buyer_id`),
  KEY `idx_orders_seller` (`seller_id`),
  KEY `idx_orders_driver` (`driver_id`),
  KEY `idx_orders_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `order_items`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `order_items` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `order_id` VARCHAR(64) NOT NULL,
  `product_id` VARCHAR(64) NOT NULL,
  `product_name` VARCHAR(128) NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `unit_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`id`),
  KEY `idx_order_items_order` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `order_chat_messages`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `order_chat_messages` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `order_id` VARCHAR(64) NOT NULL,
  `sender_id` VARCHAR(64) NOT NULL,
  `sender_name` VARCHAR(128) NOT NULL,
  `sender_role` VARCHAR(32) NOT NULL, -- BUYER, SELLER, DRIVER
  `message` TEXT NOT NULL,
  `timestamp` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_chat_order` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `reviews`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `reviews` (
  `id` VARCHAR(64) NOT NULL,
  `order_id` VARCHAR(64) DEFAULT NULL,
  `seller_id` VARCHAR(64) NOT NULL,
  `buyer_id` VARCHAR(64) NOT NULL,
  `buyer_name` VARCHAR(128) NOT NULL,
  `rating` INT NOT NULL DEFAULT 5, -- 1 to 5
  `comment` TEXT DEFAULT NULL,
  `image_url` VARCHAR(512) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_reviews_seller` (`seller_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `payouts`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `payouts` (
  `id` VARCHAR(64) NOT NULL,
  `driver_id` VARCHAR(64) NOT NULL,
  `driver_name` VARCHAR(128) NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `status` VARCHAR(32) NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
  `bank_details` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_payouts_driver` (`driver_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `group_pools`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `group_pools` (
  `id` VARCHAR(64) NOT NULL,
  `neighborhood_name` VARCHAR(128) NOT NULL,
  `creator_name` VARCHAR(128) NOT NULL,
  `creator_id` VARCHAR(64) NOT NULL,
  `seller_id` VARCHAR(64) NOT NULL,
  `shop_name` VARCHAR(128) NOT NULL,
  `participants_count` INT NOT NULL DEFAULT 1,
  `target_participants` INT NOT NULL DEFAULT 2,
  `discount_percent` DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  `free_delivery_unlocked` TINYINT(1) NOT NULL DEFAULT 0,
  `status` VARCHAR(32) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, UNLOCKED, EXPIRED
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `pantry_items`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `pantry_items` (
  `id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) NOT NULL,
  `product_id` VARCHAR(64) NOT NULL,
  `product_name` VARCHAR(128) NOT NULL,
  `category` VARCHAR(64) DEFAULT NULL,
  `unit_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `seller_id` VARCHAR(64) NOT NULL,
  `shop_name` VARCHAR(128) NOT NULL,
  `image_url` VARCHAR(512) DEFAULT NULL,
  `consumption_cycle_days` INT NOT NULL DEFAULT 2,
  `last_purchased_at` DATETIME DEFAULT NULL,
  `predicted_depletion_at` DATETIME DEFAULT NULL,
  `depletion_percentage` INT NOT NULL DEFAULT 85,
  `auto_replenish_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `status` VARCHAR(32) NOT NULL DEFAULT 'STOCKED',
  PRIMARY KEY (`id`),
  KEY `idx_pantry_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- DEMO USERS SEED DATA
-- ==============================================================================

INSERT INTO `users` (`id`, `name`, `email`, `password`, `role`, `force_logged_out`) VALUES
('user-admin-1', 'System Administrator', 'admin@HYPERKART.com', '$2a$10$wN3s1Wk9G3u6E9/H7L8P4.kK3X3p3xX3X3p3xX3X3p3xX3X3p3xX3', 'ADMIN', 0),
('user-seller-1', 'john doe', 'john.doe@gmail.com', '$2a$10$wN3s1Wk9G3u6E9/H7L8P4.kK3X3p3xX3X3p3xX3X3p3xX3X3p3xX3', 'SELLER', 0),
('user-seller-2', 'john', 'johnndoe@gmail.com', '$2a$10$wN3s1Wk9G3u6E9/H7L8P4.kK3X3p3xX3X3p3xX3X3p3xX3X3p3xX3', 'SELLER', 0),
('user-seller-3', 'MedPlus Seller', 'medplus.seller@gmail.com', '$2a$10$wN3s1Wk9G3u6E9/H7L8P4.kK3X3p3xX3X3p3xX3X3p3xX3X3p3xX3', 'SELLER', 0),
('user-driver-1', 'Rajesh Driver', 'driver@HYPERKART.com', '$2a$10$wN3s1Wk9G3u6E9/H7L8P4.kK3X3p3xX3X3p3xX3X3p3xX3X3p3xX3', 'DRIVER', 0)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- ==============================================================================
-- DEMO SELLERS SEED DATA
-- ==============================================================================

INSERT INTO `sellers` (`id`, `user_id`, `shop_name`, `description`, `address`, `phone`, `latitude`, `longitude`, `active`, `status`) VALUES
('seller-chawla', 'user-seller-1', 'Chawla Kiryana Store', 'Your neighborhood grocer for fresh foods, spices, grains, and daily essentials.', 'VIP Road, Zirakpur, Punjab', '9876543210', 30.66500000, 76.82200000, 1, 'APPROVED'),
('seller-fresh', 'user-seller-2', 'Zirakpur Fresh Mart', 'Local organic farm produce, fresh fruits, vegetables, and daily dairy items.', 'Ambala Chandigarh Expressway, Zirakpur', '9876543211', 30.65500000, 76.82500000, 1, 'APPROVED'),
('seller-medplus', 'user-seller-3', 'Zirakpur MedPlus Pharmacy', 'Open 24/7 • Prescription medicines, health supplements, and medical supplies.', 'Sector 4 Main Road, Zirakpur', '9876543212', 30.66800000, 76.81800000, 1, 'APPROVED')
ON DUPLICATE KEY UPDATE `shop_name` = VALUES(`shop_name`);

-- ==============================================================================
-- DEMO PRODUCTS CATALOG SEED DATA
-- ==============================================================================

INSERT INTO `products` (`id`, `seller_id`, `name`, `description`, `category`, `price`, `stock`, `image_url`, `active`) VALUES
('p1', 'seller-chawla', 'Fresh Apples', 'Crisp local apples per kg', 'Fruits', 120.00, 50, 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=600&q=80', 1),
('p2', 'seller-chawla', 'Organic Milk 1L', '1L fresh organic dairy milk', 'Dairy', 65.00, 30, 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=600&q=80', 1),
('p3', 'seller-chawla', 'Brown Whole Wheat Bread', 'Freshly baked wholegrain loaf', 'Bakery', 45.00, 20, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80', 1),
('p4', 'seller-fresh', 'Farm Fresh Tomatoes 1kg', 'Fresh juicy tomatoes per kg', 'Vegetables', 40.00, 40, 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=600&q=80', 1),
('p5', 'seller-fresh', 'Organic Eggs (Pack of 6)', 'Free-range eggs, pack of 6', 'Grocery', 54.00, 60, 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&w=600&q=80', 1),
('p6', 'seller-fresh', 'Fresh Orange Juice 1L', '100% natural cold pressed juice', 'Beverages', 110.00, 35, 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=600&q=80', 1),
('p7', 'seller-medplus', 'Paracetamol 500mg Tablets', 'Pain relief medication, strip of 10', 'Pharmacy', 30.00, 100, 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80', 1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `price` = VALUES(`price`);

-- ==============================================================================
-- DEMO ORDERS & DELIVERY PACKAGES SEED DATA
-- ==============================================================================

INSERT INTO `orders` (`id`, `buyer_id`, `seller_id`, `total_amount`, `status`, `delivery_address`, `payment_method`, `payment_status`, `delivery_otp`, `delivery_fee`) VALUES
('demo-order-101', 'user-admin-1', 'seller-chawla', 9.97, 'CONFIRMED', 'Flat 402, Royal Palms, VIP Road, Zirakpur', 'COD', 'PENDING', '8492', 5.00),
('demo-order-102', 'user-admin-1', 'seller-fresh', 11.07, 'CONFIRMED', 'House 12B, Sector 4, Zirakpur', 'UPI', 'PAID', '1234', 5.00)
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
