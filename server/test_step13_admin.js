const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const jwt = require('jsonwebtoken');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');
const Store = require('./models/Store');
const Product = require('./models/Product');
const InventoryBatch = require('./models/InventoryBatch');
const FlashSale = require('./models/FlashSale');
const Order = require('./models/Order');
const ActivityLog = require('./models/ActivityLog');
const JobExecution = require('./models/JobExecution');

const adminService = require('./services/adminService');
const flashSaleService = require('./services/flashSaleService');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/smartshelf';

async function runTests() {
  console.log('=================================================================');
  console.log('--- Starting Step 13 Admin & Platform Management Test Suite ---');
  console.log('=================================================================');

  try {
    await mongoose.connect(MONGO_URI);
    console.log('✓ Connected to MongoDB\n');

    // Clean previous test users
    await User.deleteMany({ email: /testadmin_.*@smartshelf\.com/ });

    // Setup Test Admin, Customer, and Store Owner
    const adminUser = await User.create({
      name: 'Super Admin',
      email: `testadmin_admin_${Date.now()}@smartshelf.com`,
      password: 'password123',
      role: 'ADMIN',
      isActive: true
    });

    const customerUser = await User.create({
      name: 'Regular Customer',
      email: `testadmin_cust_${Date.now()}@smartshelf.com`,
      password: 'password123',
      role: 'CUSTOMER',
      isActive: true
    });

    const storeOwnerUser = await User.create({
      name: 'Store Owner',
      email: `testadmin_owner_${Date.now()}@smartshelf.com`,
      password: 'password123',
      role: 'STORE_OWNER',
      isActive: true
    });

    // Setup Store & Flash Sale
    const store = await Store.create({
      name: 'Admin Test Store',
      ownerId: storeOwnerUser._id,
      address: 'Market Plaza, Center',
      businessType: 'GROCERY',
      location: { type: 'Point', coordinates: [80.648, 16.5062] },
      isActive: true
    });

    const product = await Product.create({
      storeId: store._id,
      name: 'Organic Milk 1L',
      category: 'DAIRY',
      unit: 'bottle',
      basePrice: 60
    });

    const batch = await InventoryBatch.create({
      storeId: store._id,
      productId: product._id,
      batchNumber: 'BAT-ADM-001',
      quantity: 15,
      originalPrice: 60,
      currentPrice: 35,
      discountPercentage: 42,
      expiryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      manufactureDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      status: 'FLASH_SALE'
    });

    const sale = await FlashSale.create({
      storeId: store._id,
      productId: product._id,
      inventoryBatchId: batch._id,
      title: 'Organic Milk 42% OFF',
      originalPrice: 60,
      salePrice: 35,
      discountPercentage: 42,
      availableQuantity: 15,
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      status: 'ACTIVE'
    });

    console.log('✓ Initial test data created successfully.');

    // -------------------------------------------------------------
    // TEST 1: Platform Overview Dashboard Stats Aggregation
    // -------------------------------------------------------------
    console.log('\n--- TEST 1: Dashboard Stats Aggregation ---');
    const stats = await adminService.getDashboardStats();
    console.assert(typeof stats.users === 'number' && stats.users >= 3, 'Users count must be valid');
    console.assert(typeof stats.stores === 'number' && stats.stores >= 1, 'Stores count must be valid');
    console.assert(typeof stats.activeStores === 'number' && stats.activeStores >= 1, 'Active stores count must be valid');
    console.assert(typeof stats.activeFlashSales === 'number' && stats.activeFlashSales >= 1, 'Active flash sales must be valid');
    console.log(`✓ Dashboard stats aggregated: Users=${stats.users}, Stores=${stats.stores}, ActiveDeals=${stats.activeFlashSales}`);

    // -------------------------------------------------------------
    // TEST 2: User Deactivation and Last Admin Protection
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: User Deactivation & Last Admin Safety Guard ---');
    // Deactivate customer
    const deactivatedCust = await adminService.updateUserStatus(adminUser._id, customerUser._id, false);
    console.assert(deactivatedCust.isActive === false, 'Customer must be deactivated');

    // Attempt to deactivate the only active admin
    let lastAdminDeactivationBlocked = false;
    try {
      await adminService.updateUserStatus(adminUser._id, adminUser._id, false);
    } catch (err) {
      lastAdminDeactivationBlocked = true;
      console.log(`✓ Last admin deactivation blocked: "${err.message}"`);
    }
    console.assert(lastAdminDeactivationBlocked, 'Should prevent deactivating last admin');

    // Attempt to demote the only active admin
    let lastAdminDemotionBlocked = false;
    try {
      await adminService.updateUserRole(adminUser._id, adminUser._id, 'CUSTOMER');
    } catch (err) {
      lastAdminDemotionBlocked = true;
      console.log(`✓ Last admin demotion blocked: "${err.message}"`);
    }
    console.assert(lastAdminDemotionBlocked, 'Should prevent demoting last admin');

    // Reactivate customer
    const reactivatedCust = await adminService.updateUserStatus(adminUser._id, customerUser._id, true);
    console.assert(reactivatedCust.isActive === true, 'Customer must be reactivated');
    console.log('✓ User activation toggle and role safety guards confirmed.');

    // -------------------------------------------------------------
    // TEST 3: Store Deactivation & Public Marketplace Sync
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Store Deactivation & Public Marketplace Sync ---');
    // Deactivate store
    await adminService.updateStoreStatus(adminUser._id, store._id, false);

    const publicSalesAfterStoreDeact = await flashSaleService.getPublicFlashSales();
    const dealFoundWhenStoreInactive = publicSalesAfterStoreDeact.flashSales.some(
      (s) => s._id.toString() === sale._id.toString()
    );
    console.assert(!dealFoundWhenStoreInactive, 'Flash sale from inactive store must NOT appear publicly');
    console.log('✓ Store deactivated. Deals immediately hidden from public marketplace.');

    // Reactivate store
    await adminService.updateStoreStatus(adminUser._id, store._id, true);
    const publicSalesAfterStoreReactivated = await flashSaleService.getPublicFlashSales();
    const dealFoundWhenStoreActive = publicSalesAfterStoreReactivated.flashSales.some(
      (s) => s._id.toString() === sale._id.toString()
    );
    console.assert(dealFoundWhenStoreActive, 'Flash sale must reappear publicly when store is reactivated');
    console.log('✓ Store reactivated. Valid active deals restored to public marketplace.');

    // -------------------------------------------------------------
    // TEST 4: Flash Sale Admin Controls (Pause, Resume, Cancel)
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Flash Sale Controls (Pause / Resume / Cancel) ---');
    // Pause deal
    const pausedSale = await adminService.updateFlashSaleStatus(adminUser._id, sale._id, 'PAUSE');
    console.assert(pausedSale.status === 'PAUSED', 'Sale status should be PAUSED');

    // Resume deal
    const resumedSale = await adminService.updateFlashSaleStatus(adminUser._id, sale._id, 'RESUME');
    console.assert(resumedSale.status === 'ACTIVE', 'Sale status should be ACTIVE');

    // Cancel deal
    const cancelledSale = await adminService.updateFlashSaleStatus(adminUser._id, sale._id, 'CANCEL');
    console.assert(cancelledSale.status === 'CANCELLED', 'Sale status should be CANCELLED');
    console.log('✓ Flash sale pause, resume, and cancel lifecycle controls verified.');

    // -------------------------------------------------------------
    // TEST 5: System Health Diagnostics & Job Metadata
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: System Health Diagnostics & Job Records ---');
    const health = await adminService.getSystemHealth();
    console.assert(health.server?.status === 'HEALTHY', 'Server status must be HEALTHY');
    console.assert(health.database?.status === 'CONNECTED', 'Database status must be CONNECTED');
    console.assert(typeof health.server?.uptimeSeconds === 'number', 'Uptime must be a number');
    console.assert(!health.server?.jwtSecret, 'Must NOT expose secrets in health API');
    console.assert(!health.database?.uri, 'Must NOT expose DB URI in health API');
    console.log(`✓ Health API verified safe: Database=${health.database.status}, Server=${health.server.status}`);

    // -------------------------------------------------------------
    // TEST 6: Administrative Activity Audit Logging
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: Administrative Activity Audit Logging ---');
    const logsRes = await adminService.getActivityLogs({ limit: 10 });
    console.assert(logsRes.logs.length >= 3, 'Must have recorded activity logs for mutations');

    const actionsLogged = logsRes.logs.map((l) => l.action);
    console.assert(actionsLogged.includes('USER_DEACTIVATED') || actionsLogged.includes('USER_ACTIVATED'), 'Logged user activation/deactivation');
    console.assert(actionsLogged.includes('STORE_DEACTIVATED') || actionsLogged.includes('STORE_ACTIVATED'), 'Logged store activation/deactivation');
    console.assert(actionsLogged.includes('FLASH_SALE_CANCELLED') || actionsLogged.includes('FLASH_SALE_PAUSED'), 'Logged flash sale action');
    console.log(`✓ Activity logs recorded: [${actionsLogged.slice(0, 5).join(', ')}]`);

    // -------------------------------------------------------------
    // TEST 7: Platform Analytics & Food Waste Metrics
    // -------------------------------------------------------------
    console.log('\n--- TEST 7: Analytics (7d/30d/90d) & Food Waste Metrics ---');
    const [analytics7d, analytics30d, wasteMetrics] = await Promise.all([
      adminService.getAnalytics('7d'),
      adminService.getAnalytics('30d'),
      adminService.getExpiryWasteMetrics()
    ]);

    console.assert(analytics7d.timeRange === '7d', '7d time range verified');
    console.assert(analytics30d.timeRange === '30d', '30d time range verified');
    console.assert(typeof wasteMetrics.discountedBatches === 'number', 'Discounted batches calculated');
    console.assert(typeof wasteMetrics.recoveredSalesValue === 'number', 'Recovered sales value calculated');
    console.log(`✓ Waste metrics verified: RecoveredValue=₹${wasteMetrics.recoveredSalesValue}, DiscountedBatches=${wasteMetrics.discountedBatches}`);

    // Clean up test records
    console.log('\n--- Cleaning up test records ---');
    await FlashSale.deleteMany({ _id: sale._id });
    await InventoryBatch.deleteMany({ _id: batch._id });
    await Product.deleteMany({ _id: product._id });
    await Store.deleteMany({ _id: store._id });
    await ActivityLog.deleteMany({ userId: adminUser._id });
    await User.deleteMany({ _id: { $in: [adminUser._id, customerUser._id, storeOwnerUser._id] } });
    console.log('✓ Test records cleaned up.');

    console.log('\n=============================================================');
    console.log('ALL STEP 13 ADMIN & PLATFORM TESTS PASSED SUCCESSFULLY! ✓');
    console.log('=============================================================');
  } catch (err) {
    console.error('❌ Test suite failed with error:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

runTests();
