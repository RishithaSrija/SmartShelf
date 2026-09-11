const mongoose = require('mongoose');
const FlashSale = require('../models/FlashSale');
const InventoryBatch = require('../models/InventoryBatch');
const Product = require('../models/Product');
const Store = require('../models/Store');
const pricingService = require('./pricingService');
const geolocationService = require('./geolocationService');

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

const flashSaleService = {
  // Validate if an inventory batch is eligible to become a Flash Sale
  validateFlashSaleEligibility: (batch) => {
    if (!batch) return false;
    if (batch.quantity <= 0) return false;
    if (batch.originalPrice <= 0) return false;
    if (batch.currentPrice >= batch.originalPrice) return false;
    if (batch.discountPercentage <= 0) return false;
    if (batch.status === 'EXPIRED' || batch.status === 'SOLD_OUT') return false;

    const daysRemaining = pricingService.calculateDaysRemaining(batch.expiryDate);
    if (daysRemaining < 0 || daysRemaining > 3) return false;

    return true;
  },

  // Get eligible inventory batches for store owner
  getEligibleBatches: async (ownerId) => {
    const store = await getOwnerStore(ownerId);

    const activeRules = await pricingService.getRules(ownerId);

    const batches = await InventoryBatch.find({
      storeId: store._id,
      quantity: { $gt: 0 },
      status: { $nin: ['EXPIRED', 'SOLD_OUT'] }
    }).populate('productId', 'name category brand unit image description');

    const eligibleBatches = [];

    for (const batch of batches) {
      // Recalculate price dynamically using current store rules
      const calc = pricingService.calculateDynamicPrice(batch, activeRules.filter((r) => r.isActive));
      batch.currentPrice = calc.currentPrice;
      batch.discountPercentage = calc.discountPercentage;

      if (flashSaleService.validateFlashSaleEligibility(batch)) {
        // Check if active sale already exists for this batch
        const activeSale = await FlashSale.findOne({
          inventoryBatchId: batch._id,
          status: 'ACTIVE'
        });

        if (!activeSale) {
          eligibleBatches.push({
            ...batch.toObject(),
            daysRemaining: calc.daysRemaining
          });
        }
      }
    }

    return eligibleBatches;
  },

  // Create a new Flash Sale
  createFlashSale: async (ownerId, saleData) => {
    const store = await getOwnerStore(ownerId);

    const { inventoryBatchId, title, description, startsAt, endsAt } = saleData;

    if (!inventoryBatchId) {
      const error = new Error('Inventory batch ID is required');
      error.statusCode = 400;
      throw error;
    }

    const batch = await InventoryBatch.findById(inventoryBatchId).populate('productId');
    if (!batch || batch.storeId.toString() !== store._id.toString()) {
      const error = new Error('Inventory batch not found');
      error.statusCode = 404;
      throw error;
    }

    // Evaluate eligibility using active rules
    const activeRules = await pricingService.getRules(ownerId);
    const calc = pricingService.calculateDynamicPrice(batch, activeRules.filter((r) => r.isActive));
    batch.currentPrice = calc.currentPrice;
    batch.discountPercentage = calc.discountPercentage;

    if (!flashSaleService.validateFlashSaleEligibility(batch)) {
      const error = new Error(
        'Selected batch is not eligible for Flash Sale (Must have discount > 0%, stock > 0, and expire in 3 days or less).'
      );
      error.statusCode = 400;
      throw error;
    }

    // Check duplicate active flash sale
    const duplicate = await FlashSale.findOne({
      inventoryBatchId: batch._id,
      status: 'ACTIVE'
    });
    if (duplicate) {
      const error = new Error('An active flash sale already exists for this batch.');
      error.statusCode = 409;
      throw error;
    }

    // Validate end time
    let endsAtDate = endsAt ? new Date(endsAt) : new Date(batch.expiryDate);
    if (isNaN(endsAtDate.getTime())) {
      endsAtDate = new Date(batch.expiryDate);
    }

    if (endsAtDate > new Date(batch.expiryDate)) {
      const error = new Error('Flash sale end time cannot be later than batch expiry date.');
      error.statusCode = 400;
      throw error;
    }

    const flashSale = await FlashSale.create({
      inventoryBatchId: batch._id,
      productId: batch.productId._id,
      storeId: store._id,
      title: title && title.trim() ? title.trim() : `${batch.productId.name} — ${batch.discountPercentage}% OFF`,
      description: description ? description.trim() : '',
      originalPrice: batch.originalPrice,
      salePrice: batch.currentPrice,
      discountPercentage: batch.discountPercentage,
      availableQuantity: batch.quantity,
      startsAt: startsAt ? new Date(startsAt) : new Date(),
      endsAt: endsAtDate,
      status: 'ACTIVE'
    });

    return await flashSale.populate([
      { path: 'productId', select: 'name category brand unit image description' },
      { path: 'storeId', select: 'name businessType address phone location' },
      { path: 'inventoryBatchId', select: 'batchNumber expiryDate' }
    ]);
  },

  // Synchronize Flash Sale price/quantity/status with Inventory Batch
  syncFlashSaleWithBatch: async (batchId) => {
    const flashSale = await FlashSale.findOne({
      inventoryBatchId: batchId,
      status: { $in: ['ACTIVE', 'PAUSED'] }
    });

    if (!flashSale) return null;

    const batch = await InventoryBatch.findById(batchId);
    if (!batch) {
      flashSale.status = 'EXPIRED';
      await flashSale.save();
      return flashSale;
    }

    flashSale.salePrice = batch.currentPrice;
    flashSale.discountPercentage = batch.discountPercentage;
    flashSale.availableQuantity = batch.quantity;

    if (batch.quantity === 0) {
      flashSale.status = 'SOLD_OUT';
    } else if (batch.status === 'EXPIRED' || new Date() >= flashSale.endsAt) {
      flashSale.status = 'EXPIRED';
    }

    await flashSale.save();
    return flashSale;
  },

  // Get Store Owner Flash Sales
  getStoreFlashSales: async (ownerId, queryParams = {}) => {
    const store = await getOwnerStore(ownerId);

    const page = Math.max(1, parseInt(queryParams.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(queryParams.limit) || 10));
    const skip = (page - 1) * limit;

    const filter = { storeId: store._id };

    if (queryParams.status && queryParams.status.toUpperCase() !== 'ALL') {
      filter.status = queryParams.status.toUpperCase();
    }

    const [flashSales, total] = await Promise.all([
      FlashSale.find(filter)
        .populate('productId', 'name category brand unit image')
        .populate('inventoryBatchId', 'batchNumber expiryDate')
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
        totalPages: Math.ceil(total / limit) || 1
      }
    };
  },

  // Update Flash Sale details (title, description, times)
  updateFlashSale: async (ownerId, saleId, updateData) => {
    const store = await getOwnerStore(ownerId);

    const flashSale = await FlashSale.findById(saleId);
    if (!flashSale || flashSale.storeId.toString() !== store._id.toString()) {
      const error = new Error('Flash sale not found');
      error.statusCode = 404;
      throw error;
    }

    if (updateData.title && updateData.title.trim()) {
      flashSale.title = updateData.title.trim();
    }

    if (updateData.description !== undefined) {
      flashSale.description = updateData.description.trim();
    }

    if (updateData.endsAt) {
      const newEndsAt = new Date(updateData.endsAt);
      const batch = await InventoryBatch.findById(flashSale.inventoryBatchId);
      if (batch && newEndsAt > new Date(batch.expiryDate)) {
        const error = new Error('Flash sale end time cannot be later than batch expiry date.');
        error.statusCode = 400;
        throw error;
      }
      flashSale.endsAt = newEndsAt;
    }

    await flashSale.save();
    return await flashSale.populate([
      { path: 'productId', select: 'name category brand unit image description' },
      { path: 'storeId', select: 'name businessType address phone location' },
      { path: 'inventoryBatchId', select: 'batchNumber expiryDate' }
    ]);
  },

  // Toggle Flash Sale status (PAUSED / ACTIVE / CANCELLED)
  updateFlashSaleStatus: async (ownerId, saleId, status) => {
    const store = await getOwnerStore(ownerId);

    const flashSale = await FlashSale.findById(saleId);
    if (!flashSale || flashSale.storeId.toString() !== store._id.toString()) {
      const error = new Error('Flash sale not found');
      error.statusCode = 404;
      throw error;
    }

    const upperStatus = status.toUpperCase();
    if (!['ACTIVE', 'PAUSED', 'CANCELLED'].includes(upperStatus)) {
      const error = new Error('Invalid status transition');
      error.statusCode = 400;
      throw error;
    }

    flashSale.status = upperStatus;
    await flashSale.save();
    return flashSale;
  },

  // Delete Flash Sale
  deleteFlashSale: async (ownerId, saleId) => {
    const store = await getOwnerStore(ownerId);

    const flashSale = await FlashSale.findById(saleId);
    if (!flashSale || flashSale.storeId.toString() !== store._id.toString()) {
      const error = new Error('Flash sale not found');
      error.statusCode = 404;
      throw error;
    }

    await FlashSale.findByIdAndDelete(saleId);
    return { success: true, message: 'Flash sale deleted successfully' };
  },

  // Public Marketplace Search & Discovery
  getPublicFlashSales: async (queryParams = {}) => {
    const page = Math.max(1, parseInt(queryParams.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(queryParams.limit) || 12));
    const skip = (page - 1) * limit;

    // Find active stores
    const activeStores = await Store.find({ isActive: true }).select('_id');
    const activeStoreIds = activeStores.map((s) => s._id);

    const filter = {
      status: 'ACTIVE',
      availableQuantity: { $gt: 0 },
      endsAt: { $gt: new Date() },
      storeId: { $in: activeStoreIds }
    };

    if (queryParams.storeId) {
      if (activeStoreIds.some((id) => id.toString() === queryParams.storeId.toString())) {
        filter.storeId = queryParams.storeId;
      } else {
        // Requested specific inactive store -> return empty
        filter.storeId = new mongoose.Types.ObjectId();
      }
    }

    // Category filter via Product query
    if (queryParams.category && queryParams.category.toUpperCase() !== 'ALL') {
      const matchingProducts = await Product.find({
        category: queryParams.category.toUpperCase()
      }).select('_id');
      const productIds = matchingProducts.map((p) => p._id);
      filter.productId = { $in: productIds };
    }

    // Search filter across title, description, or Product name/brand
    if (queryParams.search && queryParams.search.trim()) {
      const searchRegex = new RegExp(queryParams.search.trim(), 'i');

      const matchingProducts = await Product.find({
        $or: [{ name: searchRegex }, { brand: searchRegex }]
      }).select('_id');

      const matchingStores = await Store.find({
        name: searchRegex
      }).select('_id');

      const productIds = matchingProducts.map((p) => p._id);
      const storeIds = matchingStores.map((s) => s._id);

      filter.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { productId: { $in: productIds } },
        { storeId: { $in: storeIds } }
      ];
    }

    // Sort: Earliest ending deals first (Urgency sorting)
    let sortOptions = { endsAt: 1 };
    if (queryParams.sort === '-discount') sortOptions = { discountPercentage: -1 };
    else if (queryParams.sort === 'price') sortOptions = { salePrice: 1 };
    else if (queryParams.sort === '-createdAt') sortOptions = { createdAt: -1 };

    const [flashSales, total] = await Promise.all([
      FlashSale.find(filter)
        .populate('productId', 'name category brand unit image description')
        .populate('storeId', 'name businessType address phone openingHours location')
        .populate('inventoryBatchId', 'batchNumber expiryDate')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit),
      FlashSale.countDocuments(filter)
    ]);

    // Add whole calendar days remaining for each deal
    const formattedSales = flashSales.map((sale) => {
      const daysRemaining = sale.inventoryBatchId?.expiryDate
        ? pricingService.calculateDaysRemaining(sale.inventoryBatchId.expiryDate)
        : 0;
      return {
        ...sale.toObject(),
        daysRemaining
      };
    });

    return {
      flashSales: formattedSales,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1
      }
    };
  },

  // Public Single Flash Sale Details
  getPublicFlashSaleById: async (id) => {
    const flashSale = await FlashSale.findById(id)
      .populate('productId', 'name category brand unit image description')
      .populate('storeId', 'name businessType address phone openingHours location')
      .populate('inventoryBatchId', 'batchNumber expiryDate');

    if (!flashSale || flashSale.status !== 'ACTIVE' || flashSale.endsAt <= new Date()) {
      const error = new Error('Flash sale deal not found or has expired');
      error.statusCode = 404;
      throw error;
    }

    const daysRemaining = flashSale.inventoryBatchId?.expiryDate
      ? pricingService.calculateDaysRemaining(flashSale.inventoryBatchId.expiryDate)
      : 0;

    return {
      ...flashSale.toObject(),
      daysRemaining
    };
  },

  // Public Nearby Flash Sales Discovery via Geolocation Service
  getNearbyFlashSales: async (queryParams = {}) => {
    return await geolocationService.getNearbyFlashSales(queryParams);
  }
};

module.exports = flashSaleService;
