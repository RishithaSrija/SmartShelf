# SmartShelf

SmartShelf is an expiry-aware dynamic pricing and local flash-sale platform designed for small grocery stores and restaurants. It bridges inventory management, automated markdown scheduling, machine learning demand forecasting, and real-time customer reservations to minimize food waste while maximizing retail recovery value.

---

## Problem Statement

Small grocery stores, bakeries, and local restaurants generate substantial food waste due to:
- **Static Pricing Models**: Perishable inventory remains at full price until past its expiration date, resulting in total loss and disposal.
- **Manual Markdown Inefficiencies**: Store staff lack automated mechanisms to monitor expiry thresholds and adjust prices across diverse inventory batches.
- **Discovery Bottlenecks**: Nearby consumers looking for discounted groceries and prepared meals have no real-time visibility into imminent-expiry items available in their immediate geographic vicinity.

---

## Solution

SmartShelf establishes an end-to-end automated lifecycle:

```
Product
  ↓
Inventory Batch (with batch-level expiry tracking)
  ↓
Automated Expiry Monitoring (hourly cron scheduler)
  ↓
Dynamic Pricing Engine (rule-based percentage markdowns)
  ↓
Flash Sale Creation (inventory eligibility & duplicate prevention)
  ↓
Nearby Discovery (MongoDB 2dsphere GeoJSON proximity search)
  ↓
Customer Reservation (atomic stock reservation & 30-min window)
  ↓
Order Fulfillment / Restorative Cancellation
```

---

## Technology Stack

- **Frontend**:
  - React 18
  - Vite
  - React Router DOM v6
  - Tailwind CSS & Lucide Icons
  - Axios (with centralized JWT request & error interceptors)
  - Recharts (for analytics and trend visualizations)

- **Backend**:
  - Node.js & Express
  - JWT Authentication & Role-Based Access Control (`CUSTOMER`, `STORE_OWNER`, `ADMIN`)
  - Mongoose ODM
  - Geolocation (GeoJSON Point with 2dsphere indexing)
  - Node-Cron (automated background task scheduling)

- **Database**:
  - MongoDB
  - 2dsphere geospatial indexing for store locations
  - Compound unique constraints preventing duplicate active sales per batch
  - Atomic reservation operations via `$gte` decrement guarantees

- **Machine Learning**:
  - Python 3.10+
  - FastAPI & Uvicorn
  - scikit-learn (`RandomForestRegressor`)
  - Pandas & NumPy (chronological feature engineering with lag/rolling statistics)

---

## Architecture

SmartShelf operates on a decoupled multi-tier service architecture:

```
+-------------------------------------------------------------+
|                      React 18 / Vite Client                 |
|                   (http://localhost:3000)                   |
+-------------------------------------------------------------+
                              |
                              | HTTP / REST (JWT Auth)
                              v
+-------------------------------------------------------------+
|                  Node.js / Express Backend API              |
|                   (http://localhost:5000)                   |
|  +---------------------+  +-------------------------------+ |
|  |  Auth / RBAC Guards |  |  Dynamic Pricing Engine       | |
|  +---------------------+  +-------------------------------+ |
|  |  Hourly Expiry Cron |  |  5-Min Reservation Cleanup    | |
|  +---------------------+  +-------------------------------+ |
+-------------------------------------------------------------+
         /                                           \
        / Mongoose / 2dsphere                         \ HTTP / JSON
       v                                               v
+-----------------------+              +------------------------------+
|     MongoDB Database  |              |    FastAPI ML Service        |
| (localhost:27017)     |              |    (http://localhost:8001)   |
| - 2dsphere indexes    |              | - RandomForestRegressor      |
| - Atomic transactions |              | - Feature Engineering        |
+-----------------------+              | - Fallback protections       |
                                       +------------------------------+
```

---

## Main Features

