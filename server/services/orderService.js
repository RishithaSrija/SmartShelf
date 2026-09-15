const mongoose = require('mongoose');
const Order = require('../models/Order');
const FlashSale = require('../models/FlashSale');
const InventoryBatch = require('../models/InventoryBatch');
const Product = require('../models/Product');
const Store = require('../models/Store');
const notificationService = require('./notificationService');
const razorpayService = require('./razorpayService');
const demoPaymentService = require('./demoPaymentService');

/**
 * Helper to generate human-readable unique order numbers
 * Format: SS-YYYYMMDD-XXXXXX (e.g. SS-20260830-482910)
 */
const generateOrderNumber = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(100000 + Math.random() * 900000);
  return `SS-${year}${month}${day}-${random}`;
};

/**
 * Helper to find store owner's store
 */
const getOwnerStore = async (ownerId) => {
  const store = await Store.findOne({ ownerId });
  if (!store) {
    const error = new Error('No store registered for this store owner');
    error.statusCode = 404;
    throw error;
  }
  return store;
};

/**
 * Helper to restore inventory batch and flash sale quantities safely
 */
const restoreOrderInventory = async (order) => {
  // Restore InventoryBatch quantity
  const batch = await InventoryBatch.findById(order.inventoryBatchId);
  if (batch) {
    batch.quantity += order.quantity;
    if (batch.status === 'SOLD_OUT' && new Date() < new Date(batch.expiryDate)) {
      batch.status = 'AVAILABLE';
    }
    await batch.save();
  }

  // Restore FlashSale availableQuantity if sale hasn't ended and batch not expired
  const flashSale = await FlashSale.findById(order.flashSaleId);
  if (flashSale) {
    flashSale.availableQuantity += order.quantity;
    if (
      flashSale.status === 'SOLD_OUT' &&
      new Date() < new Date(flashSale.endsAt) &&
      batch &&
      new Date() < new Date(batch.expiryDate)
    ) {
      flashSale.status = 'ACTIVE';
    }
    await flashSale.save();
  }
};

