# SmartShelf — Developer Setup Guide

This guide provides step-by-step instructions for configuring, developing, testing, and troubleshooting the SmartShelf platform.

---

## Service Ports Overview

| Service | Port | Base URL | Technology |
|---|---|---|---|
| **MongoDB** | `27017` | `mongodb://localhost:27017/smartshelf` | Database |
| **Backend API** | `5000` | `http://localhost:5000/api` | Node.js / Express |
| **Frontend Client** | `3000` | `http://localhost:3000` | React 18 / Vite |
| **ML Service** | `8001` | `http://localhost:8001` | Python / FastAPI |

---

## Prerequisites

- **Node.js**: v18.x or v20.x
- **MongoDB**: Community Server v6.0+ (with active service or local `mongod` daemon)
- **Python**: v3.10+
- **Browser**: Modern Chromium/Firefox for UI interactions

---

## Environment Setup

### 1. Backend Configuration (`server/.env`)
Copy the template and verify variables:
```bash
cp server/.env.example server/.env
```
Default required values:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/smartshelf
JWT_SECRET=your_secure_random_jwt_secret_key
ML_SERVICE_URL=http://localhost:8001
CLIENT_URL=http://localhost:3000
```

### 2. Frontend Configuration (`client/.env`)
Copy the template and verify variables:
```bash
cp client/.env.example client/.env
```
Default required values:
```env
VITE_API_URL=http://localhost:5000/api
```

### 3. ML Service Python Environment (`ml-service`)
Create and initialize the virtual environment:
```powershell
cd ml-service
python -m venv venv
.\venv\Scripts\pip install -r requirements.txt
```

---

## Service Startup Order

For reliable inter-service communication, start services in this order:

1. **MongoDB Database**:
   ```powershell
   mongod --dbpath "C:\data\db"
   ```

2. **Python FastAPI ML Service**:
   ```powershell
   cd ml-service
   .\venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 8001
   ```

3. **Node.js Express Backend**:
   ```powershell
   cd server
   npm start
   ```

4. **React Vite Frontend**:
   ```powershell
   cd client
   npm run dev
   ```

---

## Running Verification & Tests

### Backend Full Integration Test Suite (17 Suites)
```powershell
cd server
node test_full_smartshelf_suite.js
```

### Headless Browser End-to-End UI Verification
```powershell
cd server
node test_browser_ui_flows.js
```

### Machine Learning Unit & Regression Tests
```powershell
cd ml-service
.\venv\Scripts\pytest.exe tests/
```

### Frontend Production Build Test
```powershell
cd client
npm run build
```

---

## Common Development Troubleshooting

### 1. MongoDB Connection Refused (`ECONNREFUSED 127.0.0.1:27017`)
- Ensure the `mongod` process is running locally.
- If running as a Windows Service, check `Get-Service MongoDB` in PowerShell.

### 2. CORS Error in Browser Console
- Check `server/.env` and ensure `CLIENT_URL` matches the Vite dev server origin (`http://localhost:3000` or `http://localhost:5173`).

### 3. ML Service Connection Refusal (`ECONNREFUSED 127.0.0.1:8001`)
- The backend features graceful fallback when the ML service is offline.
- If demand forecasts are required, verify `uvicorn` is active on port `8001` and `GET http://localhost:8001/health` returns `200 OK`.

### 4. Port Conflict on Port 5000 or 3000
- Check active listening ports:
  ```powershell
  Get-NetTCPConnection -LocalPort 5000, 3000, 8001 -ErrorAction SilentlyContinue
  ```
