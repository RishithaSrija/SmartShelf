# SmartShelf — Technical Architecture Document

## Overview

SmartShelf is architectured as a modular multi-tier application connecting perishable goods retailers with nearby consumers through automated dynamic pricing, geolocation-based discovery, atomic inventory reservations, and machine learning demand forecasting.

---

## 1. High-Level System Architecture

```
+-------------------------------------------------------------+
|                      React 18 / Vite Client                 |
|                   (http://localhost:3000)                   |
+-------------------------------------------------------------+
                              |
                              | HTTP / REST (JWT Bearer)
                              v
+-------------------------------------------------------------+
|                  Node.js / Express Backend API              |
|                   (http://localhost:5000)                   |
|                                                             |
|  +---------------------+  +-------------------------------+ |
|  |  Auth / RBAC Guards |  |  Dynamic Pricing Engine       | |
|  +---------------------+  +-------------------------------+ |
|  |  Inventory Manager  |  |  Order / Reservation Engine   | |
|  +---------------------+  +-------------------------------+ |
|  |  Hourly Expiry Cron |  |  5-Min Reservation Cleanup    | |
|  +---------------------+  +-------------------------------+ |
+-------------------------------------------------------------+
         /                                           \
        / Mongoose / GeoJSON                          \ HTTP / JSON
       v                                               v
+-----------------------+              +------------------------------+
|     MongoDB Database  |              |    FastAPI ML Service        |
| (localhost:27017)     |              |    (http://localhost:8001)   |
| - 2dsphere indexes    |              | - RandomForestRegressor      |
| - Compound Uniqueness |              | - Lag & Rolling Features     |
| - Atomic Operations   |              | - Fallback Resilience        |
+-----------------------+              +------------------------------+
```

---

## 2. Component Breakdown

### A. Frontend Layer (React 18 + Vite)
- **State & Routing**: React Context API (`AuthContext`, `ToastContext`), React Router DOM v6 with route-level role protection guards.
- **UI Components**: Reusable components (`Button`, `Card`, `Badge`, `Modal`, `Toast`, `Table`, `Input`) styled with Tailwind CSS.
- **HTTP Client**: Axios client with interceptors injecting `Authorization: Bearer <token>` and handling centralized 401/403 redirects.
- **Port**: `3000` (dev server).

### B. Backend API Layer (Node.js + Express)
- **Controllers & Services**: Separation of concerns between routing (`routes/`), request validation/response handling (`controllers/`), and business domain logic (`services/`).
- **Security & RBAC**: Password hashing via `bcryptjs`, token signing with `jsonwebtoken`, and middleware guards verifying user role privileges (`CUSTOMER`, `STORE_OWNER`, `ADMIN`).
- **Port**: `5000`.

### C. Database Layer (MongoDB + Mongoose)
- **Geospatial Queries**: GeoJSON Point coordinates with `2dsphere` indexes on `Store.location` for fast radius-based marketplace queries (`$nearSphere`).
- **Concurrency & Atomicity**: Atomic `$gte` conditions during stock reservations to prevent overselling across concurrent user sessions.
- **Compound Constraints**: Unique compound indexes (e.g. `{ batchId: 1, status: 1 }`) preventing duplicate active flash sales on a single batch.

### D. Scheduled Jobs (Node-Cron)
- **Expiry Monitoring Job (`0 * * * *`)**:
  - Executes every hour at minute 0.
  - Automatically identifies batches past their `expiryDate`.
  - Marks batches and associated active flash sales as `EXPIRED`.
  - Logs execution telemetry to `JobExecution` collection.
- **Reservation Cleanup Job (`*/5 * * * *`)**:
  - Executes every 5 minutes.
  - Scans for reservations exceeding the 30-minute window (`reservationExpiresAt < now`).
  - Marks reservations `EXPIRED` and atomically restores stock to the original inventory batch.

### E. Machine Learning Service (Python + FastAPI)
- **Model**: `RandomForestRegressor` trained on completed order history.
- **Feature Pipeline**:
  - Temporal: `day_of_week`, `day_of_month`, `month`, `is_weekend`.
  - Pricing Dynamics: `discount_percentage`, `unit_price`.
  - Autoregressive Signals: `demand_lag_1`, `demand_lag_7`, `rolling_mean_7`, `rolling_mean_14`.
- **Validation**: Strict chronological time-series splitting to prevent lookahead data leakage.
- **Cold-Start Protection**: Returns `INSUFFICIENT_DATA` status when `< 30` completed transactions exist for a product, avoiding fabricated metrics.
- **Port**: `8001`.

---

## 3. Core Business Flows

### A. Dynamic Pricing & Flash Sale Creation Flow
```
Store Owner adds Inventory Batch with Expiry Date
                    ↓
Hourly Cron / Pricing Engine computes daysRemaining = expiryDate - today
                    ↓
Applies non-compounding discount rule:
  > 7 days  → 0%
  4-7 days  → 10%
  2-3 days  → 20%
  1 day     → 40%
  0 days    → 60%
  < 0 days  → Marked EXPIRED (₹0)
                    ↓
Store Owner creates Flash Sale (quantity validated against available batch stock)
                    ↓
Deal appears publicly in Marketplace for nearby customers
```

### B. Customer Reservation & Order Lifecycle Flow
```
Customer browses Marketplace (filtered by 5km radius or category)
                    ↓
Customer clicks "Reserve Deal" with quantity Q
                    ↓
Backend performs atomic update:
  InventoryBatch.findOneAndUpdate(
    { _id: batchId, quantity: { $gte: Q } },
    { $inc: { quantity: -Q, reservedQuantity: +Q } }
  )
                    ↓
Order created with status PENDING_PICKUP and expiresAt = now + 30 minutes
                    ↓
        +-----------+-----------+
        |                       |
        v                       v
Customer picks up & completes   Customer cancels or 30-min timer expires
        ↓                               ↓
Status: COMPLETED               Status: CANCELLED / EXPIRED
reservedQuantity decremented    quantity restored (+Q), reservedQuantity (-Q)
```
