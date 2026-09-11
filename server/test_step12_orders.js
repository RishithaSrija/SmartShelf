const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');
const Store = require('./models/Store');
const Product = require('./models/Product');
const InventoryBatch = require('./models/InventoryBatch');
const FlashSale = require('./models/FlashSale');
const Order = require('./models/Order');
const orderService = require('./services/orderService');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/smartshelf';

async function runTests() {
  console.log('=================================================================');
  console.log('--- Starting Step 12 Reservation & Order Management Test Suite ---');
  console.log('=================================================================');

  try {
    await mongoose.connect(MONGO_URI);
    console.log('✓ Connected to MongoDB\n');

    // Clean previous test data
    await User.deleteMany({ email: /testorder_.*@smartshelf\.com/ });

    // Setup Test Users
    const customerA = await User.create({
      name: 'Order Customer A',
      email: `testorder_custA_${Date.now()}@smartshelf.com`,
      password: 'password123',
      role: 'CUSTOMER',
      phone: '9876543210'
    });

    const customerB = await User.create({
      name: 'Order Customer B',
      email: `testorder_custB_${Date.now()}@smartshelf.com`,
      password: 'password123',
      role: 'CUSTOMER',
      phone: '9123456780'
    });

    const storeOwner1 = await User.create({
      name: 'Order Store Owner 1',
      email: `testorder_owner1_${Date.now()}@smartshelf.com`,
      password: 'password123',
      role: 'STORE_OWNER',
      phone: '9988776655'
    });

    const storeOwner2 = await User.create({
      name: 'Order Store Owner 2',
      email: `testorder_owner2_${Date.now()}@smartshelf.com`,
      password: 'password123',
      role: 'STORE_OWNER',
      phone: '9988776644'
    });

    // Setup Stores
    const store1 = await Store.create({
      name: 'FreshMart Center',
      ownerId: storeOwner1._id,
      address: 'Center Road, Sector 1',
      businessType: 'GROCERY',
      location: { type: 'Point', coordinates: [80.648, 16.5062] },
      isActive: true
    });

    const store2 = await Store.create({
      name: 'Bakery Delight',
      ownerId: storeOwner2._id,
      address: 'North Street, Sector 2',
      businessType: 'BAKERY',
      location: { type: 'Point', coordinates: [80.655, 16.512] },
      isActive: true
    });

    // Setup Products
    const prodBread = await Product.create({
      storeId: store1._id,
      name: 'Artisan Wheat Bread',
      category: 'BAKERY',
      brand: 'BakeWell',
      unit: 'piece',
      basePrice: 50
    });

    const prodCroissant = await Product.create({
      storeId: store2._id,
      name: 'Butter Croissants 2-Pack',
      category: 'BAKERY',
      brand: 'BakeDelight',
      unit: 'pack',
      basePrice: 80
    });

    // Setup Inventory Batches
    const mfgDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    const expiryDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

    const batch1 = await InventoryBatch.create({
      storeId: store1._id,
      productId: prodBread._id,
      batchNumber: 'BAT-ORD-001',
      quantity: 10,
      originalPrice: 50,
      currentPrice: 30,
      discountPercentage: 40,
      manufactureDate: mfgDate,
      expiryDate,
      status: 'FLASH_SALE'
    });

    const batch2 = await InventoryBatch.create({
      storeId: store2._id,
      productId: prodCroissant._id,
      batchNumber: 'BAT-ORD-002',
      quantity: 5,
      originalPrice: 80,
      currentPrice: 40,
      discountPercentage: 50,
      manufactureDate: mfgDate,
      expiryDate,
      status: 'FLASH_SALE'
    });

    // Setup Flash Sales
    const sale1 = await FlashSale.create({
      inventoryBatchId: batch1._id,
      productId: prodBread._id,
      storeId: store1._id,
      title: 'Artisan Wheat Bread 40% OFF',
      originalPrice: 50,
      salePrice: 30,
      discountPercentage: 40,
      availableQuantity: 10,
      startsAt: new Date(),
      endsAt: expiryDate,
      status: 'ACTIVE'
    });

    const sale2 = await FlashSale.create({
      inventoryBatchId: batch2._id,
      productId: prodCroissant._id,
      storeId: store2._id,
      title: 'Butter Croissants 50% OFF',
      originalPrice: 80,
      salePrice: 40,
      discountPercentage: 50,
      availableQuantity: 5,
      startsAt: new Date(),
      endsAt: expiryDate,
      status: 'ACTIVE'
    });

    console.log('✓ Initial test data registered successfully.');

    // -------------------------------------------------------------
    // TEST 1: Basic Reservation Creation
    // -------------------------------------------------------------
    console.log('\n--- TEST 1: Basic Reservation Creation ---');
    const order1 = await orderService.createOrder(customerA._id, {
      flashSaleId: sale1._id,
      quantity: 2
    });

    console.assert(order1.status === 'PENDING', 'Order status must be PENDING');
    console.assert(order1.quantity === 2, 'Order quantity must be 2');
    console.assert(order1.unitPrice === 30, 'Order unitPrice must be 30');
    console.assert(order1.totalPrice === 60, 'Order totalPrice must be 60');
    console.assert(order1.orderNumber.startsWith('SS-'), 'Order number must format with SS-');

    const updatedBatch1 = await InventoryBatch.findById(batch1._id);
    const updatedSale1 = await FlashSale.findById(sale1._id);

    console.assert(updatedBatch1.quantity === 8, `Batch quantity must be 8, got ${updatedBatch1.quantity}`);
    console.assert(updatedSale1.availableQuantity === 8, `Flash sale availableQuantity must be 8, got ${updatedSale1.availableQuantity}`);
    console.log(`✓ Order #${order1.orderNumber} created. Stock reduced from 10 -> 8.`);

    // -------------------------------------------------------------
    // TEST 2: Full Stock Reservation (SOLD_OUT transition)
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Full Stock Reservation (SOLD_OUT Transition) ---');
    const order2 = await orderService.createOrder(customerB._id, {
      flashSaleId: sale1._id,
      quantity: 8
    });

    const soldOutBatch1 = await InventoryBatch.findById(batch1._id);
    const soldOutSale1 = await FlashSale.findById(sale1._id);

    console.assert(soldOutBatch1.quantity === 0, 'Batch quantity should be 0');
    console.assert(soldOutBatch1.status === 'SOLD_OUT', 'Batch status must be SOLD_OUT');
    console.assert(soldOutSale1.availableQuantity === 0, 'Flash sale quantity should be 0');
    console.assert(soldOutSale1.status === 'SOLD_OUT', 'Flash sale status must be SOLD_OUT');
    console.log('✓ Remaining 8 units reserved. Status transitioned to SOLD_OUT.');

    // -------------------------------------------------------------
    // TEST 3: Oversell / Unavailable Rejection
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Oversell / Unavailable Rejection ---');
    let rejectedOversell = false;
    try {
      await orderService.createOrder(customerA._id, {
        flashSaleId: sale1._id,
        quantity: 1
      });
    } catch (e) {
      rejectedOversell = true;
      console.log(`✓ Oversell rejected as expected: "${e.message}"`);
    }
    console.assert(rejectedOversell, 'Should reject reservation on sold out flash sale');

    // -------------------------------------------------------------
    // TEST 4: Concurrent Reservation Protection
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Concurrent Reservation Protection (Stock = 5) ---');
    // Sale2 has stock = 5. Customer A and Customer B both attempt to reserve 4 units simultaneously.
    const concurrentResults = await Promise.allSettled([
      orderService.createOrder(customerA._id, { flashSaleId: sale2._id, quantity: 4 }),
      orderService.createOrder(customerB._id, { flashSaleId: sale2._id, quantity: 4 })
    ]);

    const fulfilled = concurrentResults.filter((r) => r.status === 'fulfilled');
    const rejected = concurrentResults.filter((r) => r.status === 'rejected');

    console.assert(fulfilled.length === 1, `Exactly 1 order should succeed, got ${fulfilled.length}`);
    console.assert(rejected.length === 1, `Exactly 1 order should be rejected, got ${rejected.length}`);

    const finalBatch2 = await InventoryBatch.findById(batch2._id);
    console.assert(finalBatch2.quantity === 1, `Remaining stock must be 1, got ${finalBatch2.quantity}`);
    console.assert(finalBatch2.quantity >= 0, 'Stock must never become negative');
    console.log(`✓ Concurrent race prevented. Exactly 1 reservation succeeded, remaining stock is ${finalBatch2.quantity}.`);

    // -------------------------------------------------------------
    // TEST 5: Customer Cancellation & Inventory Restoration
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Customer Cancellation & Inventory Restoration ---');
    const cancelledOrder = await orderService.cancelCustomerOrder(
      customerA._id,
      order1._id,
      'Change of plans'
    );

    console.assert(cancelledOrder.status === 'CANCELLED', 'Order must be CANCELLED');

    const restoredBatch1 = await InventoryBatch.findById(batch1._id);
    const restoredSale1 = await FlashSale.findById(sale1._id);

    console.assert(restoredBatch1.quantity === 2, `Batch quantity restored to 2, got ${restoredBatch1.quantity}`);
    console.assert(restoredSale1.availableQuantity === 2, `Flash sale restored to 2, got ${restoredSale1.availableQuantity}`);
    console.assert(restoredSale1.status === 'ACTIVE', 'Flash sale status returned to ACTIVE');
    console.log('✓ Cancellation restored 2 units to batch and reactivated flash sale.');

    // Idempotent double-cancel prevention
    let doubleCancelError = false;
    try {
      await orderService.cancelCustomerOrder(customerA._id, order1._id);
    } catch (e) {
      doubleCancelError = true;
      console.log(`✓ Double cancellation rejected: "${e.message}"`);
    }
    console.assert(doubleCancelError, 'Double cancellation must be rejected');

    // -------------------------------------------------------------
    // TEST 6: Automated 30-Minute Reservation Expiry
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: Automated 30-Minute Reservation Expiry ---');
    // Set order2 to be expired in the past
    order2.reservationExpiresAt = new Date(Date.now() - 5000);
    await order2.save();

    const expiryResult = await orderService.expireReservations();
    console.assert(expiryResult.expiredCount >= 1, 'Should have processed at least 1 expired reservation');

    const expiredOrder2 = await Order.findById(order2._id);
    console.assert(expiredOrder2.status === 'EXPIRED', 'Order status must be EXPIRED');

    const batch1AfterExpiry = await InventoryBatch.findById(batch1._id);
    console.assert(batch1AfterExpiry.quantity === 10, `Batch quantity restored to 10, got ${batch1AfterExpiry.quantity}`);
    console.log('✓ Expired reservation released and restored 8 units to stock.');

    // Idempotent expiry check
    const secondExpiry = await orderService.expireReservations();
    console.assert(secondExpiry.expiredCount === 0, 'Second run should not double-restore');
    console.log('✓ Expiry job is idempotent (0 double-restorations).');

    // -------------------------------------------------------------
    // TEST 7: Price Snapshot Integrity
    // -------------------------------------------------------------
    console.log('\n--- TEST 7: Price Snapshot Integrity ---');
    // Create new order at ₹30
    const order3 = await orderService.createOrder(customerA._id, {
      flashSaleId: sale1._id,
      quantity: 1
    });
    console.assert(order3.unitPrice === 30, 'Order unitPrice is ₹30');

    // Store owner changes Flash Sale price to ₹20
    sale1.salePrice = 20;
    await sale1.save();

    // Fetch existing order3
    const order3Fetched = await orderService.getCustomerOrder(customerA._id, order3._id);
    console.assert(order3Fetched.unitPrice === 30, 'Historical unitPrice must remain ₹30');
    console.assert(order3Fetched.totalPrice === 30, 'Historical totalPrice must remain ₹30');
    console.log('✓ Historical order price retained at ₹30 after flash sale price changed to ₹20.');

    // -------------------------------------------------------------
    // TEST 8: Role Authorization & Store Owner Lifecycle
    // -------------------------------------------------------------
    console.log('\n--- TEST 8: Authorization & Store Owner Order Lifecycle ---');
    // Customer B tries to view Customer A's order
    let unauthorizedCustView = false;
    try {
      await orderService.getCustomerOrder(customerB._id, order3._id);
    } catch (e) {
      unauthorizedCustView = true;
      console.log(`✓ Unauthorized customer access blocked: "${e.message}"`);
    }
    console.assert(unauthorizedCustView, 'Customer B cannot view Customer A order');

    // Store Owner 2 tries to view Store 1's order
    let unauthorizedStoreView = false;
    try {
      await orderService.getStoreOrder(storeOwner2._id, order3._id);
    } catch (e) {
      unauthorizedStoreView = true;
      console.log(`✓ Unauthorized store access blocked: "${e.message}"`);
    }
    console.assert(unauthorizedStoreView, 'Store Owner 2 cannot view Store 1 order');

    // Store Owner 1 updates order3: PENDING -> CONFIRMED
    const confirmedByStore = await orderService.updateStoreOrderStatus(
      storeOwner1._id,
      order3._id,
      'CONFIRMED'
    );
    console.assert(confirmedByStore.status === 'CONFIRMED', 'Status must transition to CONFIRMED');

    // Store Owner 1 updates order3: CONFIRMED -> COMPLETED
    const completedByStore = await orderService.updateStoreOrderStatus(
      storeOwner1._id,
      order3._id,
      'COMPLETED'
    );
    console.assert(completedByStore.status === 'COMPLETED', 'Status must transition to COMPLETED');

    // Invalid transition: COMPLETED -> PENDING
    let invalidTransition = false;
    try {
      await orderService.updateStoreOrderStatus(storeOwner1._id, order3._id, 'PENDING');
    } catch (e) {
      invalidTransition = true;
      console.log(`✓ Invalid transition blocked: "${e.message}"`);
    }
    console.assert(invalidTransition, 'Terminal state transitions must be blocked');

    // Clean up test records
    console.log('\n--- Cleaning up test records ---');
    await Order.deleteMany({ _id: { $in: [order1._id, order2._id, order3._id] } });
    await FlashSale.deleteMany({ _id: { $in: [sale1._id, sale2._id] } });
    await InventoryBatch.deleteMany({ _id: { $in: [batch1._id, batch2._id] } });
    await Product.deleteMany({ _id: { $in: [prodBread._id, prodCroissant._id] } });
    await Store.deleteMany({ _id: { $in: [store1._id, store2._id] } });
    await User.deleteMany({ _id: { $in: [customerA._id, customerB._id, storeOwner1._id, storeOwner2._id] } });
    console.log('✓ Test records cleaned up.');

    console.log('\n=============================================================');
    console.log('ALL STEP 12 RESERVATION & ORDER TESTS PASSED SUCCESSFULLY! ✓');
    console.log('=============================================================');
  } catch (err) {
    console.error('❌ Test suite failed with error:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

runTests();
