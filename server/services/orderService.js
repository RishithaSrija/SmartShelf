const mongoose = require('mongoose');
const Order = require('../models/Order');
const FlashSale = require('../models/FlashSale');
const InventoryBatch = require('../models/InventoryBatch');
const Product = require('../models/Product');
const Store = require('../models/Store');
const notificationService = require('./notificationService');

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

const orderService = {
  /**
   * Create a new flash sale reservation / order
   */
  createOrder: async (customerId, orderData) => {
    const { flashSaleId, quantity } = orderData;

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

      // Step C: Create the Order document
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
            status: 'PENDING',
            reservationExpiresAt
          }
        ],
        useTransaction ? { session } : {}
      );

      const createdOrder = orderDocs[0];

      if (useTransaction) {
        await session.commitTransaction();
      }

      // 7. Fire notifications
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

      return await Order.findById(createdOrder._id)
        .populate('productId', 'name category brand unit image description')
        .populate('storeId', 'name address phone openingHours businessType location')
        .populate('inventoryBatchId', 'batchNumber expiryDate');
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
    // PENDING -> CONFIRMED | CANCELLED
    // CONFIRMED -> COMPLETED | CANCELLED
    const validTransitions = {
      PENDING: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['COMPLETED', 'CANCELLED'],
      COMPLETED: [],
      CANCELLED: [],
      EXPIRED: []
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
    const updatedOrder = await Order.findOneAndUpdate(
      { _id: order._id, status: order.status },
      {
        $set: {
          status: targetStatus,
          ...(reason ? { cancellationReason: reason } : {})
        }
      },
      { new: true }
    );

    if (!updatedOrder) {
      const error = new Error('Order status has changed concurrently.');
      error.statusCode = 409;
      throw error;
    }

    // If cancelled by store owner, restore inventory and flash sale
    if (targetStatus === 'CANCELLED') {
      const batch = await InventoryBatch.findById(order.inventoryBatchId);
      if (batch) {
        batch.quantity += order.quantity;
        if (batch.status === 'SOLD_OUT' && new Date() < new Date(batch.expiryDate)) {
          batch.status = 'AVAILABLE';
        }
        await batch.save();
      }

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
    }

    // Notify customer of status change
    let notifyTitle = `Order ${targetStatus}`;
    let notifyMsg = `Your order #${order.orderNumber} for ${order.productName} is now ${targetStatus}.`;

    if (targetStatus === 'CONFIRMED') {
      notifyTitle = 'Reservation Confirmed';
      notifyMsg = `The store confirmed your reservation #${order.orderNumber}. You can now pick up your item.`;
    } else if (targetStatus === 'COMPLETED') {
      notifyTitle = 'Order Completed';
      notifyMsg = `Thank you! Your order #${order.orderNumber} has been fulfilled.`;
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
