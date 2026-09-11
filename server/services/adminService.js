const mongoose = require('mongoose');
const User = require('../models/User');
const Store = require('../models/Store');
const Product = require('../models/Product');
const InventoryBatch = require('../models/InventoryBatch');
const FlashSale = require('../models/FlashSale');
const Order = require('../models/Order');
const ActivityLog = require('../models/ActivityLog');
const JobExecution = require('../models/JobExecution');

const adminService = {
  /**
   * Helper to create ActivityLog record
   */
  logActivity: async ({ userId, action, entityType, entityId, metadata = {} }) => {
    try {
      await ActivityLog.create({
        userId,
        action,
        entityType,
        entityId: String(entityId),
        metadata
      });
    } catch (err) {
      console.error('[AdminService] logActivity error:', err.message);
    }
  },

  /**
   * 1. Platform Overview Dashboard Stats
   */
  getDashboardStats: async () => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const [
      users,
      stores,
      activeStores,
      products,
      inventoryBatches,
      activeFlashSales,
      pendingOrders,
      expiringToday,
      expiredBatches
    ] = await Promise.all([
      User.countDocuments(),
      Store.countDocuments(),
      Store.countDocuments({ isActive: true }),
      Product.countDocuments(),
      InventoryBatch.countDocuments(),
      FlashSale.countDocuments({
        status: 'ACTIVE',
        endsAt: { $gt: now }
      }),
      Order.countDocuments({ status: 'PENDING' }),
      InventoryBatch.countDocuments({
        expiryDate: { $gte: startOfToday, $lte: endOfToday },
        status: { $ne: 'EXPIRED' }
      }),
      InventoryBatch.countDocuments({
        $or: [{ status: 'EXPIRED' }, { expiryDate: { $lt: now } }]
      })
    ]);

    return {
      users,
      stores,
      activeStores,
      products,
      inventoryBatches,
      activeFlashSales,
      pendingOrders,
      expiringToday,
      expiredBatches
    };
  },

  /**
   * 2. User Management
   */
  getUsers: async (queryParams = {}) => {
    const page = Math.max(1, parseInt(queryParams.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(queryParams.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = {};

    if (queryParams.role && queryParams.role.toUpperCase() !== 'ALL') {
      filter.role = queryParams.role.toUpperCase();
    }

    if (queryParams.status) {
      if (queryParams.status.toUpperCase() === 'ACTIVE') filter.isActive = true;
      if (queryParams.status.toUpperCase() === 'INACTIVE') filter.isActive = false;
    }

    if (queryParams.search && queryParams.search.trim()) {
      const searchRegex = new RegExp(queryParams.search.trim(), 'i');
      filter.$or = [{ name: searchRegex }, { email: searchRegex }, { phone: searchRegex }];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter)
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || (total === 0 ? 0 : 1)
      }
    };
  },

  getUserById: async (userId) => {
    const user = await User.findById(userId).select('-password');
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }
    return user;
  },

  updateUserStatus: async (adminId, userId, isActive) => {
    const user = await User.findById(userId);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    // Safety guard: cannot deactivate the last active ADMIN
    if (user.role === 'ADMIN' && isActive === false) {
      const activeAdminsCount = await User.countDocuments({ role: 'ADMIN', isActive: true });
      if (activeAdminsCount <= 1) {
        const error = new Error('At least one active administrator is required.');
        error.statusCode = 400;
        throw error;
      }
    }

    user.isActive = isActive;
    await user.save();

    await adminService.logActivity({
      userId: adminId,
      action: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      entityType: 'USER',
      entityId: user._id,
      metadata: { email: user.email, name: user.name, role: user.role }
    });

    return user;
  },

  updateUserRole: async (adminId, userId, newRole) => {
    const user = await User.findById(userId);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    const roleUpper = newRole.toUpperCase();
    if (!['CUSTOMER', 'STORE_OWNER', 'ADMIN'].includes(roleUpper)) {
      const error = new Error('Invalid user role');
      error.statusCode = 400;
      throw error;
    }

    // Safety guard: cannot demote the last active ADMIN
    if (user.role === 'ADMIN' && roleUpper !== 'ADMIN' && user.isActive) {
      const activeAdminsCount = await User.countDocuments({ role: 'ADMIN', isActive: true });
      if (activeAdminsCount <= 1) {
        const error = new Error('At least one active administrator is required.');
        error.statusCode = 400;
        throw error;
      }
    }

    const oldRole = user.role;
    user.role = roleUpper;
    await user.save();

    await adminService.logActivity({
      userId: adminId,
      action: 'USER_ROLE_CHANGED',
      entityType: 'USER',
      entityId: user._id,
      metadata: { email: user.email, oldRole, newRole: roleUpper }
    });

    return user;
  },

  /**
   * 3. Stores Management
   */
  getStores: async (queryParams = {}) => {
    const page = Math.max(1, parseInt(queryParams.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(queryParams.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = {};

    if (queryParams.status) {
      if (queryParams.status.toUpperCase() === 'ACTIVE') filter.isActive = true;
      if (queryParams.status.toUpperCase() === 'INACTIVE') filter.isActive = false;
    }

    if (queryParams.search && queryParams.search.trim()) {
      const searchRegex = new RegExp(queryParams.search.trim(), 'i');
      filter.$or = [{ name: searchRegex }, { address: searchRegex }, { businessType: searchRegex }];
    }

    const [stores, total] = await Promise.all([
      Store.find(filter)
        .populate('ownerId', 'name email phone isActive')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Store.countDocuments(filter)
    ]);

    // Attach product and active flash sales counts
    const storesWithCounts = await Promise.all(
      stores.map(async (st) => {
        const [productCount, flashSalesCount] = await Promise.all([
          Product.countDocuments({ storeId: st._id }),
          FlashSale.countDocuments({ storeId: st._id, status: 'ACTIVE', endsAt: { $gt: new Date() } })
        ]);
        return {
          ...st,
          productCount,
          flashSalesCount
        };
      })
    );

    return {
      stores: storesWithCounts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || (total === 0 ? 0 : 1)
      }
    };
  },

  getStoreById: async (storeId) => {
    const store = await Store.findById(storeId).populate('ownerId', 'name email phone isActive');
    if (!store) {
      const error = new Error('Store not found');
      error.statusCode = 404;
      throw error;
    }

    const [productCount, flashSalesCount, batchCount] = await Promise.all([
      Product.countDocuments({ storeId: store._id }),
      FlashSale.countDocuments({ storeId: store._id }),
      InventoryBatch.countDocuments({ storeId: store._id })
    ]);

    return {
      ...store.toObject(),
      productCount,
      flashSalesCount,
      batchCount
    };
  },

  updateStoreStatus: async (adminId, storeId, isActive) => {
    const store = await Store.findById(storeId);
    if (!store) {
      const error = new Error('Store not found');
      error.statusCode = 404;
      throw error;
    }

    store.isActive = isActive;
    await store.save();

    await adminService.logActivity({
      userId: adminId,
      action: isActive ? 'STORE_ACTIVATED' : 'STORE_DEACTIVATED',
      entityType: 'STORE',
      entityId: store._id,
      metadata: { storeName: store.name, businessType: store.businessType }
    });

    return store;
  },

  /**
   * 4. Products Overview
   */
  getProducts: async (queryParams = {}) => {
    const page = Math.max(1, parseInt(queryParams.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(queryParams.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = {};

    if (queryParams.category && queryParams.category.toUpperCase() !== 'ALL') {
      filter.category = queryParams.category.toUpperCase();
    }

    if (queryParams.storeId) {
      filter.storeId = queryParams.storeId;
    }

    if (queryParams.search && queryParams.search.trim()) {
      const searchRegex = new RegExp(queryParams.search.trim(), 'i');
      filter.$or = [{ name: searchRegex }, { brand: searchRegex }];
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('storeId', 'name businessType address isActive')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter)
    ]);

    // Attach batch count for each product
    const productsWithBatches = await Promise.all(
      products.map(async (p) => {
        const batchCount = await InventoryBatch.countDocuments({ productId: p._id });
        return { ...p, batchCount };
      })
    );

    return {
      products: productsWithBatches,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || (total === 0 ? 0 : 1)
      }
    };
  },

  /**
   * 5. Inventory Overview
   */
  getInventory: async (queryParams = {}) => {
    const page = Math.max(1, parseInt(queryParams.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(queryParams.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = {};

    if (queryParams.status && queryParams.status.toUpperCase() !== 'ALL') {
      filter.status = queryParams.status.toUpperCase();
    }

    if (queryParams.storeId) {
      filter.storeId = queryParams.storeId;
    }

    if (queryParams.search && queryParams.search.trim()) {
      const searchRegex = new RegExp(queryParams.search.trim(), 'i');
      filter.batchNumber = searchRegex;
    }

    const [batches, total] = await Promise.all([
      InventoryBatch.find(filter)
        .populate('productId', 'name category brand unit image')
        .populate('storeId', 'name businessType address isActive')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      InventoryBatch.countDocuments(filter)
    ]);

    return {
      batches,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || (total === 0 ? 0 : 1)
      }
    };
  },

  /**
   * 6. Flash Sales Monitoring
   */
  getFlashSales: async (queryParams = {}) => {
    const page = Math.max(1, parseInt(queryParams.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(queryParams.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = {};

    if (queryParams.status && queryParams.status.toUpperCase() !== 'ALL') {
      filter.status = queryParams.status.toUpperCase();
    }

    if (queryParams.storeId) {
      filter.storeId = queryParams.storeId;
    }

    if (queryParams.search && queryParams.search.trim()) {
      const searchRegex = new RegExp(queryParams.search.trim(), 'i');
      filter.title = searchRegex;
    }

    const [flashSales, total] = await Promise.all([
      FlashSale.find(filter)
        .populate('productId', 'name category brand unit image')
        .populate('storeId', 'name businessType address isActive')
        .populate('inventoryBatchId', 'batchNumber expiryDate quantity')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      FlashSale.countDocuments(filter)
    ]);

    return {
      flashSales,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || (total === 0 ? 0 : 1)
      }
    };
  },

  updateFlashSaleStatus: async (adminId, saleId, action) => {
    const flashSale = await FlashSale.findById(saleId).populate('productId');
    if (!flashSale) {
      const error = new Error('Flash sale deal not found');
      error.statusCode = 404;
      throw error;
    }

    const targetAction = action.toUpperCase();
    if (!['PAUSE', 'CANCEL', 'RESUME'].includes(targetAction)) {
      const error = new Error('Invalid action. Allowed: PAUSE, CANCEL, RESUME');
      error.statusCode = 400;
      throw error;
    }

    let logAction = 'FLASH_SALE_PAUSED';
    if (targetAction === 'PAUSE') {
      flashSale.status = 'PAUSED';
      logAction = 'FLASH_SALE_PAUSED';
    } else if (targetAction === 'CANCEL') {
      flashSale.status = 'CANCELLED';
      logAction = 'FLASH_SALE_CANCELLED';
    } else if (targetAction === 'RESUME') {
      if (new Date() >= new Date(flashSale.endsAt)) {
        const error = new Error('Cannot resume an expired flash sale.');
        error.statusCode = 400;
        throw error;
      }
      flashSale.status = 'ACTIVE';
      logAction = 'FLASH_SALE_RESUMED';
    }

    await flashSale.save();

    await adminService.logActivity({
      userId: adminId,
      action: logAction,
      entityType: 'FLASH_SALE',
      entityId: flashSale._id,
      metadata: { title: flashSale.title, status: flashSale.status }
    });

    return flashSale;
  },

  /**
   * 7. Orders Monitoring
   */
  getOrders: async (queryParams = {}) => {
    const page = Math.max(1, parseInt(queryParams.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(queryParams.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = {};

    if (queryParams.status && queryParams.status.toUpperCase() !== 'ALL') {
      filter.status = queryParams.status.toUpperCase();
    }

    if (queryParams.storeId) {
      filter.storeId = queryParams.storeId;
    }

    if (queryParams.search && queryParams.search.trim()) {
      const searchRegex = new RegExp(queryParams.search.trim(), 'i');
      filter.$or = [
        { orderNumber: searchRegex },
        { productName: searchRegex },
        { storeName: searchRegex }
      ];
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('customerId', 'name email phone')
        .populate('storeId', 'name businessType address')
        .populate('productId', 'name category brand unit image')
        .populate('inventoryBatchId', 'batchNumber expiryDate')
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

  getOrderById: async (orderId) => {
    const isObjectId = mongoose.Types.ObjectId.isValid(orderId);
    const query = isObjectId
      ? { $or: [{ _id: orderId }, { orderNumber: orderId }] }
      : { orderNumber: orderId };

    const order = await Order.findOne(query)
      .populate('customerId', 'name email phone')
      .populate('storeId', 'name businessType address phone')
      .populate('productId', 'name category brand unit image description')
      .populate('inventoryBatchId', 'batchNumber expiryDate')
      .populate('flashSaleId', 'title discountPercentage salePrice originalPrice endsAt');

    if (!order) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      throw error;
    }

    return order;
  },

  /**
   * 8. Expiry & Food Waste Dashboard Metrics
   */
  getExpiryWasteMetrics: async () => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const endOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59, 999);

    const [
      expiringTodayCount,
      expiringTomorrowCount,
      expiredBatchesCount,
      discountedBatchesCount,
      activeFlashSalesCount,
      completedOrders
    ] = await Promise.all([
      InventoryBatch.countDocuments({
        expiryDate: { $gte: startOfToday, $lte: endOfToday },
        status: { $ne: 'EXPIRED' }
      }),
      InventoryBatch.countDocuments({
        expiryDate: { $gte: startOfTomorrow, $lte: endOfTomorrow },
        status: { $ne: 'EXPIRED' }
      }),
      InventoryBatch.countDocuments({
        $or: [{ status: 'EXPIRED' }, { expiryDate: { $lt: now } }]
      }),
      InventoryBatch.countDocuments({
        discountPercentage: { $gt: 0 }
      }),
      FlashSale.countDocuments({
        status: 'ACTIVE',
        endsAt: { $gt: now }
      }),
      Order.find({
        status: { $in: ['CONFIRMED', 'COMPLETED'] }
      }).select('quantity unitPrice totalPrice')
    ]);

    // Calculate real recovered inventory value and units
    let totalRecoveredSalesValue = 0;
    let totalDiscountedUnitsRescued = 0;

    for (const ord of completedOrders) {
      totalRecoveredSalesValue += ord.totalPrice || 0;
      totalDiscountedUnitsRescued += ord.quantity || 0;
    }

    return {
      expiringToday: expiringTodayCount,
      expiringTomorrow: expiringTomorrowCount,
      expiredBatches: expiredBatchesCount,
      discountedBatches: discountedBatchesCount,
      activeFlashSales: activeFlashSalesCount,
      rescuedUnits: totalDiscountedUnitsRescued,
      recoveredSalesValue: parseFloat(totalRecoveredSalesValue.toFixed(2)),
      completedOrdersCount: completedOrders.length
    };
  },

  /**
   * 9. Platform Analytics (7d, 30d, 90d)
   */
  getAnalytics: async (timeRange = '30d') => {
    let days = 30;
    if (timeRange === '7d') days = 7;
    if (timeRange === '90d') days = 90;

    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [flashSalesAgg, ordersAgg, expiredBatchesAgg] = await Promise.all([
      // Flash sales created over time
      FlashSale.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      // Reservations over time
      Order.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
            revenue: { $sum: '$totalPrice' }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      // Expired batches over time
      InventoryBatch.aggregate([
        { $match: { expiryDate: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$expiryDate' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    return {
      timeRange: `${days}d`,
      startDate,
      flashSales: flashSalesAgg.map((item) => ({ date: item._id, count: item.count })),
      reservations: ordersAgg.map((item) => ({ date: item._id, count: item.count, revenue: item.revenue })),
      expiredBatches: expiredBatchesAgg.map((item) => ({ date: item._id, count: item.count }))
    };
  },

  /**
   * 10. System Health & Background Jobs
   */
  getSystemHealth: async () => {
    const isMongoConnected = mongoose.connection.readyState === 1;

    const [jobRecords, totalUsers, totalOrders] = await Promise.all([
      JobExecution.find().sort({ jobName: 1 }).lean(),
      User.countDocuments(),
      Order.countDocuments()
    ]);

    return {
      server: {
        status: isMongoConnected ? 'HEALTHY' : 'ERROR',
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date(),
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development'
      },
      database: {
        status: isMongoConnected ? 'CONNECTED' : 'DISCONNECTED',
        name: mongoose.connection.name || 'smartshelf',
        collectionsCount: Object.keys(mongoose.connection.collections).length
      },
      jobs: {
        expiryJob: jobRecords.find((j) => j.jobName === 'EXPIRY_MONITORING') || {
          jobName: 'EXPIRY_MONITORING',
          lastStatus: 'HEALTHY',
          lastRun: new Date()
        },
        reservationJob: jobRecords.find((j) => j.jobName === 'RESERVATION_CLEANUP') || {
          jobName: 'RESERVATION_CLEANUP',
          lastStatus: 'HEALTHY',
          lastRun: new Date()
        }
      },
      summary: {
        totalUsers,
        totalOrders
      }
    };
  },

  /**
   * 11. Activity Logs
   */
  getActivityLogs: async (queryParams = {}) => {
    const page = Math.max(1, parseInt(queryParams.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(queryParams.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = {};

    if (queryParams.action && queryParams.action.toUpperCase() !== 'ALL') {
      filter.action = queryParams.action.toUpperCase();
    }

    if (queryParams.entityType && queryParams.entityType.toUpperCase() !== 'ALL') {
      filter.entityType = queryParams.entityType.toUpperCase();
    }

    const [logs, total] = await Promise.all([
      ActivityLog.find(filter)
        .populate('userId', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      ActivityLog.countDocuments(filter)
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || (total === 0 ? 0 : 1)
      }
    };
  }
};

module.exports = adminService;
