# SmartShelf Machine Learning Microservice

Python FastAPI microservice providing demand forecasting for retail products in the SmartShelf platform.

---

## 1. Problem Statement
Retail stores often struggle to forecast daily customer demand for perishable items (e.g. Milk, Bread, Fresh Produce). This leads to either:
- **Overstocking**: Products approach expiration and result in food waste.
- **Stockouts**: Lost sales and unserved customers.

The SmartShelf Demand Forecasting model estimates the expected units sold for a product on a target future date based on historical sales patterns.

---

## 2. Architecture & Separation of Concerns
```
React Frontend
      ↓ (HTTP JSON)
Node.js / Express Backend (Auth, MongoDB & Business Rules)
      ↓ (HTTP JSON / ML_SERVICE_URL)
Python FastAPI Microservice (Scikit-learn Model Inference)
```

- **Advisory Role**: Predictions provide decision-support insights to store owners. Predictions **never** automatically alter prices or trigger inventory purchases.
- **Data Privacy**: The ML service only receives anonymized product features; customer identities and credentials are never passed to the ML microservice.

---

## 3. Machine Learning Pipeline

### Feature Engineering
1. **Temporal Features**: `dayOfWeek`, `dayOfMonth`, `month`, `isWeekend`
2. **Category Encoding**: `categoryEncoded` (DAIRY, BAKERY, MEAT, PRODUCE, PANTRY, etc.)
3. **Lagged Features**: `lag_1` (1 day prior sales), `lag_7` (7 days prior sales)
4. **Rolling Means**: `rollingMean_7` (7-day average), `rollingMean_14` (14-day average)

> **Time-Series Safety**: Strict chronological splitting (first 80% train, last 20% test). No future lookahead leakage is permitted.

### Models Evaluated
- **Baseline**: `DummyRegressor(strategy="mean")`
- **Candidate Model**: `RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42)`

### Evaluation Metrics
- **MAE (Mean Absolute Error)**: Average magnitude of prediction errors in units.
- **RMSE (Root Mean Squared Error)**: Penalizes larger deviations.
- **R² Score**: Proportion of variance explained by model features.

---

## 4. Running the ML Service

### Local Setup & Training
```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Run data generation (for development validation) and model training
python train.py

# 3. Start the FastAPI microservice on port 8001
uvicorn app.main:app --port 8001 --reload
```

---

## 5. API Endpoints

### `GET /health`
Returns service status, model loaded flag, and evaluation performance metrics.

### `POST /predict`
Request payload:
```json
{
  "storeId": "store_01",
  "productId": "prod_01",
  "productCategory": "DAIRY",
  "date": "2026-08-26",
  "lag_1": 32.0,
  "lag_7": 30.0,
  "rollingMean_7": 31.5,
  "rollingMean_14": 30.2
}
```

Response:
```json
{
  "prediction": 33.4,
  "roundedPrediction": 33,
  "modelVersion": "1.0",
  "date": "2026-08-26",
  "productId": "prod_01",
  "storeId": "store_01"
}
```

### `POST /predict/batch`
Processes multiple product demand predictions in a single batch request.

---

## 6. Insufficient Data Behavior
When a product has fewer than **30 daily observations** in the database, the backend returns code `INSUFFICIENT_DATA` rather than guessing a fabricated prediction:
```json
{
  "success": false,
  "code": "INSUFFICIENT_DATA",
  "message": "Not enough historical sales data for a reliable prediction."
}
```
