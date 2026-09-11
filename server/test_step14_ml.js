const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const { spawn } = require('child_process');
const axios = require('axios');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');
const Store = require('./models/Store');
const Product = require('./models/Product');
const InventoryBatch = require('./models/InventoryBatch');
const Order = require('./models/Order');
const PredictionLog = require('./models/PredictionLog');

const mlService = require('./services/mlService');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/smartshelf';
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001';

async function waitForMLService(maxRetries = 15, delayMs = 600) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await axios.get(`${ML_SERVICE_URL}/health`, { timeout: 1000 });
      if (res.data?.status === 'healthy') {
        return true;
      }
    } catch (e) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  return false;
}

async function runTests() {
  console.log('=================================================================');
  console.log('--- Starting Step 14 ML Demand Prediction Test Suite ---');
  console.log('=================================================================');

  let mlProcess = null;

  try {
    await mongoose.connect(MONGO_URI);
    console.log('✓ Connected to MongoDB');

    // 1. Start Python ML Microservice in background for test
    console.log('\n--- Starting Python ML FastAPI Service (Port 8001) ---');
    const mlDir = path.join(__dirname, '..', 'ml-service');
    mlProcess = spawn('python', ['-m', 'uvicorn', 'app.main:app', '--port', '8001'], {
      cwd: mlDir,
      stdio: 'pipe'
    });

    mlProcess.stderr.on('data', (d) => {
      // Optional logging
    });

    const isHealthy = await waitForMLService();
    if (!isHealthy) {
      throw new Error('Python ML microservice failed to become healthy on port 8001');
    }
    console.log('✓ Python FastAPI microservice is ONLINE and HEALTHY.');

    // Clean previous test data
    await User.deleteMany({ email: /testml_.*@smartshelf\.com/ });

    // Setup Test Store Owners, Customer, Stores & Products
    const storeOwnerA = await User.create({
      name: 'ML Owner A',
      email: `testml_owner_a_${Date.now()}@smartshelf.com`,
      password: 'password123',
      role: 'STORE_OWNER',
      isActive: true
    });

    const storeOwnerB = await User.create({
      name: 'ML Owner B',
      email: `testml_owner_b_${Date.now()}@smartshelf.com`,
      password: 'password123',
      role: 'STORE_OWNER',
      isActive: true
    });

    const customerUser = await User.create({
      name: 'ML Customer',
      email: `testml_cust_${Date.now()}@smartshelf.com`,
      password: 'password123',
      role: 'CUSTOMER',
      isActive: true
    });

    const storeA = await Store.create({
      name: 'FreshMart A',
      ownerId: storeOwnerA._id,
      address: '101 Sector 1',
      businessType: 'GROCERY',
      location: { type: 'Point', coordinates: [80.648, 16.506] },
      isActive: true
    });

    const storeB = await Store.create({
      name: 'Bakery B',
      ownerId: storeOwnerB._id,
      address: '202 Sector 2',
      businessType: 'BAKERY',
      location: { type: 'Point', coordinates: [80.649, 16.507] },
      isActive: true
    });

    const productA = await Product.create({
      storeId: storeA._id,
      name: 'Fresh Organic Milk (1L)',
      category: 'DAIRY',
      unit: 'bottle',
      basePrice: 60
    });

    const productB = await Product.create({
      storeId: storeB._id,
      name: 'Artisan Sourdough Loaf',
      category: 'BAKERY',
      unit: 'piece',
      basePrice: 85
    });

    // Create active inventory batch for productA
    const batchA = await InventoryBatch.create({
      storeId: storeA._id,
      productId: productA._id,
      batchNumber: 'BAT-ML-001',
      quantity: 25,
      originalPrice: 60,
      currentPrice: 60,
      discountPercentage: 0,
      manufactureDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      expiryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // expires in 2 days
      status: 'AVAILABLE'
    });

    console.log('✓ Test stores, products, and inventory setup complete.');

    // -------------------------------------------------------------
    // TEST 1: Direct Python ML Microservice Endpoints
    // -------------------------------------------------------------
    console.log('\n--- TEST 1: Direct ML Service API Verification ---');
    const healthRes = await axios.get(`${ML_SERVICE_URL}/health`);
    console.assert(healthRes.data.status === 'healthy', 'Health status must be healthy');
    console.assert(healthRes.data.modelLoaded === true, 'Model must be loaded');
    console.assert(healthRes.data.modelVersion === '1.0', 'Model version must match 1.0');
    console.log(`✓ Direct Health API: Status=${healthRes.data.status}, ModelLoaded=${healthRes.data.modelLoaded}, Version=${healthRes.data.modelVersion}`);

    const singlePredRes = await axios.post(`${ML_SERVICE_URL}/predict`, {
      storeId: String(storeA._id),
      productId: String(productA._id),
      productCategory: 'DAIRY',
      date: '2026-08-30',
      lag_1: 30,
      lag_7: 28,
      rollingMean_7: 29.5,
      rollingMean_14: 29.0
    });
    console.assert(typeof singlePredRes.data.prediction === 'number', 'Prediction must be a number');
    console.assert(singlePredRes.data.prediction >= 0, 'Prediction must be non-negative');
    console.assert(singlePredRes.data.roundedPrediction >= 0, 'Rounded prediction must be integer >= 0');
    console.log(`✓ Direct Single Prediction: Raw=${singlePredRes.data.prediction}, Rounded=${singlePredRes.data.roundedPrediction}`);

    // Batch prediction
    const batchPredRes = await axios.post(`${ML_SERVICE_URL}/predict/batch`, {
      items: [
        {
          storeId: String(storeA._id),
          productId: String(productA._id),
          productCategory: 'DAIRY',
          date: '2026-08-30',
          lag_1: 30,
          lag_7: 28,
          rollingMean_7: 29.5,
          rollingMean_14: 29.0
        },
        {
          storeId: String(storeB._id),
          productId: String(productB._id),
          productCategory: 'BAKERY',
          date: '2026-08-30',
          lag_1: 20,
          lag_7: 22,
          rollingMean_7: 21.0,
          rollingMean_14: 20.5
        }
      ]
    });
    console.assert(batchPredRes.data.totalCount === 2, 'Batch count must be 2');
    console.log(`✓ Direct Batch Prediction: Processed ${batchPredRes.data.totalCount} items.`);

    // -------------------------------------------------------------
    // TEST 2: Authorization & Store Ownership Security
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Authorization & Store Ownership Security ---');
    // Store Owner A requesting prediction for Store Owner B's product
    let unauthorizedAccessBlocked = false;
    try {
      await mlService.getDemandPrediction(storeOwnerA._id, productB._id, '2026-08-30');
    } catch (err) {
      unauthorizedAccessBlocked = true;
      console.log(`✓ Cross-store access blocked: "${err.message}"`);
    }
    console.assert(unauthorizedAccessBlocked, 'Store Owner A must NOT access predictions for Store B');

    // -------------------------------------------------------------
    // TEST 3: Insufficient Historical Data Threshold (< 30 observations)
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Insufficient Historical Data Threshold ---');
    // Product A currently has 0 completed orders
    const insufficientRes = await mlService.getDemandPrediction(storeOwnerA._id, productA._id, '2026-08-30');
    console.assert(insufficientRes.success === false, 'Must indicate unsuccess for insufficient data');
    console.assert(insufficientRes.code === 'INSUFFICIENT_DATA', 'Must return INSUFFICIENT_DATA code');
    console.assert(insufficientRes.observationsCount === 0, 'Observations count must be 0');
    console.assert(insufficientRes.requiredObservations === 30, 'Required threshold is 30');
    console.log(`✓ Insufficient Data response: code="${insufficientRes.code}", msg="${insufficientRes.message}"`);

    // -------------------------------------------------------------
    // TEST 4: Seed Historical Orders and Test Successful End-to-End Prediction
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Seeding 35 Daily Completed Orders & End-to-End Prediction ---');
    const orderDocs = [];
    const now = Date.now();
    const mockSaleId = new mongoose.Types.ObjectId();

    for (let day = 35; day >= 1; day--) {
      const orderDate = new Date(now - day * 24 * 60 * 60 * 1000);
      orderDocs.push({
        orderNumber: `SS-ML-${day}-${Date.now()}`,
        customerId: customerUser._id,
        storeId: storeA._id,
        storeName: storeA.name,
        productId: productA._id,
        productName: productA.name,
        flashSaleId: mockSaleId,
        inventoryBatchId: batchA._id,
        quantity: 20 + (day % 7 === 0 ? 10 : 0), // weekend seasonality boost
        unitPrice: 60,
        totalPrice: (20 + (day % 7 === 0 ? 10 : 0)) * 60,
        status: 'COMPLETED',
        pickupDeadline: orderDate,
        reservationExpiresAt: new Date(orderDate.getTime() + 30 * 60 * 1000),
        createdAt: orderDate,
        updatedAt: orderDate
      });
    }
    await Order.insertMany(orderDocs);
    console.log(`✓ Seeded ${orderDocs.length} daily completed orders spanning 35 days.`);

    const predictionSuccess = await mlService.getDemandPrediction(storeOwnerA._id, productA._id, '2026-08-30');
    console.assert(predictionSuccess.success === true, 'Prediction must succeed with sufficient history');
    console.assert(typeof predictionSuccess.data.predictedDemand === 'number', 'Predicted demand must be a number');
    console.assert(predictionSuccess.data.currentInventory === 25, 'Current inventory must match batch quantity');
    console.assert(typeof predictionSuccess.data.inventoryInsight === 'string', 'Must provide inventory insight');
    console.assert(typeof predictionSuccess.data.expiryInsight === 'string', 'Must provide expiry insight');
    console.log(`✓ Prediction Generated: Expected Demand=${predictionSuccess.data.roundedPrediction} units, Inventory=${predictionSuccess.data.currentInventory}`);
    console.log(`  - Inventory Insight: "${predictionSuccess.data.inventoryInsight}"`);
    console.log(`  - Expiry Insight: "${predictionSuccess.data.expiryInsight}"`);

    // -------------------------------------------------------------
    // TEST 5: Prediction History Logging
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Prediction Logging & History Retrieval ---');
    const historyRes = await mlService.getPredictionHistory(storeOwnerA._id);
    console.assert(historyRes.logs.length >= 1, 'Must have recorded prediction log');
    const latestLog = historyRes.logs[0];
    console.assert(latestLog.productId._id.toString() === productA._id.toString(), 'Logged product matches');
    console.assert(latestLog.predictedDemand === predictionSuccess.data.roundedPrediction, 'Logged units match');
    console.log(`✓ PredictionLog retrieved: Product="${latestLog.productName}", Units=${latestLog.predictedDemand}, Date=${latestLog.predictionDate}`);

    // -------------------------------------------------------------
    // TEST 6: Admin ML Diagnostics API
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: Admin ML Status Diagnostics ---');
    const adminMLHealth = await mlService.getMLHealth();
    console.assert(adminMLHealth.serviceStatus === 'HEALTHY', 'Admin status must be HEALTHY');
    console.assert(adminMLHealth.modelLoaded === true, 'Admin status model loaded');
    console.assert(typeof adminMLHealth.metrics?.mae === 'number', 'MAE metric present');
    console.log(`✓ Admin ML Diagnostics: Status=${adminMLHealth.serviceStatus}, MAE=${adminMLHealth.metrics?.mae}, RMSE=${adminMLHealth.metrics?.rmse}`);

    // Cleanup test records
    console.log('\n--- Cleaning up test records ---');
    await Order.deleteMany({ customerId: customerUser._id });
    await PredictionLog.deleteMany({ storeId: storeA._id });
    await InventoryBatch.deleteMany({ _id: batchA._id });
    await Product.deleteMany({ _id: { $in: [productA._id, productB._id] } });
    await Store.deleteMany({ _id: { $in: [storeA._id, storeB._id] } });
    await User.deleteMany({ _id: { $in: [storeOwnerA._id, storeOwnerB._id, customerUser._id] } });
    console.log('✓ Test records cleaned up.');

    console.log('\n=============================================================');
    console.log('ALL STEP 14 ML DEMAND PREDICTION TESTS PASSED SUCCESSFULLY! ✓');
    console.log('=============================================================');
  } catch (err) {
    console.error('❌ Test suite failed with error:', err);
    process.exitCode = 1;
  } finally {
    if (mlProcess) {
      mlProcess.kill();
    }
    await mongoose.disconnect();
  }
}

runTests();
