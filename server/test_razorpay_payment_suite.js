const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const crypto = require('crypto');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');
const Store = require('./models/Store');
const Product = require('./models/Product');
const InventoryBatch = require('./models/InventoryBatch');
const FlashSale = require('./models/FlashSale');
const Order = require('./models/Order');
const orderService = require('./services/orderService');
const razorpayService = require('./services/razorpayService');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/smartshelf';

async function runRazorpaySuite() {
  console.log('====================================================================');
  console.log('--- Starting SmartShelf Razorpay Online Payment & Store Flow ---');
  console.log('====================================================================\n');

  try {
    await mongoose.connect(MONGO_URI);
    console.log('✓ Connected to MongoDB');

    // Clean previous test data
    await User.deleteMany({ email: /test_rzp_.*@smartshelf\.com/ });

    // 1. Setup Test Users
    const customer = await User.create({
      name: 'Rohan Sharma',
      email: `test_rzp_cust_${Date.now()}@smartshelf.com`,
      password: 'password123',
      role: 'CUSTOMER',
      phone: '9876543210'
    });

    const storeOwner = await User.create({
      name: 'Priya Patel',
      email: `test_rzp_owner1_${Date.now()}@smartshelf.com`,
      password: 'password123',
      role: 'STORE_OWNER',
      phone: '9988776655'
    });

    const rivalOwner = await User.create({
      name: 'Vikram Singh',
      email: `test_rzp_rival_${Date.now()}@smartshelf.com`,
      password: 'password123',
      role: 'STORE_OWNER',
      phone: '9988776644'
    });

    // 2. Setup Stores
    const store = await Store.create({
      name: 'Green Grocers Flagship',
      ownerId: storeOwner._id,
      address: '77 MG Road, Indiranagar',
      businessType: 'GROCERY',
      location: { type: 'Point', coordinates: [77.5946, 12.9716] },
      isActive: true
    });

    const rivalStore = await Store.create({
      name: 'City Supermarket',
      ownerId: rivalOwner._id,
      address: '12 Brigade Road',
      businessType: 'GROCERY',
      location: { type: 'Point', coordinates: [77.6033, 12.9745] },
      isActive: true
    });

    // 3. Setup Product & Batch
    const product = await Product.create({
      storeId: store._id,
      name: 'Organic Farm Strawberries 250g',
      category: 'FRUITS',
      brand: 'BerryFresh',
      unit: 'pack',
      basePrice: 150
    });

    const mfgDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const expiryDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

    const batch = await InventoryBatch.create({
      storeId: store._id,
      productId: product._id,
      batchNumber: 'BAT-RZP-8801',
      quantity: 12,
      originalPrice: 150,
      currentPrice: 90,
      discountPercentage: 40,
      manufactureDate: mfgDate,
      expiryDate,
      status: 'FLASH_SALE'
    });

    const flashSale = await FlashSale.create({
      inventoryBatchId: batch._id,
      productId: product._id,
      storeId: store._id,
      title: 'Fresh Strawberries 40% OFF Flash Sale',
      originalPrice: 150,
      salePrice: 90,
      discountPercentage: 40,
      availableQuantity: 12,
      startsAt: new Date(),
      endsAt: expiryDate,
      status: 'ACTIVE'
    });

    console.log('✓ Initial test environment provisioned.\n');

    // -------------------------------------------------------------
    // TEST 1: Razorpay Online Order Creation & Server-side Pricing
    // -------------------------------------------------------------
    console.log('--- TEST 1: Razorpay Online Order Creation ---');
    const orderData = await orderService.createOrder(customer._id, {
      flashSaleId: flashSale._id,
      quantity: 2,
      paymentMethod: 'ONLINE'
    });

    console.assert(orderData.status === 'PENDING_PAYMENT', `Expected PENDING_PAYMENT, got ${orderData.status}`);
    console.assert(orderData.paymentMethod === 'ONLINE', `Expected ONLINE, got ${orderData.paymentMethod}`);
    console.assert(orderData.paymentStatus === 'PENDING', `Expected PENDING payment, got ${orderData.paymentStatus}`);
    console.assert(orderData.totalPrice === 180, `Expected 180 (2 * 90), got ${orderData.totalPrice}`);
    console.assert(orderData.razorpay?.amount === 18000, `Expected 18000 paise, got ${orderData.razorpay?.amount}`);
    console.assert(Boolean(orderData.razorpay?.orderId), 'Razorpay Order ID must be generated');

    const batchAfterOrder = await InventoryBatch.findById(batch._id);
    console.assert(batchAfterOrder.quantity === 10, `Batch stock must decrement to 10, got ${batchAfterOrder.quantity}`);
    console.log(`✓ Online order #${orderData.orderNumber} created with Razorpay Order ID ${orderData.razorpay.orderId}.`);

    // -------------------------------------------------------------
    // TEST 2: Tampered / Invalid Signature Rejection
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Tampered / Invalid Signature Rejection ---');
    let rejectedTampered = false;
    try {
      await orderService.verifyOnlinePayment(customer._id, {
        orderId: orderData._id,
        razorpay_order_id: orderData.razorpay.orderId,
        razorpay_payment_id: 'pay_tampered_12345',
        razorpay_signature: 'invalid_forged_signature_hex'
      });
    } catch (e) {
      rejectedTampered = true;
      console.log(`✓ Tampered signature rejected: "${e.message}"`);
    }
    console.assert(rejectedTampered, 'Must reject invalid signature');

    const orderAfterTamper = await Order.findById(orderData._id);
    console.assert(orderAfterTamper.paymentStatus === 'FAILED', 'Payment status must be marked FAILED on invalid signature');
    console.assert(orderAfterTamper.status === 'PENDING_PAYMENT', 'Order status must remain unconfirmed');

    // -------------------------------------------------------------
    // TEST 3: Legitimate Cryptographic Signature Verification
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Cryptographic Signature Verification ---');
    const secret = process.env.RAZORPAY_KEY_SECRET;
    const testPaymentId = `pay_legit_${Date.now()}`;
    const validSignature = crypto
      .createHmac('sha256', secret)
      .update(`${orderData.razorpay.orderId}|${testPaymentId}`)
      .digest('hex');

    const verifiedOrder = await orderService.verifyOnlinePayment(customer._id, {
      orderId: orderData._id,
      razorpay_order_id: orderData.razorpay.orderId,
      razorpay_payment_id: testPaymentId,
      razorpay_signature: validSignature
    });

    console.assert(
      verifiedOrder.status === 'WAITING_FOR_STORE_ACCEPTANCE',
      `Order status must transition to WAITING_FOR_STORE_ACCEPTANCE, got ${verifiedOrder.status}`
    );
    console.assert(verifiedOrder.paymentStatus === 'CAPTURED', `Payment status must be CAPTURED, got ${verifiedOrder.paymentStatus}`);
    console.assert(verifiedOrder.razorpayPaymentId === testPaymentId, 'Payment ID must be persisted');
    console.log(`✓ Payment verified! Order status is now ${verifiedOrder.status} (Payment: ${verifiedOrder.paymentStatus}).`);

    // -------------------------------------------------------------
    // TEST 4: Store Owner Authorization & Accept Order Flow
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Store Owner Accept Order Flow ---');
    // Rival store owner cannot accept Store 1's order
    let rivalBlocked = false;
    try {
      await orderService.acceptStoreOrder(rivalOwner._id, verifiedOrder._id);
    } catch (e) {
      rivalBlocked = true;
      console.log(`✓ Rival store owner blocked: "${e.message}"`);
    }
    console.assert(rivalBlocked, 'Rival store owner must not be allowed to accept order');

    // Legitimate store owner accepts
    const acceptedOrder = await orderService.acceptStoreOrder(storeOwner._id, verifiedOrder._id);
    console.assert(acceptedOrder.status === 'ACCEPTED', `Order status must be ACCEPTED, got ${acceptedOrder.status}`);
    console.assert(acceptedOrder.paymentStatus === 'CAPTURED', 'Payment status must stay CAPTURED');
    console.log(`✓ Order #${acceptedOrder.orderNumber} successfully ACCEPTED by store owner.`);

    // Cannot accept an already accepted order
    let doubleAcceptBlocked = false;
    try {
      await orderService.acceptStoreOrder(storeOwner._id, verifiedOrder._id);
    } catch (e) {
      doubleAcceptBlocked = true;
      console.log(`✓ Duplicate acceptance blocked: "${e.message}"`);
    }
    console.assert(doubleAcceptBlocked, 'Duplicate acceptance must be rejected');

    // -------------------------------------------------------------
    // TEST 5: Store Owner Reject Flow & Automated Razorpay Refund
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Store Owner Reject & Automated Refund Flow ---');
    // Create another online order for 3 units
    const order2 = await orderService.createOrder(customer._id, {
      flashSaleId: flashSale._id,
      quantity: 3,
      paymentMethod: 'ONLINE'
    });

    const stockBeforeReject = (await InventoryBatch.findById(batch._id)).quantity;
    console.assert(stockBeforeReject === 7, `Stock should be 7 (10 - 3), got ${stockBeforeReject}`);

    // Verify payment for order2
    const paymentId2 = `pay_refund_test_${Date.now()}`;
    const sig2 = crypto
      .createHmac('sha256', secret)
      .update(`${order2.razorpay.orderId}|${paymentId2}`)
      .digest('hex');

    await orderService.verifyOnlinePayment(customer._id, {
      orderId: order2._id,
      razorpay_order_id: order2.razorpay.orderId,
      razorpay_payment_id: paymentId2,
      razorpay_signature: sig2
    });

    // Store Owner rejects order2 with reason "Out of stock"
    const rejectedOrder = await orderService.rejectStoreOrder(
      storeOwner._id,
      order2._id,
      'Out of stock'
    );

    console.assert(rejectedOrder.status === 'REJECTED', `Status must be REJECTED, got ${rejectedOrder.status}`);
    console.assert(
      rejectedOrder.paymentStatus === 'REFUNDED' || rejectedOrder.paymentStatus === 'REFUND_PENDING',
      `Payment status must be REFUNDED or REFUND_PENDING, got ${rejectedOrder.paymentStatus}`
    );
    console.assert(Boolean(rejectedOrder.refundId), 'Refund ID must be saved');
    console.assert(rejectedOrder.rejectionReason === 'Out of stock', 'Rejection reason must be saved');

    // Verify inventory safely restored
    const stockAfterReject = (await InventoryBatch.findById(batch._id)).quantity;
    console.assert(
      stockAfterReject === 10,
      `Inventory stock must be restored to 10 (7 + 3), got ${stockAfterReject}`
    );
    console.log(`✓ Order #${rejectedOrder.orderNumber} REJECTED. Refund ID: ${rejectedOrder.refundId}. Stock restored to ${stockAfterReject}.`);

    // Cannot accept an already rejected order
    let acceptRejectedBlocked = false;
    try {
      await orderService.acceptStoreOrder(storeOwner._id, rejectedOrder._id);
    } catch (e) {
      acceptRejectedBlocked = true;
      console.log(`✓ Accepting a rejected order blocked: "${e.message}"`);
    }
    console.assert(acceptRejectedBlocked, 'Accepting a rejected order must be blocked');

    // -------------------------------------------------------------
    // TEST 6: Webhook Signature Verification & Idempotency
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: Razorpay Webhook Raw Body & Idempotency ---');
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // Create third order for webhook testing
    const order3 = await orderService.createOrder(customer._id, {
      flashSaleId: flashSale._id,
      quantity: 1,
      paymentMethod: 'ONLINE'
    });

    const webhookPayload = {
      entity: 'event',
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: `pay_hook_${Date.now()}`,
            order_id: order3.razorpay.orderId,
            status: 'captured',
            amount: 9000,
            currency: 'INR'
          }
        }
      }
    };

    const rawBodyString = JSON.stringify(webhookPayload);
    const validWebhookSig = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBodyString)
      .digest('hex');

    // Execute webhook
    const hookResult1 = await orderService.handleRazorpayWebhook(
      rawBodyString,
      validWebhookSig,
      webhookPayload
    );
    console.assert(hookResult1.received === true, 'Webhook should be acknowledged');

    const order3AfterHook = await Order.findById(order3._id);
    console.assert(order3AfterHook.paymentStatus === 'CAPTURED', 'Webhook must update payment to CAPTURED');
    console.assert(
      order3AfterHook.status === 'WAITING_FOR_STORE_ACCEPTANCE',
      'Webhook must update status to WAITING_FOR_STORE_ACCEPTANCE'
    );
    console.log('✓ Webhook payment.captured successfully processed and verified.');

    // Duplicate webhook execution (Idempotency test)
    const hookResult2 = await orderService.handleRazorpayWebhook(
      rawBodyString,
      validWebhookSig,
      webhookPayload
    );
    console.assert(hookResult2.received === true, 'Duplicate webhook should be handled idempotently');
    const order3AfterDup = await Order.findById(order3._id);
    console.assert(order3AfterDup.status === 'WAITING_FOR_STORE_ACCEPTANCE', 'Status remains consistent');
    console.log('✓ Duplicate webhook handled idempotently with zero state corruption.');

    // Tampered webhook rejection
    let tamperedHookRejected = false;
    try {
      await orderService.handleRazorpayWebhook(
        rawBodyString,
        'invalid_signature_hook',
        webhookPayload
      );
    } catch (e) {
      tamperedHookRejected = true;
      console.log(`✓ Tampered webhook rejected: "${e.message}"`);
    }
    console.assert(tamperedHookRejected, 'Tampered webhook signature must be rejected');

    // -------------------------------------------------------------
    // Cleanup Test Data
    // -------------------------------------------------------------
    console.log('\n--- Cleaning up test records ---');
    await Order.deleteMany({ _id: { $in: [orderData._id, order2._id, order3._id] } });
    await FlashSale.deleteMany({ _id: flashSale._id });
    await InventoryBatch.deleteMany({ _id: batch._id });
    await Product.deleteMany({ _id: product._id });
    await Store.deleteMany({ _id: { $in: [store._id, rivalStore._id] } });
    await User.deleteMany({ _id: { $in: [customer._id, storeOwner._id, rivalOwner._id] } });
    console.log('✓ Test records cleaned up.');

    console.log('\n====================================================================');
    console.log('ALL RAZORPAY ONLINE PAYMENT & ACCEPT/REJECT TESTS PASSED! ✓');
    console.log('====================================================================');
  } catch (err) {
    console.error('❌ Test suite failed with error:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

runRazorpaySuite();
