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
  - Razorpay SDK (online payments, HMAC-SHA256 crypto verification, refunds, and webhooks)
  - Cloudinary SDK (product image upload and responsive CDN delivery)

- **Database**:
  - MongoDB
  - 2dsphere geospatial indexing for store locations
  - Compound unique constraints preventing duplicate active sales per batch
  - Compound index on `basketGroupId` for multi-store ingredient basket orders
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
+-------------------------------------------------------------------------+
|                         React 18 / Vite Client                          |
|                       (http://localhost:3000)                           |
|  - Customer Dashboard (Personal / Business Shopping Modes)              |
|  - "Make Something" / Ingredient Basket Wizard (/customer/make-something)|
|  - Store Owner Inventory Health & Order Acceptance Dashboard            |
|  - Razorpay Checkout Modal Integration                                  |
+-------------------------------------------------------------------------+
                                     |
                                     | HTTP / REST (JWT Auth)
                                     v
+-------------------------------------------------------------------------+
|                      Node.js / Express Backend API                      |
|                       (http://localhost:5000)                           |
|  +---------------------+  +--------------------+  +------------------+  |
|  |  Auth / RBAC Guards |  | Dynamic Pricing    |  | Ingredient Basket|  |
|  +---------------------+  +--------------------+  +------------------+  |
|  |  Hourly Expiry Cron |  | 5-Min Cleanup Cron |  | Waste Rescue Svc |  |
|  +---------------------+  +--------------------+  +------------------+  |
|  |  Razorpay Service   |  | Webhook Verifier   |  | Order Service    |  |
|  +---------------------+  +--------------------+  +------------------+  |
+-------------------------------------------------------------------------+
         /                     |                     \              \
        / Mongoose             | Crypto / HTTP        \ HTTP/JSON    \ SDK / HTTPS
       v                       v                       v              v
+------------------+  +------------------+  +-----------------+  +-----------------+
|     MongoDB      |  |     Razorpay     |  |   FastAPI ML    |  |   Cloudinary    |
| (localhost:27017)|  | Payment Gateway  |  | (localhost:8001)|  | Cloud CDN       |
| - 2dsphere geo   |  | - Orders API     |  | - RandomForest  |  | - Product media |
| - Atomic holds   |  | - HMAC-SHA256    |  | - Demand Pred   |  | - Store badges  |
| - basketGroupId  |  | - Auto Refunds   |  | - Fallback safe |  | - Secure URLs   |
+------------------+  +------------------+  +-----------------+  +-----------------+
```

### System Component Interactions
- **React Frontend**: Communicates with Express via JWT-authenticated REST calls; renders the 4-step "Make Something" wizard with live deterministic ingredient scaling, expiry indicators, and embedded Razorpay payment checkout.
- **Express Backend**: Coordinates recipe calculations (`recipeCatalog.js`), expiry-prioritized inventory matching (`ingredientBasketService.js`), atomic reservation locking (`orderService.js`), and Razorpay signature verification (`razorpayService.js`).
- **MongoDB**: Enforces atomic stock holds via `$gte` decrement operators, executes geospatial 2dsphere `$nearSphere` queries for store discovery, and groups multi-store orders with indexed `basketGroupId`.
- **FastAPI ML Service**: Provides product demand forecasting; when combined with batch expiry dates, allows store owners to detect potential excess stock and convert it into Waste Rescue deals that feed into the Ingredient Basket.
- **Razorpay**: Provides online payments with cryptographic verification; orders rejected by store owners trigger automated refunds via the Razorpay Refunds API.
- **Cloudinary**: Stores and serves optimized product imagery across marketplace cards, recipe recommendations, and order details.

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
14. **Intelligent Business Mode & Waste Reduction**: Dual-mode shopping (Personal vs. Business) catering to Sweet Shops, Bakeries, Cafés, and Caterers with transparent "Why this matches you" explanations, urgent Waste Rescue deals (≤ 2 days left), and privacy-preserving buyer demand insights for stores.
15. **Razorpay Online Payments & Store Acceptance Workflow**: Production-grade payment gateway integration with HMAC-SHA256 signature verification, store owner accept/reject workflow, automatic instant refunds on rejection, and webhook raw-body idempotency.
16. **Ingredient Basket / "Make Something"**: Intent-driven commercial procurement allowing businesses to produce target recipes (e.g., Besan Laddu 10 kg), deterministically calculating required inputs, matching nearby expiry-prioritized inventory across stores, and placing grouped multi-store orders with 30-minute holds.

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

## Ingredient Basket / "Make Something" System

### Why This Feature Exists 
In traditional retail and e-commerce platforms, procurement is entirely item-centric: a chef or store owner must manually search for flour, then ghee, then sugar, guessing which stores have sufficient stock and comparing prices individually. 

Meanwhile, neighborhood grocery stores lose significant margins throwing away short-shelf-life ingredients that are still in prime condition for immediate cooking or baking.

The **Ingredient Basket ("Make Something")** feature fundamentally reimagines procurement by aligning directly with how commercial kitchens think:
> **"I want to make Besan Laddu (10 kg) tomorrow morning. Find me the ingredients nearby, prioritize items expiring soon to maximize my discounts, and reserve everything in one click."**

This transforms SmartShelf from a passive discount listing site into an active **production supply-chain optimizer** that prevents edible food from reaching landfills.

### Business Value
- **Production-Driven Procurement**: Businesses order raw materials tailored to their exact production batches rather than guessing individual item quantities.
- **Waste Reduction at Scale**: High-volume commercial kitchens absorb short-shelf-life inventory (1–3 days left) that individual household shoppers might avoid.
- **Bulk Cost Savings**: Commercial buyers save up to 40% on production inputs by bundling near-expiry markdown batches and active Flash Sales.
- **Merchant Inventory Velocity**: Stores liquidate near-expiry stock rapidly in wholesale quantities rather than recording a 100% loss upon expiration.
- **System-Wide Technological Synergy**: Unifies inventory batch tracking, expiry countdowns, dynamic markdown pricing, ML demand forecasting (excess stock detection), 30-minute atomic reservation holds, and Razorpay payment escrow into one cohesive workflow.

### Ingredient Basket Example

```
Customer wants to make Besan Laddu (10 kg Batch)
  ↓
1. Selects Recipe & Batch Size
   Customer selects "Besan Laddu" and specifies 10 kg target batch.
  ↓
2. Proportional Recipe Calculation
   SmartShelf deterministically scales ingredients:
   • Gram Flour (Besan): 5.0 kg
   • Pure Ghee: 2.5 kg
   • Sugar: 2.5 kg
  ↓
3. Expiry-Aware Inventory Discovery (Within 5 km radius)
   SmartShelf scans nearby store batches using multi-factor scoring:
   • Store A: Pure Cow Ghee 1L (2 days left, 24% Flash Sale) → Score: 180 (Top match)
   • Store A: Premium Chana Besan 1kg (3 days left, Healthy stock) → Score: 140
   • Store B: Refined Sugar 1kg (Sufficient stock) → Score: 120
  ↓
4. Basket Assembly & Availability Transparency
   Customer reviews basket: Besan (🟢 Available), Ghee (🟢 Available), Sugar (🟢 Available).
   Potential Savings: ₹320 (31% markdown vs. full retail).
  ↓
5. Multi-Store Reservation & Checkout
   Customer selects Razorpay Online Payment or Pay at Store.
   SmartShelf groups orders by store, generates a unified `basketGroupId`,
   and atomically locks batches with 30-minute reservation holds.
  ↓
6. Store Acceptance & Fulfillment
   Store A and Store B receive incoming orders labeled:
   [🍬 Ingredient Basket: Besan Laddu (10 kg Batch)].
   Store owners accept or reject; rejected items trigger automated instant refunds.
```

### End-to-End User Flow
1. **Initiation**: The customer navigates to **"🍬 Make Something"** (`/customer/make-something`) from the Customer Dashboard.
2. **Recipe Selection**: The user selects from 10 deterministic production recipes categorized under *Indian Sweets*, *Traditional Snacks*, and *Bakery*.
3. **Batch Sizing**: The user selects a preset (5 kg, 10 kg, 25 kg, 50 kg) or inputs a custom batch weight. The interface immediately renders a live proportional scaling table.
4. **Smart Expiry Matching**: Clicking *"Find Nearby Ingredients"* triggers `POST /api/ingredient-basket/match`. The backend matches nearby inventory and ranks candidates by:
   - Expiry urgency ($\le 2$ days remaining: $+60$ points).
   - Active Flash Sale discount ($+40$ points).
   - Stock sufficiency to fulfill scaled requirement ($+30$ points).
   - Proximity to customer coordinates.
5. **Basket Review & Store Alternatives**: Ingredients are clearly flagged as `AVAILABLE` (🟢), `PARTIALLY_AVAILABLE` (🟡), or `NOT_FOUND` (🔴). Users can swap between alternative nearby stores if multiple merchants stock an ingredient.
6. **Checkout & Multi-Store Order Placement**:
   - Items are grouped by `storeId`.
   - Clicking *"Reserve & Place Orders"* calls `POST /api/ingredient-basket/checkout`.
   - The system creates distinct store orders linked by a shared `basketGroupId` (e.g., `BASKET-1789400090057`).
   - If paying online, Razorpay initializes payment verification; upon signature validation, the orders move to `WAITING_FOR_STORE_ACCEPTANCE`.
7. **Store Owner Action**: Store owners view the incoming order with a distinct `[🍬 Ingredient Basket: Recipe]` badge and click **Accept** or **Reject**. Rejections instantly release inventory and trigger automated Razorpay refunds.

### Verified Implementation Artifacts
- **Recipe Catalog**: [server/data/recipeCatalog.js](file:///c:/UI_UX_Folder/SmartShelf/server/data/recipeCatalog.js) (10 recipes with ingredient proportions, search keywords, and unit conversions).
- **Database Schema**: [server/models/Order.js](file:///c:/UI_UX_Folder/SmartShelf/server/models/Order.js) (Added `orderType: 'INGREDIENT_BASKET'`, `recipeName`, `basketGroupId`, `ingredientName`, and compound index `{ basketGroupId: 1, customerId: 1 }`).
- **Backend Service**: [server/services/ingredientBasketService.js](file:///c:/UI_UX_Folder/SmartShelf/server/services/ingredientBasketService.js) (Catalog scaling, expiry-aware multi-store matching, grouped order creation).
- **Backend Controller**: [server/controllers/ingredientBasketController.js](file:///c:/UI_UX_Folder/SmartShelf/server/controllers/ingredientBasketController.js).
- **Backend Routes**: [server/routes/ingredientBasketRoutes.js](file:///c:/UI_UX_Folder/SmartShelf/server/routes/ingredientBasketRoutes.js) (Mounted at `/api/ingredient-basket`).
- **Frontend Service**: [client/src/services/ingredientBasketService.js](file:///c:/UI_UX_Folder/SmartShelf/client/src/services/ingredientBasketService.js).
- **Frontend Page**: [client/src/pages/customer/MakeSomething.jsx](file:///c:/UI_UX_Folder/SmartShelf/client/src/pages/customer/MakeSomething.jsx) (4-step interactive wizard).
- **UI Integration Badges**:
  - [client/src/pages/CustomerDashboard.jsx](file:///c:/UI_UX_Folder/SmartShelf/client/src/pages/CustomerDashboard.jsx): Make Something hero card & quick-select recipe pills.
  - [client/src/pages/customer/MyOrders.jsx](file:///c:/UI_UX_Folder/SmartShelf/client/src/pages/customer/MyOrders.jsx) & [OrderDetails.jsx](file:///c:/UI_UX_Folder/SmartShelf/client/src/pages/customer/OrderDetails.jsx): Order badge `[🍬 Ingredient Basket: {recipeName}]`.
  - [client/src/pages/store-owner/Orders.jsx](file:///c:/UI_UX_Folder/SmartShelf/client/src/pages/store-owner/Orders.jsx): Store order acceptance view highlighting recipe context.

---

## Demo Payment System (Academic & Portfolio Environment)

### Why SmartShelf Uses Demo Payments for Academic Projects
SmartShelf is designed and built as a college capstone and portfolio project. Requiring a registered commercial entity, merchant PAN/KYC, business bank account, and live gateway credentials would impose unnecessary barriers for examiners, evaluators, and recruiters running the project locally.

To address this, SmartShelf implements a **realistic, production-grade Demo Payment Provider (`DEMO`)** that simulates the entire financial and order fulfillment lifecycle without transferring real money or asking for sensitive credentials.

> **Architecture Note:** SmartShelf currently uses a simulated payment provider for academic/demo environments. The payment architecture is designed so Razorpay can be enabled later for production transactions after merchant onboarding and KYC.

### Payment & Order Lifecycle State Machine

SmartShelf strictly decouples **payment status** from **store acceptance**:
- Payment capture does **not** automatically mark an order accepted or completed.
- Paid orders transition to `WAITING_FOR_STORE_ACCEPTANCE`, holding reserved inventory under a 30-minute hold while giving the store owner full control to review shelf stock before confirmation.

```
Customer Checkout (Flash Sale Deal or Ingredient Basket)
  ↓
Payment Method: "Demo Payment" (Default Provider)
  ↓
Order Created: status: PENDING_PAYMENT, paymentStatus: PENDING
  ↓
Demo Payment Modal (Simulate UPI / Card / Net Banking)
  ↓
Customer Action: [Simulate Successful Payment]
  ↓
Payment Captured: paymentStatus: CAPTURED, status: WAITING_FOR_STORE_ACCEPTANCE
  ↓
Store Owner Reviews Order
  ├── [ACCEPT ORDER]
  │     ↓
  │   Order Status: ACCEPTED (Inventory confirmed, ready for customer pickup)
  │     ↓
  │   Complete Store Pickup → Order Status: COMPLETED
  │
  └── [REJECT ORDER]
        ↓
      Order Status: REJECTED (Reason recorded)
        ↓
      Demo Refund Processed: paymentStatus: REFUNDED (refundAmount: ₹XXXX, refundId: DEMO_RFND_...)
        ↓
      Inventory Restored: Batch quantity and Flash Sale stock atomically incremented
        ↓
      Customer Notified: Updated order timeline reflects refund
```

### Store Accept / Reject Workflow
Store owners receive real-time notifications when a paid order arrives:
1. **Accept Order**: Transitions order status from `WAITING_FOR_STORE_ACCEPTANCE` $\rightarrow$ `ACCEPTED`. Appends to order timeline and sends customer ready-for-pickup notification.
2. **Reject Order**: Transitions order status to `REJECTED`, safely restores reserved inventory batches, triggers automated demo refund (`paymentStatus: 'REFUNDED'`), records refund transaction metadata, and notifies customer with reason.

### Demo Refund Workflow
When a store owner rejects a paid order:
1. Order is marked `REJECTED`.
2. Payment transitions: `CAPTURED` $\rightarrow$ `REFUND_PENDING` $\rightarrow$ `REFUNDED`.
3. System records `refundAmount: order.totalPrice`, `refundId: 'DEMO_RFND_...'`, and `refundedAt: timestamp`.
4. Timeline records: `"Demo Refund Processed (₹XXXX) - Reason: ..."`
5. Customer is notified: `"Order declined by store. A simulated demo refund of ₹XXXX has been processed."`

### Example: Ingredient Basket with Demo Payment

```
Customer wants to make Besan Laddu (10 kg Batch)
  ↓
Selects batch size & ingredients from nearby stores
  ↓
Adds ingredients to Ingredient Basket
  ↓
Proceeds to Checkout → Selects "Demo Payment"
  ↓
Demo Payment Modal appears:
"Demo Payment — No real money will be charged."
Options: [🔘 UPI (Simulated)] [🔘 Card (Simulated)] [🔘 Net Banking (Simulated)]
  ↓
Customer clicks: [Simulate Successful Payment]
  ↓
Payment CAPTURED (Transaction ID: DEMO_TXN_...)
  ↓
Order status updated: WAITING_FOR_STORE_ACCEPTANCE
  ↓
Store owner receives incoming order: [🍬 Ingredient Basket: Besan Laddu]
  ↓
Store owner reviews shelf inventory and clicks [Accept Order] or [Reject Order]
  ↓
If rejected: Demo refund is processed immediately, paymentStatus becomes REFUNDED, and stock is restored.
```

### Security & Privacy Guarantees
- **No Sensitive Credential Collection**: Never prompts for, collects, or stores real card numbers, CVVs, expiry dates, UPI PINs, bank passwords, or OTPs.
- **Explicit Demo Identification**: Database records store `paymentProvider: 'DEMO'`, `isDemoPayment: true`, and `transactionId: 'DEMO_TXN_...'`.
- **RBAC Protection**: Customers cannot accept or reject orders; rival store owners are blocked from accepting orders for another store.

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
| `/api/auth` | Register, login, current user session, business shopping preferences | Public / Authenticated |
| `/api/stores` | Store profile, onboarding, and location updates | Authenticated (`STORE_OWNER`, `ADMIN`) |
| `/api/products` | Product catalog CRUD operations | Authenticated (`STORE_OWNER`, `ADMIN`) |
| `/api/inventory` | Inventory batch creation, adjustment, and tracking | Authenticated (`STORE_OWNER`, `ADMIN`) |
| `/api/pricing` | Dynamic pricing rules configuration | Authenticated (`STORE_OWNER`) |
| `/api/flash-sales` | Public flash sales discovery & store owner sale management | Public / `STORE_OWNER` |
| `/api/orders` | Customer reservations, Razorpay payments, store accept/reject, cancellations | Authenticated (`CUSTOMER`, `STORE_OWNER`, `ADMIN`) |
| `/api/ingredient-basket` | Recipe catalog, deterministic scaling, smart expiry matching, multi-store checkout | Public / Authenticated (`CUSTOMER`) |
| `/api/waste-rescue` | Urgent expiry deals (≤2 days), smart recommendations, store health & buyer demand | Public / Authenticated |
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
  - Queries for orders with status `PENDING_PICKUP` or `PENDING` where `reservationExpiresAt < now`.
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
| `RAZORPAY_KEY_ID` | Razorpay API Key ID for online payment orders |
| `RAZORPAY_KEY_SECRET` | Razorpay Key Secret for cryptographic HMAC verification and refunds |
| `RAZORPAY_WEBHOOK_SECRET` | Secret for authenticating Razorpay webhook notifications |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud identifier for image asset hosting |
| `CLOUDINARY_API_KEY` | Cloudinary API access key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |

### Frontend (`client/.env`)
| Variable | Description |
|---|---|
| `VITE_API_URL` | Base URL for the Express API (e.g. `http://localhost:5000/api`) |
| `VITE_RAZORPAY_KEY_ID` | Public Razorpay Key ID for client-side checkout modal |

---

## Testing

### Demo Payment & Order Lifecycle Suite
Executes 12 comprehensive scenarios testing the simulated payment flow, store owner accept/reject workflow, automated demo refunds, ingredient basket integration, and failure recovery:
```powershell
cd server
node test_demo_payment_suite.js
```

### Ingredient Basket ("Make Something") Automated Suite
Executes 5 end-to-end scenarios covering deterministic recipe scaling, expiry-aware multi-store matching, partial availability detection, atomic multi-store reservation holds, and store-owner order visibility:
```powershell
cd server
node test_ingredient_basket.js
```

### Razorpay Online Payment & Store Acceptance Suite
Executes 6 verification flows covering Razorpay order generation, cryptographic HMAC signature rejection/validation, store-owner accept/reject actions, automated refunds, and idempotent raw-body webhooks:
```powershell
cd server
node test_razorpay_payment_suite.js
```

### Business Mode & Waste Rescue Suite
Verifies customer business mode profiles, "Why this matches you" recommendation scoring, store inventory health breakdown, and privacy-preserving buyer demand insights:
```powershell
cd server
node test_business_mode_waste_rescue.js
```

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
│       │   ├── payment/
│       │   │   └── DemoPaymentModal.jsx
│       │   ├── preferences/
│       │   │   └── SmartPreferencesModal.jsx
│       │   └── ui/
│       ├── context/
│       ├── pages/
│       │   ├── CustomerDashboard.jsx
│       │   ├── StoreOwnerDashboard.jsx
│       │   ├── Marketplace.jsx
│       │   ├── FlashSaleDetails.jsx
│       │   ├── customer/
│       │   │   ├── MakeSomething.jsx
│       │   │   ├── MyOrders.jsx
│       │   │   └── OrderDetails.jsx
│       │   ├── admin/
│       │   └── store-owner/
│       │       ├── Orders.jsx
│       │       └── ExpiringSoon.jsx
│       └── services/
│           ├── paymentService.js
│           ├── ingredientBasketService.js
│           ├── wasteRescueService.js
│           └── api.js
├── server/
│   ├── package.json
│   ├── server.js
│   ├── .env.example
│   ├── config/
│   ├── controllers/
│   │   ├── paymentController.js
│   │   ├── ingredientBasketController.js
│   │   ├── wasteRescueController.js
│   │   ├── orderController.js
│   │   └── authController.js
│   ├── data/
│   │   └── recipeCatalog.js
│   ├── middleware/
│   ├── models/
│   │   ├── Order.js
│   │   ├── Product.js
│   │   ├── User.js
│   │   └── InventoryBatch.js
│   ├── routes/
│   │   ├── paymentRoutes.js
│   │   ├── ingredientBasketRoutes.js
│   │   ├── wasteRescueRoutes.js
│   │   └── orderRoutes.js
│   ├── services/
│   │   ├── demoPaymentService.js
│   │   ├── ingredientBasketService.js
│   │   ├── wasteRescueService.js
│   │   ├── orderService.js
│   │   └── razorpayService.js
│   ├── jobs/
│   ├── test_demo_payment_suite.js
│   ├── test_ingredient_basket.js
│   ├── test_razorpay_payment_suite.js
│   ├── test_business_mode_waste_rescue.js
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