1. **Authentication & RBAC**: Secure JWT-based access controls with strict role segregation (`CUSTOMER`, `STORE_OWNER`, `ADMIN`).
2. **Store Management**: Store registration, business hours, geocoded address management, and verification status.
3. **Product Catalog**: Centralized catalog with SKU, category, unit, barcode, and base price management.
4. **Batch-Level Inventory**: Tracking individual stock batches with manufacture dates, expiry dates, batch numbers, and live remaining quantities.
5. **Expiry-Aware Dynamic Pricing**: Automated pricing rules applied based on remaining shelf life.
6. **Automated Expiry Monitoring**: Background cron jobs that transition expired batches to `EXPIRED` status, deactivating linked Flash Sales automatically.
7. **Flash Sales Management**: Store owners create discounted flash sales with defined time windows, inventory limits, and promotional discounts.
8. **Nearby Flash Sale Discovery**: Real-time radius query (e.g., 5km) finding active flash sales around customer coordinates using MongoDB `$nearSphere`.
9. **Customer Reservations**: Atomic reservation locks that hold stock for a 30-minute pickup window, preventing overselling.
10. **Order Lifecycle**: Tracks statuses (`PENDING_PICKUP`, `COMPLETED`, `CANCELLED`, `EXPIRED`) with automatic inventory restoration upon cancellation or timeout.
11. **Admin Dashboard**: System-wide KPIs for food waste diverted, stores, users, inventory, system health, and cron execution logs.
12. **Activity Audit Logs**: Granular logging of critical administrative and store events.
13. **Demand Forecasting**: ML-powered sales demand predictions per product based on historical order volume, price elasticity, and temporal features.

---

## Dynamic Pricing

SmartShelf dynamically calculates discounted prices directly against `originalPrice` to ensure **no compounding discounts**.

### Active Rule Tiers:
| Days Remaining Until Expiry | Discount Applied | Formula |
|---|---|---|
| **> 7 days** (8–9999 days) | **0%** (Full Price) | `originalPrice * 1.0` |
| **4 to 7 days** | **10% OFF** | `originalPrice * 0.9` |
| **2 to 3 days** | **20% OFF** | `originalPrice * 0.8` |
| **1 day remaining** | **40% OFF** | `originalPrice * 0.6` |
| **0 days remaining** (Expires today) | **60% OFF** | `originalPrice * 0.4` |
| **< 0 days** (Expired) | **₹0.00** (Deactivated) | Marked `EXPIRED` |

---

## Reservation System

- **Atomic Reservations**: Reservations decrement available batch quantity via atomic MongoDB operators (`{ quantity: { $gte: reserveQty } }`), eliminating race conditions and overselling during concurrent user requests.
- **30-Minute Reservation Window**: Each customer reservation is assigned an expiry timestamp 30 minutes from creation (`expiresAt`).
- **Cancellation Stock Restoration**: When a customer cancels an order or store owner marks it cancelled, the reserved quantity is immediately restored to the active inventory batch.
- **Automated Expiry Restoration**: If the 30-minute pickup window lapses without completion, the scheduled reservation cleaner automatically marks the order `EXPIRED` and returns stock to the inventory batch.

---

## Geolocation

- **GeoJSON Point Schema**: Stores maintain standard GeoJSON geometry `{ type: "Point", coordinates: [longitude, latitude] }`.
- **2dsphere Indexing**: The `location` field is indexed using MongoDB `2dsphere`.
- **Radius-Based Search**: Customer searches utilize MongoDB `$geoNear` / `$nearSphere` with `$maxDistance` in meters (e.g., 5000m for 5km radius) to return active flash sales sorted by proximity.

---

## Machine Learning

- **Demand Forecasting Engine**: Utilizes scikit-learn's `RandomForestRegressor` with feature engineering over completed historical order data.
- **Feature Pipeline**:
  - Temporal features: Day of week, month, day of month, weekend indicator.
  - Price & discount dynamics: Discount percentage, effective sale price.
  - Historical trends: Lagged demand (lag-1, lag-7) and rolling averages (7-day, 14-day rolling mean).
- **Chronological Data Split**: Training/validation splits strictly preserve temporal ordering to avoid lookahead data leakage.
- **Insufficient-Data Protection**: When fewer than 30 historical records exist for a product, the system returns `status: INSUFFICIENT_DATA` with a clear message and safe baseline fallback.
- **Resilience & Fallback**: If the ML service is unreachable, the Node backend responds gracefully without interrupting customer or store workflows.

---

## Major API Route Groups

