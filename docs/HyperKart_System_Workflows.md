# HyperKart System Workflows & Architecture

This document provides a comprehensive overview of the core operational workflows and technical data flows within the **HyperKart** platform.

---

## 🗺️ 1. Customer Discovery & Hyperlocal Ordering Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Customer (Frontend)
    participant Backend as Spring Boot API
    participant AI as FastAPI AI Service
    participant Mongo as MongoDB
    actor Seller as Seller (Dashboard)
    actor Driver as Driver (App)

    Customer->>Backend: GET /api/v1/sellers/nearby?lat=...&lng=...&radiusKm=5
    Backend->>Mongo: Geospatial $near query on Seller locations
    Mongo-->>Backend: Nearby Sellers list
    Backend-->>Customer: Render Sellers map & list

    Customer->>Backend: GET /api/v1/ai/recommendations
    Backend->>AI: POST /recommendations (Products + Buyer Location)
    AI->>AI: Score products via OpenAI gpt-4o-mini
    AI-->>Backend: Ranked recommended products
    Backend-->>Customer: Display AI Recommendations Carousel

    Customer->>Backend: POST /api/v1/orders (Cart items, Address, Payment method)
    Backend->>Mongo: Save Order (Status: PENDING)
    Backend->>Seller: WebSocket push notification (/topic/seller/{sellerId})
    Backend-->>Customer: Order Created (Status: PENDING)
```

### Operational Steps:
1. **Location Detection**: The customer opens the **HyperKart** web app. Geolocation API pins their current coordinates.
2. **Hyperlocal Store Discovery**: The backend queries MongoDB for sellers within a configurable radius (e.g., 5 km).
3. **AI Personalization**: Products are ranked in real-time by the AI service taking into consideration distance, stock, and category relevance.
4. **Checkout & Rewards**: The customer applies student/promo discounts or scratch-card rewards and places the order.
5. **Order Dispatch**: Spring Boot persists the order state and broadcasts a live STOMP WebSocket notification to the designated seller.

---

## 🏪 2. Seller Store & Inventory Management Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Seller as Seller
    participant Dashboard as Seller Dashboard (React)
    participant Backend as Spring Boot API
    participant Mongo as MongoDB

    Seller->>Dashboard: Add / Update Product (Name, Category, Stock, Price, Image)
    Dashboard->>Backend: POST /api/v1/products
    Backend->>Mongo: Save Product Document
    Mongo-->>Backend: Saved Successfully
    Backend-->>Dashboard: 201 Created

    Backend->>Dashboard: Live WebSocket Event: NEW_ORDER
    Seller->>Dashboard: Review Order Items & Accept
    Dashboard->>Backend: PATCH /api/v1/orders/{orderId}/status (ACCEPTED)
    Backend->>Mongo: Update Order Status -> PREPARING
    Backend-->>Dashboard: Status Updated
```

### Operational Steps:
1. **Catalog Setup**: Sellers create their store profile, pin their location on the map picker, and add products to their inventory.
2. **Order Notification**: When a customer places an order, the seller receives a visual and audible alert on the Seller Dashboard.
3. **Order Preparation**: The seller marks the order as `ACCEPTED` and `PREPARING`, updating customer status in real-time.

---

## 🚚 3. Driver Delivery & Routing Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Driver as Driver
    participant App as Driver Dashboard
    participant Backend as Spring Boot API
    participant Mongo as MongoDB
    actor Customer as Customer

    Backend->>App: Live Broadcast: ORDER_READY_FOR_PICKUP
    Driver->>App: Accept Order Assignment
    App->>Backend: PATCH /api/v1/orders/{orderId}/assign-driver
    Backend->>Mongo: Update Order (DriverId, Status: PICKED_UP)

    Driver->>App: Navigate to Seller & Collect Package
    Driver->>App: Mark Order OUT_FOR_DELIVERY
    App->>Backend: Update Status -> OUT_FOR_DELIVERY
    Backend-->>Customer: WebSocket Push: "Driver is on the way"

    Driver->>App: Complete Delivery at Customer Location
    App->>Backend: PATCH /api/v1/orders/{orderId}/status (DELIVERED)
    Backend->>Mongo: Mark Order Completed & Release Payout
    Backend-->>Customer: Order Delivered Notification
```

### Operational Steps:
1. **Assignment**: Drivers view available ready-for-pickup orders in their neighborhood radius.
2. **Pickup & Route**: The driver accepts the delivery and navigates to the seller using integrated Google Maps routes.
3. **Completion**: Upon reaching the customer, the driver completes the order, triggering automatic payout logging and customer notification.

---

## 🤖 4. AI Service Integration & Scoring Workflow

```mermaid
flowchart TD
    A[Customer Requests Recommendations] --> B[Spring Boot Backend]
    B --> C{AI Service Reachable?}
    C -- Yes --> D[Forward Catalog + Customer Location to FastAPI /recommendations]
    D --> E[OpenAI GPT-4o-mini Evaluation]
    E --> F[Return Ranked Product List]
    C -- No --> G[Fallback to Local Popularity & Distance Sorting]
    F --> H[Render Personalised Carousel on HyperKart Frontend]
    G --> H
```

---

## 🛡️ 5. Admin Governance & Platform Operations Workflow

1. **Verification & Onboarding**: Admins review new Seller store registrations and Driver documentation before granting platform access.
2. **Live Platform Analytics**: Admins monitor active orders, gross merchandise value (GMV), system health, and service uptime.
3. **Emergency / SOS Response**: Integrated emergency dispatch alerts for instant driver/seller safety assistance.
