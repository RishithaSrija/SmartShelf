const mongoose = require('mongoose');
const Order = require('../models/Order');
const notificationService = require('./notificationService');

/**
 * SmartShelf Demo Payment Service
 * Provides realistic simulated payment & refund lifecycle for academic/portfolio demonstration.
 * Does NOT collect, store, or transmit real money, card numbers, CVVs, UPI PINs, or credentials.
 */
const demoPaymentService = {
  /**
   * Check if Demo Payment is active (Default: true)
   */
  isDemoMode: () => {
    const configuredProvider = (process.env.PAYMENT_PROVIDER || 'DEMO').toUpperCase();
    return configuredProvider !== 'RAZORPAY';
  },

  /**
   * Get public payment provider info for UI labeling
   */
  getProviderInfo: () => {
    const isDemo = demoPaymentService.isDemoMode();
    return {
      provider: isDemo ? 'DEMO' : 'RAZORPAY',
      isDemo,
      name: isDemo ? 'SmartShelf Demo Payment' : 'Razorpay Secure',
      disclaimer: isDemo
        ? 'Demo Payment: Academic / Portfolio mode. No real money will be charged.'
        : 'Live Payment Gateway',
      supportedMethods: ['UPI', 'CARD', 'NET_BANKING']
    };
  },

  /**
   * Create a simulated payment session for an order
   */
  createDemoPaymentSession: async (orderId, customerId) => {
    const isObjectId = mongoose.Types.ObjectId.isValid(orderId);
    const query = isObjectId
      ? { $or: [{ _id: orderId }, { orderNumber: orderId }] }
      : { orderNumber: orderId };

    const order = await Order.findOne(query);
    if (!order) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      throw error;
    }

    if (order.customerId.toString() !== customerId.toString()) {
      const error = new Error('You are not authorized to pay for this order');
      error.statusCode = 403;
      throw error;
    }

    const sessionId = `demo_sess_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    return {
      sessionId,
      orderNumber: order.orderNumber,
      orderId: order._id,
      amount: order.totalPrice,
      currency: 'INR',
      isDemo: true,
      expiresAt: order.reservationExpiresAt
    };
  },

  /**
   * Simulate Successful Payment
   * Transitions: PENDING -> AUTHORIZED -> CAPTURED
   * Order Status: WAITING_FOR_STORE_ACCEPTANCE
   */
  simulatePaymentSuccess: async ({ orderId, customerId, method = 'UPI' }) => {
    const isObjectId = mongoose.Types.ObjectId.isValid(orderId);
    const query = isObjectId
      ? { $or: [{ _id: orderId }, { orderNumber: orderId }] }
      : { orderNumber: orderId };

    const order = await Order.findOne(query)
      .populate('productId', 'name category brand unit image description')
      .populate('storeId', 'name address phone openingHours businessType location ownerId');

    if (!order) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      throw error;
    }

    if (order.customerId.toString() !== customerId.toString()) {
      const error = new Error('You are not authorized to pay for this order');
      error.statusCode = 403;
      throw error;
    }

    // Idempotency: If already captured, return order safely
    if (order.paymentStatus === 'CAPTURED' && order.status === 'WAITING_FOR_STORE_ACCEPTANCE') {
      return order;
    }

    // Disallow paying for already accepted, completed, rejected, or expired orders
    const nonPayableStatuses = ['ACCEPTED', 'COMPLETED', 'REJECTED', 'CANCELLED', 'EXPIRED'];
    if (nonPayableStatuses.includes(order.status)) {
      const error = new Error(`Cannot pay for order in ${order.status} state.`);
      error.statusCode = 400;
      throw error;
    }

    // Check reservation hold window
    if (new Date() > new Date(order.reservationExpiresAt)) {
      const error = new Error('Reservation hold time has expired. Please reserve again.');
      error.statusCode = 400;
      throw error;
    }

    const transactionId = `DEMO_TXN_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date();

    const normalizedMethod = ['UPI', 'CARD', 'NET_BANKING'].includes(method.toUpperCase())
      ? method.toUpperCase()
      : 'UPI';

    // Atomic update
    order.paymentProvider = 'DEMO';
    order.isDemoPayment = true;
    order.paymentMethod = 'ONLINE';
    order.paymentStatus = 'CAPTURED';
    order.status = 'WAITING_FOR_STORE_ACCEPTANCE';
    order.demoPaymentDetails = {
      method: normalizedMethod,
      transactionId,
      simulatedAt: now
    };

    // Timeline event
    if (!order.paymentTimeline) {
      order.paymentTimeline = [];
    }
    order.paymentTimeline.push({
      status: 'WAITING_FOR_STORE_ACCEPTANCE',
      paymentStatus: 'CAPTURED',
      title: 'Demo Payment Captured',
      description: `Simulated payment of ₹${order.totalPrice} via ${normalizedMethod}. No real money charged.`,
      timestamp: now
    });

    await order.save();

    // Customer Notification
    await notificationService.createOrderNotification({
      userId: customerId,
      orderId: order._id,
      orderNumber: order.orderNumber,
      title: 'Demo Payment Captured',
      message: `Your simulated payment of ₹${order.totalPrice} for order #${order.orderNumber} was successful. Order sent to ${order.storeName} for acceptance.`,
      status: 'WAITING_FOR_STORE_ACCEPTANCE'
    });

    // Store Owner Notification
    const storeOwnerId = order.storeId?.ownerId;
    if (storeOwnerId) {
      await notificationService.createOrderNotification({
        userId: storeOwnerId,
        orderId: order._id,
        orderNumber: order.orderNumber,
        title: 'New Paid Order - Action Required',
        message: `New paid order #${order.orderNumber} (₹${order.totalPrice}) received from ${order.productName}. Please accept or reject.`,
        status: 'WAITING_FOR_STORE_ACCEPTANCE'
      });
    }

    return order;
  },

  /**
   * Simulate Payment Failure
   * Transitions: PENDING -> FAILED
   */
  simulatePaymentFailure: async ({ orderId, customerId, reason = 'User simulated payment failure' }) => {
    const isObjectId = mongoose.Types.ObjectId.isValid(orderId);
    const query = isObjectId
      ? { $or: [{ _id: orderId }, { orderNumber: orderId }] }
      : { orderNumber: orderId };

    const order = await Order.findOne(query);
    if (!order) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      throw error;
    }

    if (order.customerId.toString() !== customerId.toString()) {
      const error = new Error('You are not authorized to perform actions on this order');
      error.statusCode = 403;
      throw error;
    }

    order.paymentStatus = 'FAILED';
    if (!order.paymentTimeline) {
      order.paymentTimeline = [];
    }
    order.paymentTimeline.push({
      status: order.status,
      paymentStatus: 'FAILED',
      title: 'Demo Payment Failed',
      description: `Simulated failure: ${reason}. Order remains reserved; payment can be retried.`,
      timestamp: new Date()
    });

    await order.save();

    return order;
  },

  /**
   * Process Demo Refund when store rejects or cancels a paid order
   * Transitions: CAPTURED -> REFUND_PENDING -> REFUNDED
   */
  processDemoRefund: async (order, reason = 'Store rejected order') => {
    const now = new Date();
    const refundId = `DEMO_RFND_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    order.paymentStatus = 'REFUNDED';
    order.refundId = refundId;
    order.refundAmount = order.totalPrice;
    order.refundedAt = now;

    if (!order.paymentTimeline) {
      order.paymentTimeline = [];
    }
    order.paymentTimeline.push({
      status: order.status,
      paymentStatus: 'REFUNDED',
      title: 'Demo Refund Processed',
      description: `Simulated refund of ₹${order.totalPrice} processed (${reason}). Refund ID: ${refundId}.`,
      timestamp: now
    });

    await order.save();

    // Customer Notification
    await notificationService.createOrderNotification({
      userId: order.customerId,
      orderId: order._id,
      orderNumber: order.orderNumber,
      title: 'Order Declined & Demo Refund Processed',
      message: `Your order #${order.orderNumber} was declined by ${order.storeName} (${reason}). A simulated refund of ₹${order.totalPrice} has been processed.`,
      status: 'REJECTED'
    });

    return {
      refundId,
      refundAmount: order.totalPrice,
      refundedAt: now,
      status: 'REFUNDED'
    };
  }
};

module.exports = demoPaymentService;