| Endpoint Group | Description | Access |
|---|---|---|
| `/api/auth` | Register, login, current user session | Public / Authenticated |
| `/api/stores` | Store profile, onboarding, and location updates | Authenticated (`STORE_OWNER`, `ADMIN`) |
| `/api/products` | Product catalog CRUD operations | Authenticated (`STORE_OWNER`, `ADMIN`) |
| `/api/inventory` | Inventory batch creation, adjustment, and tracking | Authenticated (`STORE_OWNER`, `ADMIN`) |
| `/api/pricing` | Dynamic pricing rules configuration | Authenticated (`STORE_OWNER`) |
| `/api/flash-sales` | Public flash sales discovery & store owner sale management | Public / `STORE_OWNER` |
| `/api/orders` | Customer reservations, order lifecycle, cancellations | Authenticated (`CUSTOMER`, `STORE_OWNER`, `ADMIN`) |
| `/api/admin` | User management, store verification, analytics, audit logs | Authenticated (`ADMIN`) |
| `/api/admin/jobs` | Job monitoring, manual cron execution triggers | Authenticated (`ADMIN`) |
| `/api/ml` | Demand prediction proxy and training triggers | Authenticated (`STORE_OWNER`, `ADMIN`) |

---

## Scheduled Background Jobs

- **Expiry Monitoring Job** (`0 * * * *` — Runs hourly at minute 0):
  - Scans all active inventory batches across all stores.
  - Identifies batches whose expiry date has passed (`expiryDate < now`).
  - Automatically updates batch status to `EXPIRED` and marks linked Flash Sales `EXPIRED`.
  - Records execution metrics, duration, and status in `JobExecution` for admin health visibility.

- **Reservation Cleanup Job** (`*/5 * * * *` — Runs every 5 minutes):
  - Queries for orders with status `PENDING_PICKUP` where `reservationExpiresAt < now`.
  - Transitions order status to `EXPIRED`.
  - Atomically increments available inventory batch quantity to restore unsold items.
  - Updates linked Flash Sale stock and records job execution status.

---

## Running Locally

### Prerequisites
- Node.js (v18+)
- MongoDB (v6.0+) running locally on port `27017`
- Python (v3.10+)

### 1. Start MongoDB
```powershell
mongod --dbpath "C:\data\db"
```

### 2. Start Backend API Server
```powershell
cd server
npm start
# Server starts on http://localhost:5000
```

### 3. Start Frontend Client
```powershell
cd client
npm run dev
# Client starts on http://localhost:3000
```

### 4. Start Python FastAPI ML Service
```powershell
cd ml-service
.\venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 8001
# ML service starts on http://localhost:8001
```

---

## Environment Variables

### Backend (`server/.env`)
| Variable | Description |
|---|---|
| `PORT` | API server port (Default: `5000`) |
| `MONGO_URI` | MongoDB connection URI |
| `JWT_SECRET` | Secret key for JWT signing |
| `ML_SERVICE_URL` | Base URL of FastAPI ML service (e.g. `http://localhost:8001`) |
| `CLIENT_URL` | Frontend URL for CORS whitelisting (e.g. `http://localhost:3000`) |

### Frontend (`client/.env`)
| Variable | Description |
|---|---|
| `VITE_API_URL` | Base URL for the Express API (e.g. `http://localhost:5000/api`) |

---

## Testing

### Automated Backend & Integration Suite
Executes 17 end-to-end integration test suites covering Auth, RBAC, Batches, Pricing, Concurrency, Geolocation, Orders, Admin, and ML:
```powershell
cd server
node test_full_smartshelf_suite.js
```

### Real Browser UI Verification Suite
Executes headless browser flows testing Customer, Store Owner, Admin, Direct Routes, and Responsive viewports:
```powershell
cd server
node test_browser_ui_flows.js
```

### Machine Learning PyTest Suite
```powershell
cd ml-service
.\venv\Scripts\pytest.exe tests/
```

### Frontend Production Build
```powershell
cd client
npm run build
```

---

## Project Structure

```
SmartShelf/
├── README.md
├── .gitignore
├── docs/
│   ├── ARCHITECTURE.md
│   └── DEVELOPMENT.md
├── client/
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── .env.example
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       ├── index.css
│       ├── components/
│       ├── context/
│       ├── pages/
│       │   ├── CustomerDashboard.jsx
│       │   ├── StoreOwnerDashboard.jsx
│       │   ├── Marketplace.jsx
│       │   ├── Orders.jsx
│       │   ├── admin/
│       │   └── store-owner/
│       └── services/
├── server/
│   ├── package.json
│   ├── server.js
│   ├── .env.example
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── jobs/
│   ├── test_full_smartshelf_suite.js
│   └── test_browser_ui_flows.js
└── ml-service/
    ├── requirements.txt
    ├── app/
    │   ├── main.py
    │   ├── model_service.py
    │   ├── feature_engineering.py
    │   ├── schemas.py
    │   └── config.py
    └── tests/
        └── test_model.py
```
