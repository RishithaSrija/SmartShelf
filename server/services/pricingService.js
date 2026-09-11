const PricingRule = require('../models/PricingRule');
const InventoryBatch = require('../models/InventoryBatch');
const Store = require('../models/Store');

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

// Calculate whole calendar days remaining until expiry
const calculateDaysRemaining = (expiryDate) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let expDate = new Date(expiryDate);
  if (typeof expiryDate === 'string' && expiryDate.includes('-')) {
    const parts = expiryDate.split('T')[0].split('-');
    if (parts.length === 3) {
      expDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }
  }

  const expiryStart = new Date(expDate.getFullYear(), expDate.getMonth(), expDate.getDate());
  const diffMs = expiryStart.getTime() - todayStart.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
};

// Round currency values to 2 decimal places
const roundCurrency = (val) => Math.round(val * 100) / 100;

const pricingService = {
  calculateDaysRemaining,

  // Initialize default 5 pricing rules for a store if none exist
  initDefaultRules: async (storeId) => {
    const count = await PricingRule.countDocuments({ storeId });
    if (count > 0) return;

    const defaultRules = [
      { storeId, daysRemainingMin: 8, daysRemainingMax: 9999, discountPercentage: 0, isActive: true },
      { storeId, daysRemainingMin: 4, daysRemainingMax: 7, discountPercentage: 10, isActive: true },
      { storeId, daysRemainingMin: 2, daysRemainingMax: 3, discountPercentage: 20, isActive: true },
      { storeId, daysRemainingMin: 1, daysRemainingMax: 1, discountPercentage: 40, isActive: true },
      { storeId, daysRemainingMin: 0, daysRemainingMax: 0, discountPercentage: 60, isActive: true }
    ];

    await PricingRule.insertMany(defaultRules);
  },

  // Check if a pricing rule range overlaps with existing active rules for the store
  checkRuleOverlap: async (storeId, minDays, maxDays, excludeRuleId = null) => {
    const query = {
      storeId,
      isActive: true
    };

    if (excludeRuleId) {
      query._id = { $ne: excludeRuleId };
    }

    const activeRules = await PricingRule.find(query);

    for (const rule of activeRules) {
      if (minDays <= rule.daysRemainingMax && maxDays >= rule.daysRemainingMin) {
        return true;
      }
    }
    return false;
  },

  // Compute dynamic price & status calculation for a batch given store rules
  calculateDynamicPrice: (batch, activeRules = []) => {
    const daysRemaining = calculateDaysRemaining(batch.expiryDate);

    // Case 1: Expired inventory
    if (daysRemaining < 0) {
      return {
        daysRemaining,
        discountPercentage: 0,
        currentPrice: 0,
        status: 'EXPIRED',
        explanation: 'This batch has expired and cannot be sold.'
      };
    }

    // Case 2: Active inventory — Find matching pricing rule
    const matchingRule = activeRules.find(
      (rule) => daysRemaining >= rule.daysRemainingMin && daysRemaining <= rule.daysRemainingMax
    );

    const discountPercentage = matchingRule ? matchingRule.discountPercentage : 0;
    const discountAmount = roundCurrency((batch.originalPrice * discountPercentage) / 100);
    const currentPrice = Math.max(0, roundCurrency(batch.originalPrice - discountAmount));

    // Determine status according to priority
    let status = 'AVAILABLE';
    if (batch.quantity === 0) {
      status = 'SOLD_OUT';
    } else if (daysRemaining <= 1) {
      status = 'EXPIRING_SOON';
    } else if (batch.quantity <= 5) {
      status = 'LOW_STOCK';
    }

    const explanation =
      discountPercentage > 0
        ? `Price reduced by ${discountPercentage}% because this batch expires in ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'}.`
        : 'Standard original price applied.';

    return {
      daysRemaining,
      discountPercentage,
      currentPrice,
      status,
      explanation
    };
  },

  // Get pricing rules for store owner (ensures defaults are created)
  getRules: async (ownerId) => {
    const store = await getOwnerStore(ownerId);
    await pricingService.initDefaultRules(store._id);

    const rules = await PricingRule.find({ storeId: store._id }).sort({ daysRemainingMin: 1 });
    return rules;
  },

  // Create a new pricing rule
  createRule: async (ownerId, ruleData) => {
    const store = await getOwnerStore(ownerId);

    const minDays = Number(ruleData.daysRemainingMin);
    const maxDays = Number(ruleData.daysRemainingMax);
    const discount = Number(ruleData.discountPercentage);

    if (isNaN(minDays) || minDays < 0) {
      const error = new Error('Minimum days remaining must be a non-negative number');
      error.statusCode = 400;
      throw error;
    }

    if (isNaN(maxDays) || maxDays < minDays) {
      const error = new Error('Maximum days remaining must be greater than or equal to minimum days');
      error.statusCode = 400;
      throw error;
    }

    if (isNaN(discount) || discount < 0 || discount > 100) {
      const error = new Error('Discount percentage must be between 0 and 100');
      error.statusCode = 400;
      throw error;
    }

    // Overlap check
    const hasOverlap = await pricingService.checkRuleOverlap(store._id, minDays, maxDays);
    if (hasOverlap) {
      const error = new Error('Pricing rule overlaps with an existing rule');
      error.statusCode = 400;
      throw error;
    }

    const rule = await PricingRule.create({
      storeId: store._id,
      daysRemainingMin: minDays,
      daysRemainingMax: maxDays,
      discountPercentage: discount,
      isActive: true
    });

    return rule;
  },

  // Update an existing pricing rule
  updateRule: async (ownerId, ruleId, updateData) => {
    const store = await getOwnerStore(ownerId);

    const rule = await PricingRule.findById(ruleId);
    if (!rule || rule.storeId.toString() !== store._id.toString()) {
      const error = new Error('Pricing rule not found');
      error.statusCode = 404;
      throw error;
    }

    const minDays = updateData.daysRemainingMin !== undefined ? Number(updateData.daysRemainingMin) : rule.daysRemainingMin;
    const maxDays = updateData.daysRemainingMax !== undefined ? Number(updateData.daysRemainingMax) : rule.daysRemainingMax;
    const discount = updateData.discountPercentage !== undefined ? Number(updateData.discountPercentage) : rule.discountPercentage;

    if (isNaN(minDays) || minDays < 0) {
      const error = new Error('Minimum days remaining must be a non-negative number');
      error.statusCode = 400;
      throw error;
    }

    if (isNaN(maxDays) || maxDays < minDays) {
      const error = new Error('Maximum days remaining must be greater than or equal to minimum days');
      error.statusCode = 400;
      throw error;
    }

    if (isNaN(discount) || discount < 0 || discount > 100) {
      const error = new Error('Discount percentage must be between 0 and 100');
      error.statusCode = 400;
      throw error;
    }

    // Overlap check if active
    if (rule.isActive) {
      const hasOverlap = await pricingService.checkRuleOverlap(store._id, minDays, maxDays, ruleId);
      if (hasOverlap) {
        const error = new Error('Pricing rule overlaps with an existing rule');
        error.statusCode = 400;
        throw error;
      }
    }

    rule.daysRemainingMin = minDays;
    rule.daysRemainingMax = maxDays;
    rule.discountPercentage = discount;

    await rule.save();
    return rule;
  },

  // Toggle rule status (Active / Inactive)
  updateRuleStatus: async (ownerId, ruleId, isActive) => {
    const store = await getOwnerStore(ownerId);

    const rule = await PricingRule.findById(ruleId);
    if (!rule || rule.storeId.toString() !== store._id.toString()) {
      const error = new Error('Pricing rule not found');
      error.statusCode = 404;
      throw error;
    }

    const nextState = Boolean(isActive);

    // If activating, check overlap
    if (nextState && !rule.isActive) {
      const hasOverlap = await pricingService.checkRuleOverlap(
        store._id,
        rule.daysRemainingMin,
        rule.daysRemainingMax,
        ruleId
      );
      if (hasOverlap) {
        const error = new Error('Pricing rule overlaps with an existing rule');
        error.statusCode = 400;
        throw error;
      }
    }

    rule.isActive = nextState;
    await rule.save();
    return rule;
  },

  // Delete pricing rule (Ensures at least 1 active rule remains)
  deleteRule: async (ownerId, ruleId) => {
    const store = await getOwnerStore(ownerId);

    const rule = await PricingRule.findById(ruleId);
    if (!rule || rule.storeId.toString() !== store._id.toString()) {
      const error = new Error('Pricing rule not found');
      error.statusCode = 404;
      throw error;
    }

    const activeRulesCount = await PricingRule.countDocuments({ storeId: store._id, isActive: true });
    if (rule.isActive && activeRulesCount <= 1) {
      const error = new Error('At least one active pricing rule is required.');
      error.statusCode = 400;
      throw error;
    }

    await PricingRule.findByIdAndDelete(ruleId);
    return { success: true, message: 'Pricing rule deleted successfully' };
  },

  // Preview dynamic price calculation without modifying database
  previewPrice: async (ownerId, originalPrice, expiryDate) => {
    const store = await getOwnerStore(ownerId);
    await pricingService.initDefaultRules(store._id);

    const rules = await PricingRule.find({ storeId: store._id, isActive: true }).sort({ daysRemainingMin: 1 });

    const mockBatch = {
      originalPrice: Number(originalPrice),
      expiryDate,
      quantity: 10
    };

    const calculation = pricingService.calculateDynamicPrice(mockBatch, rules);
    return calculation;
  },

  // Recalculate price for a single batch
  recalculateBatchPrice: async (ownerId, batchId) => {
    const store = await getOwnerStore(ownerId);

    const batch = await InventoryBatch.findById(batchId).populate('productId');
    if (!batch || batch.storeId.toString() !== store._id.toString()) {
      const error = new Error('Inventory batch not found');
      error.statusCode = 404;
      throw error;
    }

    const rules = await PricingRule.find({ storeId: store._id, isActive: true }).sort({ daysRemainingMin: 1 });

    const calc = pricingService.calculateDynamicPrice(batch, rules);

    batch.currentPrice = calc.currentPrice;
    batch.discountPercentage = calc.discountPercentage;
    batch.status = calc.status;

    await batch.save();

    return {
      batchId: batch._id,
      batchNumber: batch.batchNumber,
      productName: batch.productId?.name,
      originalPrice: batch.originalPrice,
      currentPrice: batch.currentPrice,
      discountPercentage: batch.discountPercentage,
      daysRemaining: calc.daysRemaining,
      status: batch.status,
      explanation: calc.explanation
    };
  },

  // Recalculate price for ALL batches in store owner's store
  recalculateStoreInventory: async (ownerId) => {
    const store = await getOwnerStore(ownerId);
    await pricingService.initDefaultRules(store._id);

    const rules = await PricingRule.find({ storeId: store._id, isActive: true }).sort({ daysRemainingMin: 1 });
    const batches = await InventoryBatch.find({ storeId: store._id });

    let processed = 0;
    let updated = 0;
    let expired = 0;
    let expiringSoon = 0;

    for (const batch of batches) {
      processed++;
      const calc = pricingService.calculateDynamicPrice(batch, rules);

      batch.currentPrice = calc.currentPrice;
      batch.discountPercentage = calc.discountPercentage;
      batch.status = calc.status;

      await batch.save();
      updated++;

      if (calc.status === 'EXPIRED') expired++;
      if (calc.status === 'EXPIRING_SOON') expiringSoon++;
    }

    return {
      processed,
      updated,
      expired,
      expiringSoon
    };
  }
};

module.exports = pricingService;
