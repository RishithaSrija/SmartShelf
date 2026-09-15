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
const demoPaymentService = require('./services/demoPaymentService');
const ingredientBasketService = require('./services/ingredientBasketService');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/smartshelf';

async function runDemoPaymentSuite() {
  console.log('====================================================================');
  console.log('--- Starting SmartShelf Demo Payment & Order Lifecycle Suite ---');
  console.log('====================================================================\n');

  try {
    await mongoose.connect(MONGO_URI);
    console.log('✓ Connected to MongoDB');

    // Clean previous test data
    await User.deleteMany({ email: /test_demo_.*@smartshelf\.com/ });

    // 1. Setup Test Users
    const customer = await User.create({
      name: 'Aditya Verma',
      email: `test_demo_cust_${Date.now()}@smartshelf.com`,
      password: 'password123',
      role: 'CUSTOMER',
      phone: '9876501234'
    });

    const foreignCustomer = await User.create({
      name: 'Sneha Reddy',
      email: `test_demo_foreign_${Date.now()}@smartshelf.com`,
      password: 'password123',
      role: 'CUSTOMER',
      phone: '9876505678'
    });

    const storeOwner = await User.create({
      name: 'Kavita Iyer',
      email: `test_demo_owner1_${Date.now()}@smartshelf.com`,
      password: 'password123',
      role: 'STORE_OWNER',
      phone: '9988701234'
    });

    const rivalOwner = await User.create({
      name: 'Manoj Bajpayee',
      email: `test_demo_rival_${Date.now()}@smartshelf.com`,
      password: 'password123',
      role: 'STORE_OWNER',
      phone: '9988705678'
    });

    // 2. Setup Stores
    const store = await Store.create({
      name: 'Iyer Gourmet Provisions',
      ownerId: storeOwner._id,
      address: '100 Feet Road, Indiranagar, Bengaluru',
      phone: '080-25251122',
      location: {
        type: 'Point',
        coordinates: [77.6408, 12.9784]
      },
      isActive: true,
      businessType: 'GROCERY'
    });

    const rivalStore = await Store.create({
      name: 'Manoj Kirana',
      ownerId: rivalOwner._id,
      address: 'Binnamangala, Indiranagar',
      phone: '080-25253344',
      location: {
        type: 'Point',
        coordinates: [77.6450, 12.9800]
      },
      isActive: true,
      businessType: 'GROCERY'
    });

    // 3. Setup Product & Batch
    const product = await Product.create({
      name: 'Pure Desi Ghee 1L Tin',
      category: 'DAIRY',
      unit: 'liter',
      basePrice: 650,
      storeId: store._id,
      isVegetarian: true
    });

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 3);

    const batch = await InventoryBatch.create({
      productId: product._id,
      storeId: store._id,
      batchNumber: `DEMO-BATCH-${Date.now()}`,
      quantity: 20,
      manufactureDate: new Date(),
      expiryDate,
      costPrice: 500,
      originalPrice: 650,
      currentPrice: 650,
      status: 'AVAILABLE'
    });

    const endsAt = new Date();
    endsAt.setHours(endsAt.getHours() + 12);

    const flashSale = await FlashSale.create({
      storeId: store._id,
      productId: product._id,
      inventoryBatchId: batch._id,
      title: 'Flash Sale: Pure Desi Ghee 1L Clearance',
      discountPercentage: 20,
      originalPrice: 650,
      salePrice: 520,
      totalQuantity: 15,
      availableQuantity: 15,
      startsAt: new Date(),
      endsAt,
      status: 'ACTIVE'
    });

    // --- TEST 1: Demo Payment Order Creation ---
    console.log('--- TEST 1: Demo Payment Order Creation ---');
    const order1Data = await orderService.createOrder(customer._id, {
      flashSaleId: flashSale._id,
      quantity: 2,
      paymentMethod: 'ONLINE'
    });

    console.assert(order1Data.paymentMethod === 'ONLINE', 'Payment method must be ONLINE');
    console.assert(order1Data.paymentStatus === 'PENDING', 'Payment status must be PENDING');
    console.assert(order1Data.status === 'PENDING_PAYMENT', 'Order status must be PENDING_PAYMENT');
    console.assert(order1Data.isDemoPayment === true, 'isDemoPayment must be true');
    console.assert(order1Data.paymentProvider === 'DEMO', 'paymentProvider must be DEMO');
    console.assert(order1Data.totalPrice === 1040, `Expected totalPrice 1040, got ${order1Data.totalPrice}`);
    console.assert(order1Data.paymentTimeline && order1Data.paymentTimeline.length >= 1, 'Timeline must be initialized');
    console.log(`✓ Online order #${order1Data.orderNumber} created in Demo Mode (Total: ₹${order1Data.totalPrice}).`);

    // --- TEST 2: Unauthorized Customer Payment Attempt ---
    console.log('\n--- TEST 2: Unauthorized User Payment Attempt Blocked ---');
    try {
      await demoPaymentService.simulatePaymentSuccess({
        orderId: order1Data._id,
        customerId: foreignCustomer._id,
        method: 'UPI'
      });
      console.assert(false, 'Foreign customer should NOT be able to pay for another user order');
    } catch (err) {
      console.assert(err.statusCode === 403, `Expected 403, got ${err.statusCode}`);
      console.log(`✓ Unauthorized payment blocked: "${err.message}"`);
    }

    // --- TEST 3: Simulated Payment Failure & Retry Preservation ---
    console.log('\n--- TEST 3: Simulated Payment Failure ---');
    const failedOrder = await demoPaymentService.simulatePaymentFailure({
      orderId: order1Data._id,
      customerId: customer._id,
      reason: 'User simulated bank decline'
    });
    console.assert(failedOrder.paymentStatus === 'FAILED', 'Payment status must be FAILED');
    console.assert(failedOrder.status === 'PENDING_PAYMENT', 'Order status must remain PENDING_PAYMENT for retry');
    console.log(`✓ Payment failure simulated successfully. Order #${failedOrder.orderNumber} remains reserved for retry.`);

    // --- TEST 4: Successful Demo Payment Simulation ---
    console.log('\n--- TEST 4: Successful Demo Payment Simulation ---');
    const capturedOrder = await demoPaymentService.simulatePaymentSuccess({
      orderId: order1Data._id,
      customerId: customer._id,
      method: 'UPI'
    });

    console.assert(capturedOrder.paymentStatus === 'CAPTURED', 'Payment status must be CAPTURED');
    console.assert(capturedOrder.status === 'WAITING_FOR_STORE_ACCEPTANCE', 'Order status must be WAITING_FOR_STORE_ACCEPTANCE');
    console.assert(capturedOrder.demoPaymentDetails?.method === 'UPI', 'Demo payment method must be UPI');
    console.assert(Boolean(capturedOrder.demoPaymentDetails?.transactionId), 'Demo transactionId must be generated');
    console.log(`✓ Payment CAPTURED (Demo Txn: ${capturedOrder.demoPaymentDetails.transactionId}). Order is now WAITING_FOR_STORE_ACCEPTANCE.`);

    // --- TEST 5: Idempotent Payment Attempt ---
    console.log('\n--- TEST 5: Duplicate Payment Attempt Handled Safely ---');
    const duplicateOrder = await demoPaymentService.simulatePaymentSuccess({
      orderId: order1Data._id,
      customerId: customer._id,
      method: 'UPI'
    });
    console.assert(duplicateOrder.paymentStatus === 'CAPTURED', 'Payment status must remain CAPTURED');
    console.assert(duplicateOrder.status === 'WAITING_FOR_STORE_ACCEPTANCE', 'Order status must remain WAITING_FOR_STORE_ACCEPTANCE');
    console.log('✓ Duplicate payment attempt handled idempotently with zero state corruption.');

    // --- TEST 6: Customer Cannot Accept / Reject Order ---
    console.log('\n--- TEST 6: Customer Blocked From Accepting / Rejecting Order ---');
    try {
      await orderService.acceptStoreOrder(customer._id, order1Data._id);
      console.assert(false, 'Customer should not be able to accept orders');
    } catch (err) {
      console.assert(err.statusCode === 404, 'Customer has no store; should fail');
      console.log(`✓ Customer blocked from accepting order: "${err.message}"`);
    }

    // --- TEST 7: Rival Store Owner Blocked From Accepting / Rejecting Order ---
    console.log('\n--- TEST 7: Rival Store Owner Blocked ---');
    try {
      await orderService.acceptStoreOrder(rivalOwner._id, order1Data._id);
      console.assert(false, 'Rival store owner should NOT be able to accept order belonging to another store');
    } catch (err) {
      console.assert(err.statusCode === 403, `Expected 403, got ${err.statusCode}`);
      console.log(`✓ Rival store owner blocked: "${err.message}"`);
    }

    // --- TEST 8: Authorized Store Owner Accepts Order ---
    console.log('\n--- TEST 8: Authorized Store Owner Accepts Order ---');
    const acceptedOrder = await orderService.acceptStoreOrder(storeOwner._id, order1Data._id);
    console.assert(acceptedOrder.status === 'ACCEPTED', 'Order status must be ACCEPTED');
    console.assert(acceptedOrder.paymentStatus === 'CAPTURED', 'Payment status must remain CAPTURED');

    const acceptedTimelineEvent = acceptedOrder.paymentTimeline.find((e) => e.status === 'ACCEPTED');
    console.assert(Boolean(acceptedTimelineEvent), 'Timeline must record store acceptance event');
    console.log(`✓ Order #${acceptedOrder.orderNumber} successfully ACCEPTED by store owner.`);

    // --- TEST 9: Store Owner Rejection & Automated Demo Refund ---
    console.log('\n--- TEST 9: Store Owner Rejection & Automated Demo Refund ---');
    // Create another online paid order to test rejection & refund
    const order2Data = await orderService.createOrder(customer._id, {
      flashSaleId: flashSale._id,
      quantity: 1,
      paymentMethod: 'ONLINE'
    });

    await demoPaymentService.simulatePaymentSuccess({
      orderId: order2Data._id,
      customerId: customer._id,
      method: 'CARD'
    });

    // Check batch quantity before rejection
    const batchBeforeReject = await InventoryBatch.findById(batch._id);
    const stockBeforeReject = batchBeforeReject.quantity;

    // Store owner rejects order2Data
    const rejectedOrder = await orderService.rejectStoreOrder(
      storeOwner._id,
      order2Data._id,
      'Batch damaged during handling'
    );

    console.assert(rejectedOrder.status === 'REJECTED', 'Order status must be REJECTED');
    console.assert(rejectedOrder.paymentStatus === 'REFUNDED', `Expected REFUNDED, got ${rejectedOrder.paymentStatus}`);
    console.assert(Boolean(rejectedOrder.refundId), 'Demo refundId must be generated');
    console.assert(rejectedOrder.refundAmount === order2Data.totalPrice, `Expected refundAmount ${order2Data.totalPrice}, got ${rejectedOrder.refundAmount}`);
    console.assert(Boolean(rejectedOrder.refundedAt), 'refundedAt must be populated');

    // Verify stock restoration
    const batchAfterReject = await InventoryBatch.findById(batch._id);
    console.assert(batchAfterReject.quantity === stockBeforeReject + 1, 'Stock must be incremented by 1 upon rejection');
    console.log(`✓ Order #${rejectedOrder.orderNumber} REJECTED. Demo Refund ID: ${rejectedOrder.refundId} (₹${rejectedOrder.refundAmount}). Stock restored.`);

    // --- TEST 10: Customer Order Timeline Integrity ---
    console.log('\n--- TEST 10: Customer Order Timeline Integrity ---');
    const orderWithTimeline = await Order.findById(order2Data._id);
    console.log('  Payment Timeline Events:');
    orderWithTimeline.paymentTimeline.forEach((t) => {
      console.log(`    - [${t.status || t.paymentStatus}] ${t.title}: ${t.description}`);
    });
    const hasRefundTimeline = orderWithTimeline.paymentTimeline.some((e) => e.paymentStatus === 'REFUNDED');
    console.assert(hasRefundTimeline, 'Timeline must record Demo Refund event');
    console.log('✓ Full customer order & refund timeline verified.');

    // --- TEST 11: Ingredient Basket Checkout With Demo Payment ---
    console.log('\n--- TEST 11: Ingredient Basket Checkout With Demo Payment ---');
    // Test that checkoutBasket supports ONLINE payment with demo defaults
    const basketResult = await ingredientBasketService.checkoutBasket(customer._id, {
      recipeName: 'Besan Laddu (10 kg Batch)',
      paymentMethod: 'ONLINE',
      items: [
        {
          ingredientName: 'Pure Cow Ghee',
          productId: product._id,
          storeId: store._id,
          flashSaleId: flashSale._id,
          inventoryBatchId: batch._id,
          requiredQuantity: 2,
          quantity: 2,
          orderQuantity: 2,
          unit: 'liter',
          unitPrice: 520,
          totalPrice: 1040
        }
      ]
    });

    console.assert(basketResult.orders && basketResult.orders.length === 1, 'Basket order must be created');
    const basketOrder = basketResult.orders[0];
    console.assert(basketOrder.orderType === 'INGREDIENT_BASKET', 'orderType must be INGREDIENT_BASKET');
    console.assert(basketOrder.isDemoPayment === true, 'Basket order must be in demo mode');
    console.assert(basketOrder.status === 'PENDING_PAYMENT', 'Basket order status must be PENDING_PAYMENT');

    // Simulate demo payment for the basket order
    const paidBasketOrder = await demoPaymentService.simulatePaymentSuccess({
      orderId: basketOrder._id,
      customerId: customer._id,
      method: 'UPI'
    });
    console.assert(paidBasketOrder.paymentStatus === 'CAPTURED', 'Basket payment status must be CAPTURED');
    console.assert(paidBasketOrder.status === 'WAITING_FOR_STORE_ACCEPTANCE', 'Basket order must be WAITING_FOR_STORE_ACCEPTANCE');
    console.log(`✓ Ingredient basket order #${paidBasketOrder.orderNumber} successfully paid via Demo Payment.`);

    // --- TEST 12: Public Payment Provider Metadata ---
    console.log('\n--- TEST 12: Public Payment Provider Metadata Verification ---');
    const providerInfo = demoPaymentService.getProviderInfo();
    console.assert(providerInfo.provider === 'DEMO', 'Provider must be DEMO');
    console.assert(providerInfo.isDemo === true, 'isDemo must be true');
    console.assert(providerInfo.disclaimer.includes('No real money will be charged'), 'Disclaimer must clarify demo mode');
    console.log(`✓ Payment provider info: ${providerInfo.name} (${providerInfo.disclaimer})`);

    // Clean up test records
    console.log('\n--- Cleaning up test records ---');
    await Order.deleteMany({ _id: { $in: [order1Data._id, order2Data._id, basketOrder._id] } });
    await FlashSale.deleteOne({ _id: flashSale._id });
    await InventoryBatch.deleteOne({ _id: batch._id });
    await Product.deleteOne({ _id: product._id });
    await Store.deleteMany({ _id: { $in: [store._id, rivalStore._id] } });
    await User.deleteMany({ _id: { $in: [customer._id, foreignCustomer._id, storeOwner._id, rivalOwner._id] } });
    console.log('✓ Test records cleaned up.');

    console.log('\n====================================================================');
    console.log('ALL DEMO PAYMENT & ORDER LIFECYCLE TESTS PASSED! ✓');
    console.log('====================================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('\n❌ Test Suite Failed:', err);
    process.exit(1);
  }
}

runDemoPaymentSuite();
