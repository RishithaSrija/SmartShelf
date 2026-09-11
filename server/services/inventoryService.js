const InventoryBatch = require('../models/InventoryBatch');
const Product = require('../models/Product');
const Store = require('../models/Store');
const Order = require('../models/Order');

// Helper to retrieve store owner's store
const getOwnerStore = async (ownerId) => {
  const store = await Store.findOne({ ownerId });
  if (!store) {
    const error = new Error('No store registered for this store owner');
    error.statusCode = 400;
    throw error;
  }
  return store;
};

const inventoryService = {
  // Create a new inventory batch
  createBatch: async (ownerId, batchData) => {
    const store = await getOwnerStore(ownerId);

    const { productId, batchNumber, quantity, originalPrice, manufactureDate, expiryDate } = batchData;

    if (!productId) {
      const error = new Error('Product ID is required');
      error.statusCode = 400;
      throw error;
    }

    // Verify product belongs to owner's store
    const product = await Product.findOne({ _id: productId, storeId: store._id });
    if (!product) {
      const error = new Error('Selected product does not belong to your store');
      error.statusCode = 400;
      throw error;
    }

    if (!batchNumber || !batchNumber.trim()) {
      const error = new Error('Batch number is required');
      error.statusCode = 400;
      throw error;
    }

    const cleanBatchNumber = batchNumber.trim().toUpperCase();

    // Check duplicate batch number within (storeId, productId, batchNumber)
    const existingBatch = await InventoryBatch.findOne({
      storeId: store._id,
      productId: product._id,
      batchNumber: cleanBatchNumber
    });

    if (existingBatch) {
      const error = new Error('This batch number already exists for this product');
      error.statusCode = 409;
      throw error;
    }

    const numQuantity = Number(quantity);
    if (isNaN(numQuantity) || numQuantity < 0) {
      const error = new Error('Quantity must be a non-negative number');
      error.statusCode = 400;
      throw error;
    }

    const numPrice = Number(originalPrice);
    if (isNaN(numPrice) || numPrice <= 0) {
      const error = new Error('Original price must be greater than 0');
      error.statusCode = 400;
      throw error;
    }

    const mDate = new Date(manufactureDate);
    const eDate = new Date(expiryDate);

    if (isNaN(mDate.getTime())) {
      const error = new Error('Invalid manufacture date');
      error.statusCode = 400;
      throw error;
    }

    if (isNaN(eDate.getTime())) {
      const error = new Error('Invalid expiry date');
      error.statusCode = 400;
      throw error;
    }

    if (eDate <= mDate) {
      const error = new Error('Expiry date must be later than manufacture date.');
      error.statusCode = 400;
      throw error;
    }

    // Expiry date must not be earlier than today (start of day)
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    if (eDate < startOfToday) {
      const error = new Error('Expiry date cannot be in the past.');
      error.statusCode = 400;
      throw error;
    }

    // Import pricingService dynamically to avoid circular references
    const pricingService = require('./pricingService');
    await pricingService.initDefaultRules(store._id);
    const rules = await pricingService.getRules(ownerId);

    const initialBatch = {
      originalPrice: numPrice,
      expiryDate: eDate,
      quantity: numQuantity
    };

    const calc = pricingService.calculateDynamicPrice(initialBatch, rules.filter(r => r.isActive));

    const batch = await InventoryBatch.create({
      productId: product._id,
      storeId: store._id,
      batchNumber: cleanBatchNumber,
      quantity: numQuantity,
      originalPrice: numPrice,
      currentPrice: calc.currentPrice,
      discountPercentage: calc.discountPercentage,
      manufactureDate: mDate,
      expiryDate: eDate,
      status: calc.status
    });

    return await batch.populate('productId', 'name category brand unit image');
  },

  // Get batches for store owner
  getBatches: async (ownerId, queryParams = {}) => {
    const store = await getOwnerStore(ownerId);

    const page = Math.max(1, parseInt(queryParams.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(queryParams.limit) || 10));
    const skip = (page - 1) * limit;

    const filter = { storeId: store._id };

    // Filter by specific Product ID
    if (queryParams.productId) {
      filter.productId = queryParams.productId;
    }

    // Filter by Status
    if (queryParams.status && queryParams.status.toUpperCase() !== 'ALL') {
      filter.status = queryParams.status.toUpperCase();
    }

    // Filter by Expiry Window
    if (queryParams.expiry) {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      if (queryParams.expiry === 'today') {
        filter.expiryDate = { $gte: startOfToday, $lte: endOfToday };
      } else if (queryParams.expiry === 'tomorrow') {
        const startOfTomorrow = new Date(startOfToday.getTime() + 86400000);
        const endOfTomorrow = new Date(endOfToday.getTime() + 86400000);
        filter.expiryDate = { $gte: startOfTomorrow, $lte: endOfTomorrow };
      } else if (queryParams.expiry === '3days') {
        const in3Days = new Date(now.getTime() + 3 * 86400000);
        filter.expiryDate = { $gte: now, $lte: in3Days };
      } else if (queryParams.expiry === '7days') {
        const in7Days = new Date(now.getTime() + 7 * 86400000);
        filter.expiryDate = { $gte: now, $lte: in7Days };
      } else if (queryParams.expiry === 'expired') {
        filter.expiryDate = { $lt: now };
      }
    }

    // Search filter (matches Product name/brand OR batchNumber)
    if (queryParams.search && queryParams.search.trim()) {
      const searchRegex = new RegExp(queryParams.search.trim(), 'i');

      // Find matching products
      const matchingProducts = await Product.find({
        storeId: store._id,
        $or: [{ name: searchRegex }, { brand: searchRegex }]
      }).select('_id');

      const productIds = matchingProducts.map((p) => p._id);

      filter.$or = [
        { batchNumber: searchRegex },
        { productId: { $in: productIds } }
      ];
    }

    // Sorting (Default: earliest expiring batches first)
    let sortOptions = { expiryDate: 1 };
    if (queryParams.sort) {
      if (queryParams.sort === '-expiryDate') sortOptions = { expiryDate: -1 };
      else if (queryParams.sort === 'quantity') sortOptions = { quantity: 1 };
      else if (queryParams.sort === '-quantity') sortOptions = { quantity: -1 };
      else if (queryParams.sort === 'createdAt') sortOptions = { createdAt: -1 };
    }

    const [batches, total] = await Promise.all([
      InventoryBatch.find(filter)
        .populate('productId', 'name category brand unit image')
        .sort(sortOptions)
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
        totalPages: Math.ceil(total / limit) || 1
      }
    };
  },

  // Get single batch by ID
  getBatchById: async (ownerId, batchId) => {
    const store = await getOwnerStore(ownerId);

    const batch = await InventoryBatch.findById(batchId).populate(
      'productId',
      'name category brand unit image description'
    );

    if (!batch || batch.storeId.toString() !== store._id.toString()) {
      const error = new Error('Inventory batch not found');
      error.statusCode = 404;
      throw error;
    }

    return batch;
  },

  // Update batch details (batchNumber, quantity, originalPrice, dates)
  updateBatch: async (ownerId, batchId, updateData) => {
    const store = await getOwnerStore(ownerId);

    const batch = await InventoryBatch.findById(batchId);
    if (!batch || batch.storeId.toString() !== store._id.toString()) {
      const error = new Error('Inventory batch not found');
      error.statusCode = 404;
      throw error;
    }

    const { batchNumber, quantity, originalPrice, manufactureDate, expiryDate } = updateData;

    // Check duplicate batch number if changed
    if (batchNumber && batchNumber.trim()) {
      const cleanBatchNumber = batchNumber.trim().toUpperCase();
      if (cleanBatchNumber !== batch.batchNumber) {
        const duplicate = await InventoryBatch.findOne({
          storeId: store._id,
          productId: batch.productId,
          batchNumber: cleanBatchNumber,
          _id: { $ne: batchId }
        });
        if (duplicate) {
          const error = new Error('This batch number already exists for this product');
          error.statusCode = 409;
          throw error;
        }
        batch.batchNumber = cleanBatchNumber;
      }
    }

    if (quantity !== undefined) {
      const numQuantity = Number(quantity);
      if (isNaN(numQuantity) || numQuantity < 0) {
        const error = new Error('Quantity cannot be negative');
        error.statusCode = 400;
        throw error;
      }
      batch.quantity = numQuantity;

      // Update status
      if (numQuantity === 0) {
        batch.status = 'SOLD_OUT';
      } else if (numQuantity <= 5 && batch.status !== 'EXPIRED') {
        batch.status = 'LOW_STOCK';
      } else if (numQuantity > 5 && batch.status !== 'EXPIRED') {
        batch.status = 'AVAILABLE';
      }
    }

    if (originalPrice !== undefined) {
      const numPrice = Number(originalPrice);
      if (isNaN(numPrice) || numPrice <= 0) {
        const error = new Error('Original price must be greater than 0');
        error.statusCode = 400;
        throw error;
      }
      batch.originalPrice = numPrice;
      batch.currentPrice = numPrice;
    }

    const mDate = manufactureDate ? new Date(manufactureDate) : batch.manufactureDate;
    const eDate = expiryDate ? new Date(expiryDate) : batch.expiryDate;

    if (eDate <= mDate) {
      const error = new Error('Expiry date must be later than manufacture date.');
      error.statusCode = 400;
      throw error;
    }

    batch.manufactureDate = mDate;
    batch.expiryDate = eDate;

    await batch.save();
    return await batch.populate('productId', 'name category brand unit image');
  },

  // Update stock quantity
  updateQuantity: async (ownerId, batchId, quantity) => {
    const store = await getOwnerStore(ownerId);

    const batch = await InventoryBatch.findById(batchId);
    if (!batch || batch.storeId.toString() !== store._id.toString()) {
      const error = new Error('Inventory batch not found');
      error.statusCode = 404;
      throw error;
    }

    const numQuantity = Number(quantity);
    if (isNaN(numQuantity) || numQuantity < 0) {
      const error = new Error('Quantity cannot be negative');
      error.statusCode = 400;
      throw error;
    }

    batch.quantity = numQuantity;

    if (numQuantity === 0) {
      batch.status = 'SOLD_OUT';
    } else if (numQuantity <= 5 && batch.status !== 'EXPIRED') {
      batch.status = 'LOW_STOCK';
    } else if (numQuantity > 5 && batch.status !== 'EXPIRED') {
      batch.status = 'AVAILABLE';
    }

    await batch.save();
    return await batch.populate('productId', 'name category brand unit image');
  },

  // Update status (with validation rules)
  updateStatus: async (ownerId, batchId, status) => {
    const store = await getOwnerStore(ownerId);

    const batch = await InventoryBatch.findById(batchId);
    if (!batch || batch.storeId.toString() !== store._id.toString()) {
      const error = new Error('Inventory batch not found');
      error.statusCode = 404;
      throw error;
    }

    const upperStatus = status.toUpperCase();

    if (upperStatus === 'EXPIRED') {
      const now = new Date();
      if (batch.expiryDate > now) {
        const error = new Error('Cannot mark a batch as EXPIRED before its expiry date');
        error.statusCode = 400;
        throw error;
      }
    }

    if (upperStatus === 'FLASH_SALE') {
      const error = new Error('FLASH_SALE status is managed automatically by the pricing engine');
      error.statusCode = 400;
      throw error;
    }

    batch.status = upperStatus;
    await batch.save();
    return await batch.populate('productId', 'name category brand unit image');
  },

  // Delete batch (Checks order history)
  deleteBatch: async (ownerId, batchId) => {
    const store = await getOwnerStore(ownerId);

    const batch = await InventoryBatch.findById(batchId);
    if (!batch || batch.storeId.toString() !== store._id.toString()) {
      const error = new Error('Inventory batch not found');
      error.statusCode = 404;
      throw error;
    }

    // Check order history
    const orderCount = await Order.countDocuments({
      $or: [{ batchId }, { 'items.batchId': batchId }]
    });
    if (orderCount > 0) {
      const error = new Error(
        'Cannot delete a batch with transaction history. Update its quantity or mark it unavailable instead.'
      );
      error.statusCode = 400;
      throw error;
    }

    await InventoryBatch.findByIdAndDelete(batchId);
    return { success: true, message: 'Batch deleted successfully' };
  },

  // Get Inventory Summary Statistics (Real MongoDB aggregation)
  getInventorySummary: async (ownerId) => {
    const store = await getOwnerStore(ownerId);

    const now = new Date();
    const in3Days = new Date(now.getTime() + 3 * 86400000);

    const [stats] = await InventoryBatch.aggregate([
      { $match: { storeId: store._id } },
      {
        $group: {
          _id: null,
          totalBatches: { $sum: 1 },
          totalUnits: { $sum: '$quantity' },
          inventoryValue: { $sum: { $multiply: ['$quantity', '$originalPrice'] } },
          lowStockBatches: {
            $sum: {
              $cond: [
                { $and: [{ $gt: ['$quantity', 0] }, { $lte: ['$quantity', 5] }] },
                1,
                0
              ]
            }
          },
          expiringSoonBatches: {
            $sum: {
              $cond: [
                { $and: [{ $gt: ['$quantity', 0] }, { $gt: ['$expiryDate', now] }, { $lte: ['$expiryDate', in3Days] }] },
                1,
                0
              ]
            }
          },
          expiredBatches: {
            $sum: {
              $cond: [
                { $and: [{ $gt: ['$quantity', 0] }, { $lt: ['$expiryDate', now] }] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    return (
      stats || {
        totalBatches: 0,
        totalUnits: 0,
        inventoryValue: 0,
        lowStockBatches: 0,
        expiringSoonBatches: 0,
        expiredBatches: 0
      }
    );
  }
};

module.exports = inventoryService;
