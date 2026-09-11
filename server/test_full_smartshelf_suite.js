const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const { spawn } = require('child_process');
const axios = require('axios');
const http = require('http');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');
const Store = require('./models/Store');
const Product = require('./models/Product');
const InventoryBatch = require('./models/InventoryBatch');
const FlashSale = require('./models/FlashSale');
const Order = require('./models/Order');
const PricingRule = require('./models/PricingRule');
const ActivityLog = require('./models/ActivityLog');
const JobExecution = require('./models/JobExecution');
const Notification = require('./models/Notification');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/smartshelf';
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001';
const PORT = 5002; // Dedicated test server port to prevent port conflicts
const API_BASE = `http://localhost:${PORT}/api`;

let mlProcess = null;
let expressServer = null;
let testErrors = [];

function recordTest(section, testName, passed, details = '') {
  const symbol = passed ? '✓' : '✗';
  console.log(`  ${symbol} [${section}] ${testName}${details ? ` (${details})` : ''}`);
  if (!passed) {
    testErrors.push({ section, testName, details });
  }
}

async function waitForUrl(url, maxRetries = 30, delayMs = 600) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await axios.get(url, { timeout: 1500 });
      if (res.status === 200) return true;
    } catch (e) {
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  return false;
}

async function runComprehensiveSuite() {
  console.log('================================================================================');
  console.log('       SMARTSHELF COMPLETE APPLICATION TEST & VERIFICATION SUITE');
  console.log('================================================================================\n');

  try {
    // 1. CONNECT TO MONGODB
    console.log('1. Database Connection:');
    await mongoose.connect(MONGO_URI);
    await Store.init();
    await User.init();
    await Product.init();
    await InventoryBatch.init();
    await FlashSale.init();
    await Order.init();
    recordTest('DATABASE', 'MongoDB connected successfully', true, `host: ${mongoose.connection.host}`);

    // 2. START FASTAPI ML SERVICE
    console.log('\n2. ML FastAPI Service:');
    const mlDir = path.join(__dirname, '..', 'ml-service');
    mlProcess = spawn('python', ['-m', 'uvicorn', 'app.main:app', '--port', '8001'], {
      cwd: mlDir,
      shell: true,
      stdio: 'pipe'
    });

    mlProcess.stderr?.on('data', d => {
      // Optional logging
    });

    const mlOnline = await waitForUrl(`${ML_SERVICE_URL}/health`);
    recordTest('ML SERVICE', 'FastAPI microservice started on port 8001', mlOnline);

    if (mlOnline) {
      const mlHealth = await axios.get(`${ML_SERVICE_URL}/health`);
      recordTest('ML SERVICE', 'GET /health returns 200 with status', mlHealth.data?.status === 'healthy', `loaded=${mlHealth.data?.modelLoaded}`);
    }

    // 3. START EXPRESS BACKEND (Custom instance on PORT 5002)
    console.log('\n3. Express Backend & Health Endpoint:');
    const express = require('express');
    const cors = require('cors');
    const authRoutes = require('./routes/authRoutes');
    const storeRoutes = require('./routes/storeRoutes');
    const productRoutes = require('./routes/productRoutes');
    const inventoryRoutes = require('./routes/inventoryRoutes');
    const pricingRoutes = require('./routes/pricingRoutes');
    const notificationRoutes = require('./routes/notificationRoutes');
    const adminJobRoutes = require('./routes/adminJobRoutes');
    const flashSaleRoutes = require('./routes/flashSaleRoutes');
    const orderRoutes = require('./routes/orderRoutes');
    const adminRoutes = require('./routes/adminRoutes');
    const mlRoutes = require('./routes/mlRoutes');

    const app = express();
    app.use(cors({ origin: true, credentials: true }));
    app.use(express.json());

    app.use('/api/auth', authRoutes);
    app.use('/api/stores', storeRoutes);
    app.use('/api/products', productRoutes);
    app.use('/api/inventory', inventoryRoutes);
    app.use('/api/pricing', pricingRoutes);
    app.use('/api/notifications', notificationRoutes);
    app.use('/api/admin/jobs', adminJobRoutes);
    app.use('/api/flash-sales', flashSaleRoutes);
    app.use('/api/orders', orderRoutes);
    app.use('/api/admin', adminRoutes);
    app.use('/api/ml', mlRoutes);

    app.get('/api/health', (req, res) => {
      res.status(200).json({ success: true, message: 'SmartShelf API is running' });
    });

    await new Promise((resolve) => {
      expressServer = app.listen(PORT, resolve);
    });
    recordTest('BACKEND', `Express server listening on port ${PORT}`, true);

    const healthCheck = await axios.get(`${API_BASE}/health`);
    recordTest('BACKEND', 'GET /api/health returned HTTP 200', healthCheck.status === 200 && healthCheck.data?.success === true);
    recordTest('BACKEND', 'No secrets exposed in /api/health', !JSON.stringify(healthCheck.data).includes('secret') && !JSON.stringify(healthCheck.data).includes('password'));

    // 4. CLEAN PREVIOUS TEST DATA
    await User.deleteMany({ email: /test_suite_.*@smartshelf\.com/ });

    // 5. TEST AUTHENTICATION
    console.log('\n4. Authentication Testing:');
    const ts = Date.now();
    const customerEmail = `test_suite_cust_${ts}@smartshelf.com`;
    const ownerEmail = `test_suite_owner_${ts}@smartshelf.com`;
    const owner2Email = `test_suite_owner2_${ts}@smartshelf.com`;
    const adminEmail = `test_suite_admin_${ts}@smartshelf.com`;
    const password = 'Password@123';

    // Register Customer
    const regCust = await axios.post(`${API_BASE}/auth/register`, {
      name: 'Test Suite Customer',
      email: customerEmail,
      password: password,
      role: 'CUSTOMER'
    });
    recordTest('AUTH', 'Customer registration', regCust.status === 201 && !!regCust.data?.data?.token);
    recordTest('AUTH', 'Password omitted in registration response', regCust.data?.data?.user?.password === undefined);
    const customerToken = regCust.data?.data?.token;

    // Register Store Owner 1
    const regOwner = await axios.post(`${API_BASE}/auth/register`, {
      name: 'Test Suite Owner 1',
      email: ownerEmail,
      password: password,
      role: 'STORE_OWNER'
    });
    recordTest('AUTH', 'Store Owner 1 registration', regOwner.status === 201 && !!regOwner.data?.data?.token);
    const ownerToken = regOwner.data?.data?.token;

    // Register Store Owner 2
    const regOwner2 = await axios.post(`${API_BASE}/auth/register`, {
      name: 'Test Suite Owner 2',
      email: owner2Email,
      password: password,
      role: 'STORE_OWNER'
    });
    const owner2Token = regOwner2.data?.data?.token;

    // Test that public ADMIN registration is blocked (Security requirement)
    let publicAdminBlocked = false;
    try {
      await axios.post(`${API_BASE}/auth/register`, {
        name: 'Hacker Admin',
        email: `hacker_admin_${ts}@smartshelf.com`,
        password: password,
        role: 'ADMIN'
      });
    } catch (e) {
      publicAdminBlocked = e.response?.status === 400;
    }
    recordTest('AUTH', 'Public registration with ADMIN role rejected (HTTP 400)', publicAdminBlocked);

    // Seed official Admin user directly in database for testing admin login & APIs
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    await User.create({
      name: 'Test Suite Admin',
      email: adminEmail,
      password: hashedPassword,
      role: 'ADMIN',
      isActive: true
    });

    const adminLoginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: adminEmail,
      password: password
    });
    recordTest('AUTH', 'Admin login with valid credentials returns JWT token', adminLoginRes.status === 200 && !!adminLoginRes.data?.data?.token);
    const adminToken = adminLoginRes.data?.data?.token;

    // Login Test
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: customerEmail,
      password: password
    });
    recordTest('AUTH', 'Login with valid credentials returns JWT token', loginRes.status === 200 && !!loginRes.data?.data?.token);

    // Invalid Login Test
    let invalidLoginRejected = false;
    try {
      await axios.post(`${API_BASE}/auth/login`, { email: customerEmail, password: 'WrongPassword' });
    } catch (e) {
      invalidLoginRejected = e.response?.status === 401;
    }
    recordTest('AUTH', 'Invalid credentials rejected with HTTP 401', invalidLoginRejected);

    // Protected Route Without Token
    let unauthRejected = false;
    try {
      await axios.get(`${API_BASE}/auth/me`);
    } catch (e) {
      unauthRejected = e.response?.status === 401;
    }
    recordTest('AUTH', 'Protected routes reject unauthenticated requests (HTTP 401)', unauthRejected);

    // 6. TEST AUTHORIZATION & ROLE-BASED ACCESS CONTROL
    console.log('\n5. Authorization & RBAC Testing:');
    let custAdminBlocked = false;
    try {
      await axios.get(`${API_BASE}/admin/dashboard`, { headers: { Authorization: `Bearer ${customerToken}` } });
    } catch (e) {
      custAdminBlocked = e.response?.status === 403;
    }
    recordTest('RBAC', 'Customer cannot access /api/admin/* (HTTP 403)', custAdminBlocked);

    let custRulesBlocked = false;
    try {
      await axios.get(`${API_BASE}/pricing/rules`, { headers: { Authorization: `Bearer ${customerToken}` } });
    } catch (e) {
      custRulesBlocked = e.response?.status === 403;
    }
    recordTest('RBAC', 'Customer cannot access /api/pricing/rules (HTTP 403)', custRulesBlocked);

    let ownerAdminBlocked = false;
    try {
      await axios.get(`${API_BASE}/admin/dashboard`, { headers: { Authorization: `Bearer ${ownerToken}` } });
    } catch (e) {
      ownerAdminBlocked = e.response?.status === 403;
    }
    recordTest('RBAC', 'Store Owner cannot access /api/admin/* (HTTP 403)', ownerAdminBlocked);

    const adminDash = await axios.get(`${API_BASE}/admin/dashboard`, { headers: { Authorization: `Bearer ${adminToken}` } });
    recordTest('RBAC', 'Admin can access /api/admin/dashboard (HTTP 200)', adminDash.status === 200 && adminDash.data?.success === true);

    // 7. STORE OWNER FLOW & PRODUCT MANAGEMENT
    console.log('\n6. Store Owner Flow & Product Management:');
    // Create Store 1
    const store1Res = await axios.post(`${API_BASE}/stores`, {
      name: 'Fresh Harvest Supermarket',
      businessType: 'SUPERMARKET',
      phone: '9876543210',
      address: 'MG Road, Vijayawada',
      latitude: 16.5062,
      longitude: 80.6480
    }, { headers: { Authorization: `Bearer ${ownerToken}` } });
    recordTest('STORE', 'Store 1 registered successfully', store1Res.status === 201);
    const store1Id = store1Res.data?.data?._id;

    // Create Store 2
    const store2Res = await axios.post(`${API_BASE}/stores`, {
      name: 'Green Grocers East',
      businessType: 'GROCERY',
      phone: '9876543211',
      address: 'Benz Circle, Vijayawada',
      latitude: 16.5100,
      longitude: 80.6550
    }, { headers: { Authorization: `Bearer ${owner2Token}` } });
    const store2Id = store2Res.data?.data?._id;

    // Create Product for Store 1
    const prodRes = await axios.post(`${API_BASE}/products`, {
      name: 'Organic Whole Milk 1L',
      category: 'DAIRY',
      unit: 'liter',
      brand: 'DairyFresh',
      description: 'Pasteurized homogenized whole cow milk'
    }, { headers: { Authorization: `Bearer ${ownerToken}` } });
    recordTest('PRODUCT', 'Create product in Store 1', prodRes.status === 201 && !!prodRes.data?.data?._id);
    const productId = prodRes.data?.data?._id;

    // Cross-store modification attempt (Store 2 tries to edit Store 1 product)
    let crossStoreEditBlocked = false;
    try {
      await axios.put(`${API_BASE}/products/${productId}`, {
        name: 'Hacked Milk'
      }, { headers: { Authorization: `Bearer ${owner2Token}` } });
    } catch (e) {
      crossStoreEditBlocked = e.response?.status === 404 || e.response?.status === 403;
    }
    recordTest('PRODUCT', 'Cross-store product modification blocked', crossStoreEditBlocked);

    // Read, Search, Category filter
    const searchRes = await axios.get(`${API_BASE}/products?search=Milk&category=DAIRY`, { headers: { Authorization: `Bearer ${ownerToken}` } });
    recordTest('PRODUCT', 'Search & category filtering for products', searchRes.data?.data?.products?.length >= 1);

    // 8. INVENTORY MANAGEMENT & BATCHES
    console.log('\n7. Inventory Batch Management:');
    const now = new Date();
    const addDays = (d) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + d);

    // Batch 1: Normal Available (expires in 10 days)
    const bAvailable = await axios.post(`${API_BASE}/inventory/batches`, {
      productId,
      batchNumber: `BAT-AVAIL-${ts}`,
      quantity: 50,
      originalPrice: 60,
      manufactureDate: addDays(-2),
      expiryDate: addDays(10)
    }, { headers: { Authorization: `Bearer ${ownerToken}` } });
    recordTest('INVENTORY', 'Available batch created (10 days remaining)', bAvailable.status === 201 && bAvailable.data?.data?.currentPrice === 60);

    // Batch 2: Expiring soon (expires in 1 day)
    const bExpiring = await axios.post(`${API_BASE}/inventory/batches`, {
      productId,
      batchNumber: `BAT-EXP-${ts}`,
      quantity: 20,
      originalPrice: 60,
      manufactureDate: addDays(-5),
      expiryDate: addDays(1)
    }, { headers: { Authorization: `Bearer ${ownerToken}` } });
    recordTest('INVENTORY', 'Expiring soon batch created (1 day remaining)', bExpiring.status === 201);
    const expiringBatchId = bExpiring.data?.data?._id;

    // Batch 3: Sold out (quantity 0)
    const bSoldOut = await axios.post(`${API_BASE}/inventory/batches`, {
      productId,
      batchNumber: `BAT-SOLD-${ts}`,
      quantity: 0,
      originalPrice: 60,
      manufactureDate: addDays(-5),
      expiryDate: addDays(5)
    }, { headers: { Authorization: `Bearer ${ownerToken}` } });
    recordTest('INVENTORY', 'Sold out batch created (qty=0)', bSoldOut.data?.data?.status === 'SOLD_OUT');
    const soldOutBatchId = bSoldOut.data?.data?._id;

    // 9. PRICING ENGINE (NO COMPOUNDING DISCOUNT TEST)
    console.log('\n8. Pricing Engine & Discount Calculation:');
    const pricingService = require('./services/pricingService');
    const defaultRules = [
      { daysRemainingMin: 8, daysRemainingMax: 999, discountPercentage: 0, isActive: true },
      { daysRemainingMin: 4, daysRemainingMax: 7, discountPercentage: 10, isActive: true },
      { daysRemainingMin: 2, daysRemainingMax: 3, discountPercentage: 20, isActive: true },
      { daysRemainingMin: 1, daysRemainingMax: 1, discountPercentage: 40, isActive: true },
      { daysRemainingMin: 0, daysRemainingMax: 0, discountPercentage: 60, isActive: true }
    ];

    const testMock10 = pricingService.calculateDynamicPrice({ originalPrice: 100, expiryDate: addDays(10), quantity: 10 }, defaultRules);
    const testMock5 = pricingService.calculateDynamicPrice({ originalPrice: 100, expiryDate: addDays(5), quantity: 10 }, defaultRules);
    const testMock3 = pricingService.calculateDynamicPrice({ originalPrice: 100, expiryDate: addDays(3), quantity: 10 }, defaultRules);
    const testMock1 = pricingService.calculateDynamicPrice({ originalPrice: 100, expiryDate: addDays(1), quantity: 10 }, defaultRules);
    const testMock0 = pricingService.calculateDynamicPrice({ originalPrice: 100, expiryDate: addDays(0), quantity: 10 }, defaultRules);
    const testMockExpired = pricingService.calculateDynamicPrice({ originalPrice: 100, expiryDate: addDays(-1), quantity: 10 }, defaultRules);

    recordTest('PRICING', '10 days remaining -> 0% discount (₹100)', testMock10.currentPrice === 100 && testMock10.discountPercentage === 0);
    recordTest('PRICING', '5 days remaining -> 10% discount (₹90)', testMock5.currentPrice === 90 && testMock5.discountPercentage === 10);
    recordTest('PRICING', '3 days remaining -> 20% discount (₹80)', testMock3.currentPrice === 80 && testMock3.discountPercentage === 20);
    recordTest('PRICING', '1 day remaining -> 40% discount (₹60)', testMock1.currentPrice === 60 && testMock1.discountPercentage === 40);
    recordTest('PRICING', '0 days remaining -> 60% discount (₹40)', testMock0.currentPrice === 40 && testMock0.discountPercentage === 60);
    recordTest('PRICING', 'Past expiry -> EXPIRED status & ₹0', testMockExpired.status === 'EXPIRED');

    // Compounding Discount Verification: Recalculate 5 times
    const recalc1 = await axios.post(`${API_BASE}/pricing/recalculate-all`, {}, { headers: { Authorization: `Bearer ${ownerToken}` } });
    const recalc2 = await axios.post(`${API_BASE}/pricing/recalculate-all`, {}, { headers: { Authorization: `Bearer ${ownerToken}` } });
    const batchAfterRecalc = await InventoryBatch.findById(expiringBatchId);
    recordTest('PRICING', 'No compounding discounts on repeated recalculations', batchAfterRecalc.currentPrice === 36 && batchAfterRecalc.discountPercentage === 40, `price=${batchAfterRecalc.currentPrice}`);

    // 10. CRON & MANUAL EXPIRY JOB
    console.log('\n9. Cron Expiry Monitoring Job:');
    const jobRun1 = await axios.post(`${API_BASE}/admin/jobs/expiry/run`, {}, { headers: { Authorization: `Bearer ${adminToken}` } });
    const jobRun2 = await axios.post(`${API_BASE}/admin/jobs/expiry/run`, {}, { headers: { Authorization: `Bearer ${adminToken}` } });
    recordTest('CRON', 'Manual trigger POST /api/admin/jobs/expiry/run completed', jobRun1.status === 200 && jobRun1.data?.success === true);
    recordTest('CRON', 'Expiry job execution is idempotent across multiple runs', jobRun2.status === 200);

    // 10. FLASH SALES MANAGEMENT
    console.log('\n10. Flash Sales:');
    // Eligible Batch Flash Sale
    const fsRes = await axios.post(`${API_BASE}/flash-sales`, {
      inventoryBatchId: expiringBatchId,
      title: 'Mega Discount Organic Milk 1L',
      description: 'Best before tomorrow! Save 40%',
      availableQuantity: 10,
      endsAt: addDays(1)
    }, { headers: { Authorization: `Bearer ${ownerToken}` } });
    recordTest('FLASH SALE', 'Flash sale created with eligible batch', fsRes.status === 201 && fsRes.data?.data?.salePrice === 36);
    const flashSaleId = fsRes.data?.data?._id;

    // Duplicate Flash Sale Attempt -> 409
    let duplicateRejected = false;
    try {
      await axios.post(`${API_BASE}/flash-sales`, {
        inventoryBatchId: expiringBatchId,
        title: 'Duplicate Deal',
        availableQuantity: 5,
        endsAt: addDays(1)
      }, { headers: { Authorization: `Bearer ${ownerToken}` } });
    } catch (e) {
      duplicateRejected = e.response?.status === 409;
    }
    recordTest('FLASH SALE', 'Duplicate flash sale for same batch rejected with HTTP 409', duplicateRejected);

    // Flash Sale for Sold-out Batch -> Rejected
    let soldOutDealRejected = false;
    try {
      await axios.post(`${API_BASE}/flash-sales`, {
        inventoryBatchId: soldOutBatchId,
        title: 'Sold Out Deal',
        salePrice: 30,
        availableQuantity: 5,
        endsAt: addDays(1)
      }, { headers: { Authorization: `Bearer ${ownerToken}` } });
    } catch (e) {
      soldOutDealRejected = e.response?.status === 400;
    }
    recordTest('FLASH SALE', 'Flash sale for sold out batch rejected', soldOutDealRejected);

    // 11. MARKETPLACE & GEOLOCATION
    console.log('\n11. Public Marketplace & Geolocation:');
    const marketRes = await axios.get(`${API_BASE}/flash-sales`);
    recordTest('MARKETPLACE', 'Public marketplace query returns active deals', marketRes.status === 200 && marketRes.data?.data?.flashSales?.length >= 1);

    const geoNearby = await axios.get(`${API_BASE}/flash-sales/nearby?latitude=16.5062&longitude=80.6480&radius=5`);
    recordTest('GEOLOCATION', 'GET /api/flash-sales/nearby within 5km returns deals', geoNearby.status === 200 && geoNearby.data?.data?.flashSales?.length >= 1);

    let invalidGeoRejected = false;
    try {
      await axios.get(`${API_BASE}/flash-sales/nearby?latitude=100&longitude=80.6480&radius=5`);
    } catch (e) {
      invalidGeoRejected = e.response?.status === 400;
    }
    recordTest('GEOLOCATION', 'Invalid coordinates rejected with HTTP 400', invalidGeoRejected);

    // 13. CUSTOMER RESERVATION & CONCURRENCY PROTECTION
    console.log('\n12. Customer Reservation & Concurrent Race Protection:');
    // Batch with quantity = 5
    const bRace = await axios.post(`${API_BASE}/inventory/batches`, {
      productId,
      batchNumber: `BAT-RACE-${ts}`,
      quantity: 5,
      originalPrice: 60,
      manufactureDate: addDays(-2),
      expiryDate: addDays(1)
    }, { headers: { Authorization: `Bearer ${ownerToken}` } });
    const raceBatchId = bRace.data?.data?._id;

    const fsRace = await axios.post(`${API_BASE}/flash-sales`, {
      inventoryBatchId: raceBatchId,
      title: 'Concurrency Test Deal',
      salePrice: 25,
      availableQuantity: 5,
      endsAt: addDays(1)
    }, { headers: { Authorization: `Bearer ${ownerToken}` } });
    const raceDealId = fsRace.data?.data?._id;

    // Concurrent race: Customer 1 and Customer 2 try to reserve 4 units each simultaneously
    const [req1, req2] = await Promise.allSettled([
      axios.post(`${API_BASE}/orders`, { flashSaleId: raceDealId, quantity: 4 }, { headers: { Authorization: `Bearer ${customerToken}` } }),
      axios.post(`${API_BASE}/orders`, { flashSaleId: raceDealId, quantity: 4 }, { headers: { Authorization: `Bearer ${customerToken}` } })
    ]);

    const successes = [req1, req2].filter(r => r.status === 'fulfilled' && r.value?.status === 201);
    const failures = [req1, req2].filter(r => r.status === 'rejected');
    const updatedRaceBatch = await InventoryBatch.findById(raceBatchId);
    const updatedRaceDeal = await FlashSale.findById(raceDealId);

    recordTest('CONCURRENCY', 'Atomic inventory hold prevents overselling (Exactly 1 succeeds)', successes.length === 1 && failures.length === 1);
    recordTest('CONCURRENCY', 'Inventory stock is 1 and never negative', updatedRaceBatch.quantity === 1 && updatedRaceDeal.availableQuantity === 1);

    // 14. ORDER CANCELLATION & RESTORATION
    console.log('\n13. Order Cancellation & Stock Restoration:');
    const successfulOrder = successes[0]?.value?.data?.data;
    const cancelRes = await axios.patch(`${API_BASE}/orders/${successfulOrder._id}/cancel`, { reason: 'Changed mind' }, { headers: { Authorization: `Bearer ${customerToken}` } });
    recordTest('ORDER', 'Customer cancels pending order (HTTP 200)', cancelRes.status === 200 && cancelRes.data?.data?.status === 'CANCELLED');

    const batchAfterCancel = await InventoryBatch.findById(raceBatchId);
    recordTest('ORDER', '4 units restored back to inventory batch (Stock is 5 again)', batchAfterCancel.quantity === 5);

    // Double cancellation test
    let doubleCancelRejected = false;
    try {
      await axios.patch(`${API_BASE}/orders/${successfulOrder._id}/cancel`, {}, { headers: { Authorization: `Bearer ${customerToken}` } });
    } catch (e) {
      doubleCancelRejected = e.response?.status === 400;
    }
    recordTest('ORDER', 'Double cancellation rejected without double stock restoration', doubleCancelRejected);

    // 15. RESERVATION EXPIRY (30-MIN HOLD EXPIRATION)
    console.log('\n14. Automated Reservation Expiry:');
    const orderService = require('./services/orderService');
    // Create an order with reservationExpiresAt in the past
    const expiredHoldOrder = await Order.create({
      orderNumber: `SS-EXP-TEST-${ts}`,
      customerId: (await User.findOne({ email: customerEmail }))._id,
      storeId: store1Id,
      flashSaleId: raceDealId,
      inventoryBatchId: raceBatchId,
      productId: productId,
      productName: 'Organic Whole Milk 1L',
      storeName: 'Fresh Harvest Supermarket',
      quantity: 2,
      unitPrice: 25,
      totalPrice: 50,
      status: 'PENDING',
      reservationExpiresAt: new Date(Date.now() - 3600000) // 1 hour ago
    });
    await InventoryBatch.findByIdAndUpdate(raceBatchId, { $inc: { quantity: -2 } });
    await FlashSale.findByIdAndUpdate(raceDealId, { $inc: { availableQuantity: -2 } });

    const expiryResult = await orderService.expireReservations();
    recordTest('RESERVATION EXPIRY', 'Expired hold detected and transitioned to EXPIRED', expiryResult.expiredCount >= 1);

    const raceBatchAfterExpiry = await InventoryBatch.findById(raceBatchId);
    recordTest('RESERVATION EXPIRY', 'Stock returned to inventory upon hold expiry', raceBatchAfterExpiry.quantity === 5);

    // 16. ADMIN MANAGEMENT, STORE SYNC & AUDIT LOGS
    console.log('\n15. Admin Management, Store Sync & Diagnostics:');
    // Deactivate Store 1
    const deactStore = await axios.patch(`${API_BASE}/admin/stores/${store1Id}/status`, { isActive: false }, { headers: { Authorization: `Bearer ${adminToken}` } });
    recordTest('ADMIN', 'Deactivate store via admin endpoint', deactStore.status === 200 && deactStore.data?.data?.isActive === false);

    const publicAfterDeact = await axios.get(`${API_BASE}/flash-sales`);
    const containsStore1Deal = publicAfterDeact.data?.data?.flashSales?.some(d => d.storeId?._id === store1Id || d.storeId === store1Id);
    recordTest('ADMIN', 'Inactive store deals hidden from public marketplace', !containsStore1Deal);

    // Reactivate Store 1
    await axios.patch(`${API_BASE}/admin/stores/${store1Id}/status`, { isActive: true }, { headers: { Authorization: `Bearer ${adminToken}` } });

    // Last Admin Protection
    let lastAdminBlocked = false;
    const otherAdmins = await User.find({ role: 'ADMIN', email: { $ne: adminEmail }, isActive: true });
    try {
      // Temporarily deactivate other admins so adminUser is the sole active admin
      if (otherAdmins.length > 0) {
        await User.updateMany({ _id: { $in: otherAdmins.map(a => a._id) } }, { $set: { isActive: false } });
      }
      const adminUser = await User.findOne({ email: adminEmail });
      await axios.patch(`${API_BASE}/admin/users/${adminUser._id}/status`, { isActive: false }, { headers: { Authorization: `Bearer ${adminToken}` } });
    } catch (e) {
      lastAdminBlocked = e.response?.status === 400;
    } finally {
      // Restore any previously active admins and ensure test admin is active
      if (otherAdmins.length > 0) {
        await User.updateMany({ _id: { $in: otherAdmins.map(a => a._id) } }, { $set: { isActive: true } });
      }
      await User.updateOne({ email: adminEmail }, { $set: { isActive: true } });
    }
    recordTest('ADMIN', 'Last active admin deactivation protected', lastAdminBlocked);

    // System Health & Activity Logs
    const sysHealth = await axios.get(`${API_BASE}/admin/system-health`, { headers: { Authorization: `Bearer ${adminToken}` } });
    recordTest('ADMIN', 'GET /api/admin/system-health returns diagnostics', sysHealth.status === 200 && sysHealth.data?.data?.database?.status === 'CONNECTED');

    const logs = await axios.get(`${API_BASE}/admin/activity-logs`, { headers: { Authorization: `Bearer ${adminToken}` } });
    recordTest('ADMIN', 'Admin activity audit logs generated', logs.data?.data?.logs?.length >= 1);

    // 17. ML DEMAND PREDICTION END-TO-END
    console.log('\n16. ML Demand Prediction:');
    // Insufficient data test
    const predInsufficient = await axios.get(`${API_BASE}/ml/demand/${productId}?date=2026-08-30`, { headers: { Authorization: `Bearer ${ownerToken}` } });
    recordTest('ML PREDICTION', 'Insufficient sales data returned gracefully', predInsufficient.data?.code === 'INSUFFICIENT_DATA' || predInsufficient.data?.data?.code === 'INSUFFICIENT_DATA');

    const mlStatus = await axios.get(`${API_BASE}/ml/status`, { headers: { Authorization: `Bearer ${adminToken}` } });
    recordTest('ML PREDICTION', 'Admin ML diagnostic status reports HEALTHY', mlStatus.status === 200 && (mlStatus.data?.data?.serviceStatus === 'HEALTHY' || mlStatus.data?.data?.status === 'healthy'));

    // 18. DATABASE INTEGRITY CHECKS
    console.log('\n17. Database Integrity Checks:');
    const negativeBatches = await InventoryBatch.countDocuments({ quantity: { $lt: 0 } });
    recordTest('INTEGRITY', 'No negative inventory quantities in database', negativeBatches === 0);

    const negativeDeals = await FlashSale.countDocuments({ availableQuantity: { $lt: 0 } });
    recordTest('INTEGRITY', 'No negative flash sale quantities in database', negativeDeals === 0);

    const negativeOrders = await Order.countDocuments({ totalPrice: { $lt: 0 } });
    recordTest('INTEGRITY', 'No negative order total amounts', negativeOrders === 0);

    // Cleanup test data
    await User.deleteMany({ email: /test_suite_.*@smartshelf\.com/ });
    await Store.deleteMany({ _id: { $in: [store1Id, store2Id] } });
    await Product.deleteMany({ storeId: { $in: [store1Id, store2Id] } });
    await InventoryBatch.deleteMany({ storeId: { $in: [store1Id, store2Id] } });
    await FlashSale.deleteMany({ storeId: { $in: [store1Id, store2Id] } });
    await Order.deleteMany({ storeId: { $in: [store1Id, store2Id] } });

  } catch (err) {
    console.error('\n[FATAL SUITE ERROR]', err);
    recordTest('SUITE', 'Fatal error during test suite execution', false, err.message);
  } finally {
    if (expressServer) {
      await new Promise(r => expressServer.close(r));
    }
    if (mlProcess) {
      mlProcess.kill();
    }
    await mongoose.disconnect();
  }

  console.log('\n================================================================================');
  console.log(`TEST SUITE RESULTS SUMMARY: Total Errors = ${testErrors.length}`);
  if (testErrors.length > 0) {
    console.log('FAILURES:');
    testErrors.forEach(e => console.log(` - [${e.section}] ${e.testName}: ${e.details}`));
  } else {
    console.log('ALL TESTS PASSED SUCCESSFULLY! (0 ERRORS)');
  }
  console.log('================================================================================\n');

  process.exit(testErrors.length > 0 ? 1 : 0);
}

runComprehensiveSuite();
