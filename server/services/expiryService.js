const InventoryBatch = require('../models/InventoryBatch');
const Store = require('../models/Store');
const PricingRule = require('../models/PricingRule');
const pricingService = require('./pricingService');
const notificationService = require('./notificationService');

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

const expiryService = {
  // Process expiry and dynamic pricing for a single batch
  processBatchExpiry: async (batch, activeRules, storeOwnerId = null) => {
    const calc = pricingService.calculateDynamicPrice(batch, activeRules);

    let priceOrStatusChanged = false;

    if (
      batch.currentPrice !== calc.currentPrice ||
      batch.discountPercentage !== calc.discountPercentage ||
      batch.status !== calc.status
    ) {
      batch.currentPrice = calc.currentPrice;
      batch.discountPercentage = calc.discountPercentage;
      batch.status = calc.status;
      await batch.save();
      priceOrStatusChanged = true;

      // Sync active Flash Sale pricing and availability if published
      const flashSaleService = require('./flashSaleService');
      await flashSaleService.syncFlashSaleWithBatch(batch._id);
    }

    // Trigger basic in-app expiry alert notifications for store owner
    if (storeOwnerId && batch.quantity > 0) {
      const productName = batch.productId?.name || 'Inventory Item';
      if (calc.daysRemaining === 1) {
        await notificationService.createExpiryNotification({
          userId: storeOwnerId,
          batchId: batch._id,
          productId: batch.productId?._id || batch.productId,
          storeId: batch.storeId,
          alertType: 'EXPIRING_TOMORROW',
          title: 'Inventory expires tomorrow',
          message: `${productName} — Batch ${batch.batchNumber} expires tomorrow.`
        });
      } else if (calc.daysRemaining === 0) {
        await notificationService.createExpiryNotification({
          userId: storeOwnerId,
          batchId: batch._id,
          productId: batch.productId?._id || batch.productId,
          storeId: batch.storeId,
          alertType: 'EXPIRING_TODAY',
          title: 'Inventory expires today!',
          message: `${productName} — Batch ${batch.batchNumber} expires today.`
        });
      }
    }

    return {
      priceOrStatusChanged,
      calc
    };
  },

  // Process expiry & dynamic pricing for a single store
  processExpiryForStore: async (storeId) => {
    const store = await Store.findById(storeId);
    if (!store) return null;

    await pricingService.initDefaultRules(store._id);
    const activeRules = await PricingRule.find({ storeId: store._id, isActive: true }).sort({
      daysRemainingMin: 1
    });

    const batches = await InventoryBatch.find({ storeId: store._id }).populate('productId');

    let batchesProcessed = 0;
    let pricesUpdated = 0;
    let expired = 0;
    let expiringSoon = 0;
    let lowStock = 0;
    let soldOut = 0;
    let errors = 0;

    for (const batch of batches) {
      batchesProcessed++;
      try {
        const { priceOrStatusChanged, calc } = await expiryService.processBatchExpiry(
          batch,
          activeRules,
          store.ownerId
        );

        if (priceOrStatusChanged) pricesUpdated++;

        if (calc.status === 'EXPIRED') expired++;
        else if (calc.status === 'SOLD_OUT') soldOut++;
        else if (calc.status === 'EXPIRING_SOON') expiringSoon++;
        else if (calc.status === 'LOW_STOCK') lowStock++;
      } catch (err) {
        console.error(`[ExpiryService] Batch ${batch._id} error:`, err.message);
        errors++;
      }
    }

    return {
      batchesProcessed,
      pricesUpdated,
      expired,
      expiringSoon,
      lowStock,
      soldOut,
      errors
    };
  },

  // Process expiry & dynamic pricing across ALL stores in SmartShelf
  processExpiryForAllStores: async () => {
    console.log('[SmartShelf] Expiry job started');

    const summary = {
      storesProcessed: 0,
      batchesProcessed: 0,
      pricesUpdated: 0,
      expired: 0,
      expiringSoon: 0,
      lowStock: 0,
      soldOut: 0,
      errors: 0
    };

    try {
      const stores = await Store.find().select('_id');
      for (const store of stores) {
        summary.storesProcessed++;
        try {
          const storeSummary = await expiryService.processExpiryForStore(store._id);
          if (storeSummary) {
            summary.batchesProcessed += storeSummary.batchesProcessed;
            summary.pricesUpdated += storeSummary.pricesUpdated;
            summary.expired += storeSummary.expired;
            summary.expiringSoon += storeSummary.expiringSoon;
            summary.lowStock += storeSummary.lowStock;
            summary.soldOut += storeSummary.soldOut;
            summary.errors += storeSummary.errors;
          }
        } catch (storeErr) {
          console.error(`[ExpiryService] Store ${store._id} error:`, storeErr.message);
          summary.errors++;
        }
      }
    } catch (err) {
      console.error('[ExpiryService] Global process error:', err.message);
      summary.errors++;
    }

    console.log(
      `[SmartShelf] Expiry job completed: Stores=${summary.storesProcessed}, Batches=${summary.batchesProcessed}, Updated=${summary.pricesUpdated}, Expired=${summary.expired}, ExpiringSoon=${summary.expiringSoon}, LowStock=${summary.lowStock}, SoldOut=${summary.soldOut}, Errors=${summary.errors}`
    );

    return summary;
  },

  // Get Expiring Soon batches for store owner (API GET /api/inventory/batches/expiring?days=7)
  getExpiringBatchesForStore: async (ownerId, daysParam = 7) => {
    const store = await getOwnerStore(ownerId);

    const days = Math.max(1, parseInt(daysParam) || 7);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const cutoffEnd = new Date(startOfToday.getTime() + (days + 1) * 86400000 - 1);

    const batches = await InventoryBatch.find({
      storeId: store._id,
      expiryDate: { $gte: startOfToday, $lte: cutoffEnd }
    })
      .populate('productId', 'name category brand unit image')
      .sort({ expiryDate: 1 });

    // Format output with whole calendar days remaining
    const formattedBatches = batches.map((b) => {
      const daysRemaining = pricingService.calculateDaysRemaining(b.expiryDate);
      return {
        ...b.toObject(),
        daysRemaining
      };
    });

    return formattedBatches;
  }
};

module.exports = expiryService;