const orderService = {
  /**
   * Create a new flash sale reservation / order
   */
  createOrder: async (customerId, orderData) => {
    const {
      flashSaleId,
      quantity,
      paymentMethod = 'PAY_AT_STORE',
      orderType = 'DIRECT',
      recipeName,
      basketGroupId,
      ingredientName
    } = orderData;

    // 1. Validate inputs
    if (!flashSaleId) {
      const error = new Error('Flash sale ID is required');
      error.statusCode = 400;
      throw error;
    }

    const requestedQty = parseInt(quantity, 10);
    if (isNaN(requestedQty) || requestedQty < 1) {
      const error = new Error('Reservation quantity must be at least 1');
      error.statusCode = 400;
      throw error;
    }

    // 2. Fetch and validate Flash Sale
    const flashSale = await FlashSale.findById(flashSaleId)
      .populate('productId')
      .populate('storeId');

    if (!flashSale) {
      const error = new Error('Flash sale deal not found');
      error.statusCode = 404;
      throw error;
    }

    if (flashSale.status !== 'ACTIVE') {
      const error = new Error('Sorry, this flash sale is no longer active.');
      error.statusCode = 400;
      throw error;
    }

    if (new Date() >= new Date(flashSale.endsAt)) {
      const error = new Error('Sorry, this flash sale deal has expired.');
      error.statusCode = 400;
      throw error;
    }

    if (flashSale.availableQuantity < requestedQty) {
      const error = new Error(
        `Only ${flashSale.availableQuantity} units are currently available.`
      );
      error.statusCode = 400;
      throw error;
    }

    // 3. Fetch and validate Inventory Batch
    const batch = await InventoryBatch.findById(flashSale.inventoryBatchId);
    if (!batch || batch.status === 'EXPIRED' || new Date() >= new Date(batch.expiryDate)) {
      const error = new Error('Underlying inventory batch has expired.');
      error.statusCode = 400;
      throw error;
    }

    if (batch.quantity < requestedQty) {
      const error = new Error(
        `Insufficient store inventory. Only ${batch.quantity} units remain in stock.`
      );
      error.statusCode = 400;
      throw error;
    }

    // 4. Check store active status
    const store = await Store.findById(flashSale.storeId._id || flashSale.storeId);
    if (!store || !store.isActive) {
      const error = new Error('The store offering this flash sale is currently inactive.');
      error.statusCode = 400;
      throw error;
    }

    // 5. Calculate snapshot prices & expiry (30 mins hold)
    const unitPrice = flashSale.salePrice;
    const totalPrice = parseFloat((unitPrice * requestedQty).toFixed(2));
    const reservationExpiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 mins
    const orderNumber = generateOrderNumber();

    // 6. Atomic Inventory & FlashSale reservation with transaction / fallback protection
    let session = null;
    let useTransaction = false;

    try {
      const topologyType = mongoose.connection?.client?.topology?.description?.type;
      const isReplicaSet = topologyType === 'ReplicaSetWithPrimary' || topologyType === 'Sharded';
      if (isReplicaSet) {
        session = await mongoose.startSession();
        session.startTransaction();
        useTransaction = true;
      }
    } catch (e) {
      session = null;
      useTransaction = false;
    }

    try {
      // Step A: Atomically decrement inventory batch
      const updatedBatch = await InventoryBatch.findOneAndUpdate(
        {
          _id: batch._id,
          quantity: { $gte: requestedQty }
        },
        {
          $inc: { quantity: -requestedQty }
        },
        {
          new: true,
          ...(useTransaction ? { session } : {})
        }
      );

      if (!updatedBatch) {
        throw new Error('Could not reserve inventory. Item was just claimed by another customer.');
      }

      if (updatedBatch.quantity === 0) {
        updatedBatch.status = 'SOLD_OUT';
        await updatedBatch.save(useTransaction ? { session } : {});
      }

      // Step B: Atomically decrement flash sale available quantity
      const updatedSale = await FlashSale.findOneAndUpdate(
        {
          _id: flashSale._id,
          availableQuantity: { $gte: requestedQty }
        },
        {
          $inc: { availableQuantity: -requestedQty }
        },
        {
          new: true,
          ...(useTransaction ? { session } : {})
        }
      );

      if (!updatedSale) {
        // Rollback batch decrement if standalone
        if (!useTransaction) {
          await InventoryBatch.findByIdAndUpdate(batch._id, {
            $inc: { quantity: requestedQty }
          });
        }
        throw new Error('Flash sale stock was just claimed. Please try again.');
      }

      if (updatedSale.availableQuantity === 0) {
        updatedSale.status = 'SOLD_OUT';
        await updatedSale.save(useTransaction ? { session } : {});
      }

      // Step C: Handle Online Payment order generation if requested
      const isOnline = paymentMethod === 'ONLINE';
      const isRazorpayExplicit = orderData.paymentProvider === 'RAZORPAY' || (process.env.PAYMENT_PROVIDER || '').toUpperCase() === 'RAZORPAY';
      const hasRazorpayKeys = Boolean(process.env.RAZORPAY_KEY_ID);
      const isDemo = !isRazorpayExplicit && demoPaymentService.isDemoMode();
      let rzpOrder = null;
      const initialStatus = isOnline ? 'PENDING_PAYMENT' : 'PENDING';
      const initialPaymentStatus = 'PENDING';

      if (isOnline && (isRazorpayExplicit || hasRazorpayKeys)) {
        try {
          const amountPaise = Math.round(totalPrice * 100);
          rzpOrder = await razorpayService.createRazorpayOrder({
            amountPaise,
            currency: 'INR',
            receipt: orderNumber,
            notes: {
              smartShelfOrderNumber: orderNumber,
              customerId: String(customerId),
              flashSaleId: String(flashSale._id)
            }
          });
        } catch (rzpErr) {
          if (isRazorpayExplicit) throw rzpErr;
        }
      }

      // Step D: Create the Order document
      const initialTimeline = [
        {
          status: initialStatus,
          paymentStatus: initialPaymentStatus,
          title: 'Order Created',
          description: isOnline
            ? (isDemo ? 'Order placed with Demo Payment option.' : 'Order placed awaiting Razorpay payment.')
            : 'Order placed for store pickup.',
          timestamp: new Date()
        }
      ];

      const orderDocs = await Order.create(
        [
          {
            orderNumber,
            customerId,
            storeId: store._id,
            flashSaleId: flashSale._id,
            inventoryBatchId: batch._id,
            productId: flashSale.productId._id || flashSale.productId,
            productName: flashSale.productId.name || flashSale.title,
            storeName: store.name,
            quantity: requestedQty,
            unitPrice,
            totalPrice,
            status: initialStatus,
            paymentMethod: isOnline ? 'ONLINE' : 'PAY_AT_STORE',
            paymentStatus: initialPaymentStatus,
            paymentProvider: isOnline ? (isRazorpayExplicit ? 'RAZORPAY' : 'DEMO') : 'NONE',
            isDemoPayment: isOnline ? !isRazorpayExplicit : false,
            paymentTimeline: initialTimeline,
            razorpayOrderId: rzpOrder ? rzpOrder.id : undefined,
            reservationExpiresAt,
            orderType,
            recipeName: recipeName || undefined,
            basketGroupId: basketGroupId || undefined,
            ingredientName: ingredientName || undefined
          }
        ],
        useTransaction ? { session } : {}
      );

      const createdOrder = orderDocs[0];

      if (useTransaction) {
        await session.commitTransaction();
      }

      // 7. Fire notifications (only for direct reserve; online payment notifies upon verification)
      if (!isOnline) {
        await notificationService.createOrderNotification({
          userId: customerId,
          orderId: createdOrder._id,
          orderNumber: createdOrder.orderNumber,
          title: 'Deal Reserved Successfully',
          message: `Your reservation for ${createdOrder.quantity}x ${createdOrder.productName} at ${createdOrder.storeName} is confirmed for 30 minutes.`,
          status: 'PENDING'
        });

        if (store.ownerId) {
          await notificationService.createOrderNotification({
            userId: store.ownerId,
            orderId: createdOrder._id,
            orderNumber: createdOrder.orderNumber,
            title: 'New Flash Sale Reservation',
            message: `New reservation #${createdOrder.orderNumber} for ${createdOrder.quantity}x ${createdOrder.productName} (₹${createdOrder.totalPrice}).`,
            status: 'PENDING'
          });
        }
      }

      const populatedOrder = await Order.findById(createdOrder._id)
        .populate('productId', 'name category brand unit image description')
        .populate('storeId', 'name address phone openingHours businessType location')
        .populate('inventoryBatchId', 'batchNumber expiryDate');

      if (isOnline) {
        const orderObj = populatedOrder.toObject();
        if (isDemo) {
          orderObj.demoPayment = {
            orderId: createdOrder._id,
            orderNumber: createdOrder.orderNumber,
            amount: totalPrice,
            currency: 'INR',
            isDemo: true
          };
        }
        if (rzpOrder) {
          orderObj.razorpay = {
            orderId: rzpOrder.id,
            amount: Math.round(totalPrice * 100),
            currency: 'INR',
            keyId: razorpayService.getPublicKey()
          };
        }
        return orderObj;
      }

      return populatedOrder;
    } catch (err) {
      if (useTransaction && session) {
        await session.abortTransaction();
      }
      err.statusCode = err.statusCode || 400;
      throw err;
    } finally {
      if (session) {
        session.endSession();
      }
    }
  },

  /**
   * Get orders for the logged-in customer
   */
  getCustomerOrders: async (customerId, queryParams = {}) => {
    const page = Math.max(1, parseInt(queryParams.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(queryParams.limit) || 10));
    const skip = (page - 1) * limit;

    const filter = { customerId };

    if (queryParams.status && queryParams.status.toUpperCase() !== 'ALL') {
      filter.status = queryParams.status.toUpperCase();
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('productId', 'name category brand unit image')
        .populate('storeId', 'name address phone openingHours businessType location')
        .populate('inventoryBatchId', 'batchNumber expiryDate')
        .populate('flashSaleId', 'title discountPercentage salePrice originalPrice endsAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Order.countDocuments(filter)
    ]);

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || (total === 0 ? 0 : 1)
      }
    };
  },

  /**
   * Get single order details for customer
   */
  getCustomerOrder: async (customerId, orderId) => {
    const isObjectId = mongoose.Types.ObjectId.isValid(orderId);
    const query = isObjectId
      ? { $or: [{ _id: orderId }, { orderNumber: orderId }] }
      : { orderNumber: orderId };

    const order = await Order.findOne(query)
      .populate('productId', 'name category brand unit image description')
      .populate('storeId', 'name address phone openingHours businessType location')
      .populate('inventoryBatchId', 'batchNumber expiryDate')
      .populate('flashSaleId', 'title discountPercentage salePrice originalPrice endsAt');

    if (!order) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      throw error;
    }

    if (order.customerId.toString() !== customerId.toString()) {
      const error = new Error('You are not authorized to view this order');
      error.statusCode = 403;
      throw error;
    }

    return order;
  },

  /**
   * Cancel customer reservation (Only PENDING orders allowed)
   */
  cancelCustomerOrder: async (customerId, orderId, reason = 'Cancelled by customer') => {
    const order = await Order.findById(orderId);
    if (!order) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      throw error;
    }

    if (order.customerId.toString() !== customerId.toString()) {
      const error = new Error('You are not authorized to cancel this order');
      error.statusCode = 403;
      throw error;
    }

    if (order.status !== 'PENDING') {
      const error = new Error(
        `Cannot cancel an order with status ${order.status}. Only PENDING reservations can be cancelled.`
      );
      error.statusCode = 400;
      throw error;
    }

    // Atomically transition status to CANCELLED to prevent race condition double cancellation
    const updatedOrder = await Order.findOneAndUpdate(
      { _id: order._id, status: 'PENDING' },
      {
        $set: {
          status: 'CANCELLED',
          cancellationReason: reason
        }
      },
      { new: true }
    );

    if (!updatedOrder) {
      const error = new Error('Order was already processed or cancelled.');
      error.statusCode = 400;
      throw error;
    }

    // Restore InventoryBatch quantity
    const batch = await InventoryBatch.findById(order.inventoryBatchId);
    if (batch) {
      batch.quantity += order.quantity;
      if (batch.status === 'SOLD_OUT' && new Date() < new Date(batch.expiryDate)) {
        batch.status = 'AVAILABLE';
      }
      await batch.save();
    }

    // Restore FlashSale availableQuantity if sale hasn't ended and batch not expired
    const flashSale = await FlashSale.findById(order.flashSaleId);
    if (flashSale) {
      flashSale.availableQuantity += order.quantity;
      if (
        flashSale.status === 'SOLD_OUT' &&
        new Date() < new Date(flashSale.endsAt) &&
        batch &&
        new Date() < new Date(batch.expiryDate)
      ) {
        flashSale.status = 'ACTIVE';
      }
      await flashSale.save();
    }

    // Fire notifications
    await notificationService.createOrderNotification({
      userId: customerId,
      orderId: order._id,
      orderNumber: order.orderNumber,
      title: 'Reservation Cancelled',
      message: `Your reservation #${order.orderNumber} for ${order.productName} has been cancelled.`,
      status: 'CANCELLED'
    });

    const store = await Store.findById(order.storeId);
    if (store && store.ownerId) {
      await notificationService.createOrderNotification({
        userId: store.ownerId,
        orderId: order._id,
        orderNumber: order.orderNumber,
        title: 'Customer Cancelled Reservation',
        message: `Reservation #${order.orderNumber} for ${order.quantity}x ${order.productName} was cancelled and inventory restored.`,
        status: 'CANCELLED'
      });
    }

    return updatedOrder;
  },

  /**
   * Get orders for Store Owner's store
   */
  getStoreOrders: async (ownerId, queryParams = {}) => {
    const store = await getOwnerStore(ownerId);

    const page = Math.max(1, parseInt(queryParams.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(queryParams.limit) || 10));
    const skip = (page - 1) * limit;

    const filter = { storeId: store._id };

    if (queryParams.status && queryParams.status.toUpperCase() !== 'ALL') {
      filter.status = queryParams.status.toUpperCase();
    }

    if (queryParams.search && queryParams.search.trim()) {
      const searchRegex = new RegExp(queryParams.search.trim(), 'i');
      filter.$or = [
        { orderNumber: searchRegex },
        { productName: searchRegex }
      ];
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('customerId', 'name phone email')
        .populate('productId', 'name category brand unit image')
        .populate('inventoryBatchId', 'batchNumber expiryDate')
        .populate('flashSaleId', 'title discountPercentage salePrice')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Order.countDocuments(filter)
    ]);

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || (total === 0 ? 0 : 1)
      }
    };
  },

  /**
   * Get single store order details for Store Owner
   */
  getStoreOrder: async (ownerId, orderId) => {
    const store = await getOwnerStore(ownerId);

    const isObjectId = mongoose.Types.ObjectId.isValid(orderId);
    const query = isObjectId
      ? { $or: [{ _id: orderId }, { orderNumber: orderId }] }
      : { orderNumber: orderId };

    const order = await Order.findOne(query)
      .populate('customerId', 'name phone email')
      .populate('productId', 'name category brand unit image description')
      .populate('inventoryBatchId', 'batchNumber expiryDate')
      .populate('flashSaleId', 'title discountPercentage salePrice originalPrice endsAt');

    if (!order) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      throw error;
    }

    if (order.storeId.toString() !== store._id.toString()) {
      const error = new Error('You are not authorized to view orders from another store');
      error.statusCode = 403;
      throw error;
    }

    return order;
  },

  /**
   * Update order status by Store Owner (Enforces state machine)
   */
  updateStoreOrderStatus: async (ownerId, orderId, newStatus, reason = '') => {
    const store = await getOwnerStore(ownerId);

    const order = await Order.findById(orderId);
    if (!order) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      throw error;
    }

    if (order.storeId.toString() !== store._id.toString()) {
      const error = new Error('You are not authorized to update orders for another store');
      error.statusCode = 403;
      throw error;
    }

    const targetStatus = newStatus.toUpperCase();

    // Valid state transitions:
    // PENDING -> CONFIRMED | CANCELLED | ACCEPTED | REJECTED
    // PENDING_PAYMENT -> CANCELLED
    // WAITING_FOR_STORE_ACCEPTANCE -> ACCEPTED | REJECTED | CONFIRMED | CANCELLED
    // ACCEPTED -> COMPLETED | CANCELLED
    // CONFIRMED -> COMPLETED | CANCELLED
    const validTransitions = {
      PENDING: ['CONFIRMED', 'CANCELLED', 'ACCEPTED', 'REJECTED'],
      PENDING_PAYMENT: ['CANCELLED'],
      WAITING_FOR_STORE_ACCEPTANCE: ['ACCEPTED', 'REJECTED', 'CONFIRMED', 'CANCELLED'],
      ACCEPTED: ['COMPLETED', 'CANCELLED'],
      CONFIRMED: ['COMPLETED', 'CANCELLED'],
      COMPLETED: [],
      CANCELLED: [],
      EXPIRED: [],
      REJECTED: []
    };

    const allowed = validTransitions[order.status] || [];
    if (!allowed.includes(targetStatus)) {
      const error = new Error(
        `Invalid status transition from ${order.status} to ${targetStatus}.`
      );
      error.statusCode = 400;
      throw error;
    }

    // Atomic update
    const isOnlinePaid = order.paymentMethod === 'ONLINE' && order.paymentStatus === 'CAPTURED';
    const isRejectionOrCancel = targetStatus === 'CANCELLED' || targetStatus === 'REJECTED';

    const updatedOrder = await Order.findOneAndUpdate(
      { _id: order._id, status: order.status },
      {
        $set: {
          status: targetStatus,
          ...(reason ? { cancellationReason: reason, rejectionReason: reason } : {}),
          ...(isRejectionOrCancel && isOnlinePaid ? { paymentStatus: 'REFUND_PENDING' } : {})
        }
      },
      { new: true }
    );

    if (!updatedOrder) {
      const error = new Error('Order status has changed concurrently.');
      error.statusCode = 409;
      throw error;
    }

    // If cancelled or rejected by store owner, restore inventory and flash sale
    if (isRejectionOrCancel) {
      await restoreOrderInventory(order);

      // If online payment was captured, initiate refund
      if (isOnlinePaid) {
        if (order.isDemoPayment || order.paymentProvider === 'DEMO' || !order.razorpayPaymentId) {
          await demoPaymentService.processDemoRefund(updatedOrder, reason || `Order ${targetStatus.toLowerCase()} by store`);
        } else if (order.razorpayPaymentId) {
          try {
            const amountPaise = Math.round(order.totalPrice * 100);
            const refund = await razorpayService.initiateRefund(order.razorpayPaymentId, amountPaise, {
              orderNumber: order.orderNumber,
              reason: reason || `Order ${targetStatus.toLowerCase()} by store`
            });

            if (refund && refund.id) {
              updatedOrder.refundId = refund.id;
              updatedOrder.refundAmount = order.totalPrice;
              updatedOrder.refundedAt = new Date();
              updatedOrder.paymentStatus = refund.status === 'processed' ? 'REFUNDED' : 'REFUND_PENDING';
              await updatedOrder.save();
            }
          } catch (refundErr) {
            console.error('[OrderService] Refund failed during status update:', refundErr.message);
            updatedOrder.paymentStatus = 'REFUND_PENDING';
            await updatedOrder.save();
          }
        }
      }
    }

    // Notify customer of status change
    let notifyTitle = `Order ${targetStatus}`;
    let notifyMsg = `Your order #${order.orderNumber} for ${order.productName} is now ${targetStatus}.`;

    if (targetStatus === 'CONFIRMED' || targetStatus === 'ACCEPTED') {
      notifyTitle = 'Order Confirmed by Store';
      notifyMsg = `The store confirmed your order #${order.orderNumber}. You can now pick up your item.`;
    } else if (targetStatus === 'COMPLETED') {
      notifyTitle = 'Order Completed';
      notifyMsg = `Thank you! Your order #${order.orderNumber} has been fulfilled.`;
    } else if (targetStatus === 'REJECTED') {
      notifyTitle = 'Order Declined';
      notifyMsg = `Store declined order #${order.orderNumber}.${isOnlinePaid ? ' A refund has been initiated.' : ''}`;
    }

    await notificationService.createOrderNotification({
      userId: order.customerId,
      orderId: order._id,
      orderNumber: order.orderNumber,
      title: notifyTitle,
      message: notifyMsg,
      status: targetStatus
    });

    return updatedOrder;
  },

  /**
   * Verify online payment from customer Razorpay response
   */
  verifyOnlinePayment: async (customerId, paymentData) => {
    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentData;

    if (!orderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      const error = new Error('Missing payment verification parameters');
      error.statusCode = 400;
      throw error;
    }

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
      const error = new Error('You are not authorized to verify payment for this order');
      error.statusCode = 403;
      throw error;
    }

    // Idempotent return if already verified and captured
    if (
      order.paymentStatus === 'CAPTURED' &&
      ['WAITING_FOR_STORE_ACCEPTANCE', 'ACCEPTED', 'CONFIRMED', 'COMPLETED'].includes(order.status)
    ) {
      return order;
    }

    // Cryptographic signature verification using Razorpay secret
    const isValidSignature = razorpayService.verifyPaymentSignature({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    });

    if (!isValidSignature) {
      order.paymentStatus = 'FAILED';
      await order.save();

      console.warn(`[OrderService] Invalid payment signature for order #${order.orderNumber}`);
      const error = new Error('Invalid payment signature verification failed');
      error.statusCode = 400;
      throw error;
    }

    // Atomic update to transition to WAITING_FOR_STORE_ACCEPTANCE and CAPTURED
    const updatedOrder = await Order.findOneAndUpdate(
      { _id: order._id },
      {
        $set: {
          status: 'WAITING_FOR_STORE_ACCEPTANCE',
          paymentStatus: 'CAPTURED',
          paymentMethod: 'ONLINE',
          razorpayOrderId: razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature
        }
      },
      { new: true }
    )
      .populate('productId', 'name category brand unit image description')
      .populate('storeId', 'name address phone openingHours businessType location ownerId')
      .populate('inventoryBatchId', 'batchNumber expiryDate');

    // Notify customer
    await notificationService.createOrderNotification({
      userId: customerId,
      orderId: updatedOrder._id,
      orderNumber: updatedOrder.orderNumber,
      title: 'Payment Verified & Order Placed',
      message: `Your payment of ₹${updatedOrder.totalPrice} for order #${updatedOrder.orderNumber} is verified. Waiting for store acceptance.`,
      status: 'WAITING_FOR_STORE_ACCEPTANCE'
    });

    // Notify store owner
    const storeOwnerId = updatedOrder.storeId?.ownerId;
    if (storeOwnerId) {
      await notificationService.createOrderNotification({
        userId: storeOwnerId,
        orderId: updatedOrder._id,
        orderNumber: updatedOrder.orderNumber,
        title: 'New Paid Order - Action Required',
        message: `Order #${updatedOrder.orderNumber} (₹${updatedOrder.totalPrice}) is paid and waiting for your confirmation.`,
        status: 'WAITING_FOR_STORE_ACCEPTANCE'
      });
    }

    return updatedOrder;
  },

  /**
   * Store Owner explicitly ACCEPTS an incoming order
   */
  acceptStoreOrder: async (ownerId, orderId) => {
    const store = await getOwnerStore(ownerId);

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

    if (order.storeId.toString() !== store._id.toString()) {
      const error = new Error('You are not authorized to accept orders for another store');
      error.statusCode = 403;
      throw error;
    }

    // Verify order status
    const acceptableStatuses = ['WAITING_FOR_STORE_ACCEPTANCE', 'PENDING'];
    if (!acceptableStatuses.includes(order.status)) {
      const error = new Error(
        `Cannot accept order in status ${order.status}. Only orders waiting for acceptance or pending can be accepted.`
      );
      error.statusCode = 400;
      throw error;
    }

    // Online orders must have CAPTURED payment
    if (order.paymentMethod === 'ONLINE' && order.paymentStatus !== 'CAPTURED') {
      const error = new Error('Cannot accept online order until payment is verified and captured.');
      error.statusCode = 400;
      throw error;
    }

    // Atomically transition status to ACCEPTED
    const updatedOrder = await Order.findOneAndUpdate(
      { _id: order._id, status: order.status },
      {
        $set: {
          status: 'ACCEPTED'
        }
      },
      { new: true }
    )
      .populate('customerId', 'name phone email')
      .populate('productId', 'name category brand unit image description')
      .populate('inventoryBatchId', 'batchNumber expiryDate');

    if (!updatedOrder) {
      const error = new Error('Order status has changed concurrently.');
      error.statusCode = 409;
      throw error;
    }

    if (!updatedOrder.paymentTimeline) {
      updatedOrder.paymentTimeline = [];
    }
    updatedOrder.paymentTimeline.push({
      status: 'ACCEPTED',
      paymentStatus: updatedOrder.paymentStatus,
      title: 'Order Accepted by Store',
      description: `Store confirmed order #${updatedOrder.orderNumber}. Items are being prepared for pickup.`,
      timestamp: new Date()
    });
    await updatedOrder.save();

    // Fire customer notification
    await notificationService.createOrderNotification({
      userId: updatedOrder.customerId._id || updatedOrder.customerId,
      orderId: updatedOrder._id,
      orderNumber: updatedOrder.orderNumber,
      title: 'Order Accepted by Store',
      message: `Great news! ${store.name} accepted your order #${updatedOrder.orderNumber}. Your items are being prepared for pickup.`,
      status: 'ACCEPTED'
    });

    return updatedOrder;
  },

  /**
   * Store Owner REJECTS an incoming order (Restores inventory & initiates refund for paid orders)
   */
  rejectStoreOrder: async (ownerId, orderId, reason = 'Out of stock or store unavailable') => {
    const store = await getOwnerStore(ownerId);

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

    if (order.storeId.toString() !== store._id.toString()) {
      const error = new Error('You are not authorized to reject orders for another store');
      error.statusCode = 403;
      throw error;
    }

    const nonRejectableStatuses = ['REJECTED', 'CANCELLED', 'EXPIRED', 'COMPLETED'];
    if (nonRejectableStatuses.includes(order.status)) {
      const error = new Error(`Order #${order.orderNumber} is already in ${order.status} state and cannot be rejected.`);
      error.statusCode = 400;
      throw error;
    }

    const isOnlinePaid = order.paymentMethod === 'ONLINE' && order.paymentStatus === 'CAPTURED';

    // Atomically update order to REJECTED
    const updatedOrder = await Order.findOneAndUpdate(
      { _id: order._id, status: order.status },
      {
        $set: {
          status: 'REJECTED',
          rejectionReason: reason,
          cancellationReason: reason,
          ...(isOnlinePaid ? { paymentStatus: 'REFUND_PENDING' } : {})
        }
      },
      { new: true }
    );

    if (!updatedOrder) {
      const error = new Error('Order status has changed concurrently.');
      error.statusCode = 409;
      throw error;
    }

    // Restore inventory safely
    await restoreOrderInventory(updatedOrder);

    // If online paid, process refund
    if (isOnlinePaid) {
      if (order.isDemoPayment || order.paymentProvider === 'DEMO' || !order.razorpayPaymentId) {
        await demoPaymentService.processDemoRefund(updatedOrder, reason);
      } else if (order.razorpayPaymentId) {
        try {
          const amountPaise = Math.round(order.totalPrice * 100);
          const refund = await razorpayService.initiateRefund(order.razorpayPaymentId, amountPaise, {
            orderNumber: order.orderNumber,
            rejectionReason: reason
          });

          if (refund && refund.id) {
            updatedOrder.refundId = refund.id;
            updatedOrder.refundAmount = order.totalPrice;
            updatedOrder.refundedAt = new Date();
            updatedOrder.paymentStatus = refund.status === 'processed' ? 'REFUNDED' : 'REFUND_PENDING';
            await updatedOrder.save();
          }
        } catch (refundErr) {
          console.error('[OrderService] Refund initiation error on reject:', refundErr.message);
          updatedOrder.paymentStatus = 'REFUND_PENDING';
          await updatedOrder.save();
        }
      }
    }

    // Notify customer
    const refundNote = isOnlinePaid
      ? ` A full refund of ₹${updatedOrder.totalPrice} has been initiated to your original payment method.`
      : '';

    await notificationService.createOrderNotification({
      userId: updatedOrder.customerId,
      orderId: updatedOrder._id,
      orderNumber: updatedOrder.orderNumber,
      title: 'Order Declined & Refund Initiated',
      message: `Your order #${updatedOrder.orderNumber} was declined by ${store.name} (${reason}).${refundNote}`,
      status: 'REJECTED'
    });

    return updatedOrder;
  },

  /**
   * Idempotently handle incoming Razorpay webhooks
   */
  handleRazorpayWebhook: async (rawBody, signature, eventPayload) => {
    // 1. Verify signature
    const isValid = razorpayService.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      const error = new Error('Invalid Razorpay webhook signature');
      error.statusCode = 400;
      throw error;
    }

    const { event, payload } = eventPayload;
    console.log(`[OrderService] Processing Razorpay webhook event: ${event}`);

    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = payload?.payment?.entity;
      const orderEntity = payload?.order?.entity;
      const rzpOrderId = paymentEntity?.order_id || orderEntity?.id;
      const rzpPaymentId = paymentEntity?.id;

      if (rzpOrderId) {
        const order = await Order.findOne({
          $or: [
            { razorpayOrderId: rzpOrderId },
            { orderNumber: paymentEntity?.notes?.smartShelfOrderId || orderEntity?.receipt }
          ]
        });

        if (order && (order.status === 'PENDING_PAYMENT' || order.paymentStatus === 'PENDING')) {
          order.status = 'WAITING_FOR_STORE_ACCEPTANCE';
          order.paymentStatus = 'CAPTURED';
          order.paymentMethod = 'ONLINE';
          if (rzpPaymentId) order.razorpayPaymentId = rzpPaymentId;
          await order.save();

          console.log(`[OrderService] Webhook updated order #${order.orderNumber} to WAITING_FOR_STORE_ACCEPTANCE`);
        }
      }
    } else if (event === 'payment.failed') {
      const paymentEntity = payload?.payment?.entity;
      const rzpOrderId = paymentEntity?.order_id;

      if (rzpOrderId) {
        const order = await Order.findOne({ razorpayOrderId: rzpOrderId });
        if (order && order.paymentStatus === 'PENDING') {
          order.paymentStatus = 'FAILED';
          await order.save();
        }
      }
    } else if (event === 'refund.processed') {
      const refundEntity = payload?.refund?.entity;
      const paymentId = refundEntity?.payment_id;

      if (paymentId) {
        const order = await Order.findOne({ razorpayPaymentId: paymentId });
        if (order) {
          order.paymentStatus = 'REFUNDED';
          order.refundId = refundEntity.id;
          await order.save();
        }
      }
    } else if (event === 'refund.failed') {
      const refundEntity = payload?.refund?.entity;
      const paymentId = refundEntity?.payment_id;

      if (paymentId) {
        const order = await Order.findOne({ razorpayPaymentId: paymentId });
        if (order) {
          order.paymentStatus = 'REFUND_FAILED';
          await order.save();
        }
      }
    }

    return { received: true, event };
  },

  /**
   * Idempotent reservation expiration cron job
   * Releases expired PENDING reservations and restores inventory
   */
  expireReservations: async () => {
    const now = new Date();
    const expiredPendingOrders = await Order.find({
      status: 'PENDING',
      reservationExpiresAt: { $lt: now }
    });

    if (!expiredPendingOrders || expiredPendingOrders.length === 0) {
      return { expiredCount: 0 };
    }

    let processedCount = 0;

    for (const order of expiredPendingOrders) {
      // Atomically transition from PENDING to EXPIRED (idempotent protection against double restore)
      const updatedOrder = await Order.findOneAndUpdate(
        { _id: order._id, status: 'PENDING' },
        {
          $set: {
            status: 'EXPIRED',
            cancellationReason: 'Reservation expired automatically after 30 minutes'
          }
        },
        { new: true }
      );

      if (!updatedOrder) {
        continue; // Already processed by another job run or cancelled
      }

      // Restore InventoryBatch quantity
      const batch = await InventoryBatch.findById(order.inventoryBatchId);
      if (batch) {
        batch.quantity += order.quantity;
        if (batch.status === 'SOLD_OUT' && new Date() < new Date(batch.expiryDate)) {
          batch.status = 'AVAILABLE';
        }
        await batch.save();
      }

      // Restore FlashSale available quantity
      const flashSale = await FlashSale.findById(order.flashSaleId);
      if (flashSale) {
        flashSale.availableQuantity += order.quantity;
        if (
          flashSale.status === 'SOLD_OUT' &&
          new Date() < new Date(flashSale.endsAt) &&
          batch &&
          new Date() < new Date(batch.expiryDate)
        ) {
          flashSale.status = 'ACTIVE';
        }
        await flashSale.save();
      }

      // Notify customer
      await notificationService.createOrderNotification({
        userId: order.customerId,
        orderId: order._id,
        orderNumber: order.orderNumber,
        title: 'Reservation Expired',
        message: `Your reservation #${order.orderNumber} for ${order.productName} expired because it was not confirmed within 30 minutes.`,
        status: 'EXPIRED'
      });

      // Notify store owner
      const store = await Store.findById(order.storeId);
      if (store && store.ownerId) {
        await notificationService.createOrderNotification({
          userId: store.ownerId,
          orderId: order._id,
          orderNumber: order.orderNumber,
          title: 'Reservation Expired',
          message: `Pending reservation #${order.orderNumber} (${order.productName}) has expired and inventory was returned to stock.`,
          status: 'EXPIRED'
        });
      }

      processedCount++;
    }

    return { expiredCount: processedCount };
  }
};

module.exports = orderService;
