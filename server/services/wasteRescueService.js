const Product = require('../models/Product');
const InventoryBatch = require('../models/InventoryBatch');
const FlashSale = require('../models/FlashSale');
const Store = require('../models/Store');
const User = require('../models/User');
const Order = require('../models/Order');

// Helper to get store owned by user
const getOwnerStore = async (ownerId) => {
  const store = await Store.findOne({ ownerId });
  if (!store) {
    const error = new Error('No store registered for this store owner');
    error.statusCode = 404;
    throw error;
  }
  return store;
};

// Compute days remaining from expiry date
const calculateDaysRemaining = (expiryDate) => {
  if (!expiryDate) return 7;
  const now = new Date();
  const exp = new Date(expiryDate);
  const diffMs = exp.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
};

// Map perishability level to human terminology
const getLifecycleInfo = (perishabilityLevel, daysRemaining) => {
  if (perishabilityLevel === 1 || daysRemaining <= 2) {
    return {
      level: 1,
      tag: 'Use Soon',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
      urgencyLabel: daysRemaining <= 1 ? 'Use Soon — 1 day left' : `Use Soon — ${daysRemaining} days left`
    };
  }
  if (perishabilityLevel === 2 || daysRemaining >= 5) {
    return {
      level: 2,
      tag: 'Good for Stocking',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      urgencyLabel: 'Good for Stocking'
    };
  }
  return {
    level: 3,
    tag: 'Great for Business Use',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    urgencyLabel: 'Great for Business Use'
  };
};

const wasteRescueService = {
  /**
   * Get public Waste Rescue deals (near expiry, excess stock, or high discounts)
   */
  getWasteRescueDeals: async (queryParams = {}) => {
    const { category, search, storeId, page = 1, limit = 12 } = queryParams;

    const filter = {
      status: 'ACTIVE',
      availableQuantity: { $gt: 0 },
      endsAt: { $gt: new Date() }
    };

    if (storeId) {
      filter.storeId = storeId;
    }

    const flashSales = await FlashSale.find(filter)
      .populate({
        path: 'productId',
        select: 'name category image imageUrl brand unit perishabilityLevel businessUseCases commonUses description'
      })
      .populate({
        path: 'inventoryBatchId',
        select: 'batchNumber expiryDate quantity currentPrice originalPrice'
      })
      .populate({
        path: 'storeId',
        select: 'name address phone location'
      })
      .sort({ endsAt: 1 })
      .lean();

    // Decorate with lifecycle, days left, and waste rescue indicators
    let decorated = flashSales.map((fs) => {
      const daysRemaining = fs.inventoryBatchId?.expiryDate
        ? calculateDaysRemaining(fs.inventoryBatchId.expiryDate)
        : calculateDaysRemaining(fs.endsAt);

      const pLevel = fs.productId?.perishabilityLevel || (daysRemaining <= 2 ? 1 : 2);
      const lifecycle = getLifecycleInfo(pLevel, daysRemaining);

      const suitableBusinessTypes = fs.productId?.businessUseCases?.length
        ? fs.productId.businessUseCases
        : ['Sweet Shop', 'Bakery', 'Café'];

      const commonUses = fs.productId?.commonUses?.length
        ? fs.productId.commonUses
        : ['Food Service', 'Daily Use'];

      const savings = Math.max(0, (fs.originalPrice || 0) - (fs.salePrice || 0));

      // Is Waste Rescue if expiring in <= 3 days OR discount >= 30% OR available quantity >= 15
      const isWasteRescue = daysRemaining <= 3 || fs.discountPercentage >= 30 || fs.availableQuantity >= 15;

      return {
        ...fs,
        daysRemaining,
        lifecycleLevel: lifecycle.level,
        lifecycleTag: lifecycle.tag,
        urgencyLabel: lifecycle.urgencyLabel,
        suitableBusinessTypes,
        commonUses,
        savings,
        isWasteRescue
      };
    });

    // Category and search filter
    if (category && category !== 'ALL') {
      decorated = decorated.filter(
        (item) => (item.productId?.category || '').toUpperCase() === category.toUpperCase()
      );
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      decorated = decorated.filter((item) => {
        const pName = (item.productId?.name || item.title || '').toLowerCase();
        const sName = (item.storeId?.name || '').toLowerCase();
        const uses = (item.commonUses || []).join(' ').toLowerCase();
        const bTypes = (item.suitableBusinessTypes || []).join(' ').toLowerCase();
        return pName.includes(q) || sName.includes(q) || uses.includes(q) || bTypes.includes(q);
      });
    }

    const total = decorated.length;
    const startIndex = (Number(page) - 1) * Number(limit);
    const paginated = decorated.slice(startIndex, startIndex + Number(limit));

    return {
      deals: paginated,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)) || 1
      }
    };
  },

  /**
   * Get smart matching recommendations tailored for the customer
   */
  getSmartRecommendations: async (user, queryParams = {}) => {
    const { limit = 8 } = queryParams;

    // Fetch active flash sales with product and batch details
    const flashSales = await FlashSale.find({
      status: 'ACTIVE',
      availableQuantity: { $gt: 0 },
      endsAt: { $gt: new Date() }
    })
      .populate({
        path: 'productId',
        select: 'name category image imageUrl brand unit perishabilityLevel businessUseCases commonUses description'
      })
      .populate({
        path: 'inventoryBatchId',
        select: 'batchNumber expiryDate quantity currentPrice originalPrice'
      })
      .populate({
        path: 'storeId',
        select: 'name address phone location'
      })
      .lean();

    const isBusiness = user?.customerType === 'business';
    const businessType = user?.businessProfile?.businessType || '';
    const preferredQty = user?.businessProfile?.preferredQuantity || 'small';
    const prefCategories = (user?.smartPreferences?.categories || []).map((c) => c.toLowerCase());
    const prefProducts = (user?.smartPreferences?.products || []).map((p) => p.toLowerCase());
    const shelfLifePref = user?.smartPreferences?.shelfLifePreference || 'any'; // 'any' | 'short' | 'urgent'
    const bulkPref = Boolean(user?.smartPreferences?.bulkBuying) || preferredQty === 'bulk';

    const scoredDeals = flashSales.map((fs) => {
      let score = 50; // base score
      const matchReasons = [];

      const pName = (fs.productId?.name || fs.title || '').toLowerCase();
      const pCat = (fs.productId?.category || '').toLowerCase();
      const daysRemaining = fs.inventoryBatchId?.expiryDate
        ? calculateDaysRemaining(fs.inventoryBatchId.expiryDate)
        : calculateDaysRemaining(fs.endsAt);

      // 1. Specific Product Match
      const productMatched = prefProducts.some((p) => pName.includes(p) || p.includes(pName));
      if (productMatched) {
        score += 35;
        matchReasons.push(`Matches your preference for ${fs.productId?.name}`);
      }

      // 2. Category Match
      const catMatched = prefCategories.some((c) => pCat.includes(c) || c.includes(pCat));
      if (catMatched) {
        score += 25;
        matchReasons.push(`You prefer ${fs.productId?.category || 'this category'}`);
      }

      // 3. Business Use Case Match
      if (isBusiness && businessType) {
        const bUses = fs.productId?.businessUseCases || [];
        const isCompatible = bUses.some(
          (bu) => bu.toLowerCase().includes(businessType.toLowerCase()) || businessType.toLowerCase().includes(bu.toLowerCase())
        );
        if (isCompatible) {
          score += 25;
          matchReasons.push(`Suitable for ${businessType} operations`);
        }
      }

      // 4. Urgency / Shelf-Life Match
      if (shelfLifePref === 'urgent' && daysRemaining <= 2) {
        score += 20;
        matchReasons.push(`${daysRemaining} days remaining (matches your urgent use preference)`);
      } else if (shelfLifePref === 'short' && daysRemaining <= 4) {
        score += 15;
        matchReasons.push(`${daysRemaining} days shelf life (ready for quick processing)`);
      } else if (shelfLifePref === 'any' && daysRemaining > 3) {
        score += 10;
        matchReasons.push(`Fresh quality stock with ${daysRemaining} days remaining`);
      }

      // 5. Quantity / Bulk Match
      if (bulkPref && fs.availableQuantity >= 10) {
        score += 15;
        matchReasons.push(`Bulk quantity available (${fs.availableQuantity} units)`);
      } else if (!bulkPref && fs.availableQuantity < 15) {
        score += 5;
      }

      // 6. Discount Appeal
      if (fs.discountPercentage >= 25) {
        score += 10;
        matchReasons.push(`${fs.discountPercentage}% discount provides great value`);
      }

      // Fallback reason if none matched
      if (matchReasons.length === 0) {
        matchReasons.push('Popular item available at discounted price');
      }

      const pLevel = fs.productId?.perishabilityLevel || (daysRemaining <= 2 ? 1 : 2);
      const lifecycle = getLifecycleInfo(pLevel, daysRemaining);

      return {
        ...fs,
        matchScore: score,
        matchReasons: matchReasons.slice(0, 4), // keep top 4 understandable reasons
        daysRemaining,
        lifecycleLevel: lifecycle.level,
        lifecycleTag: lifecycle.tag,
        urgencyLabel: lifecycle.urgencyLabel,
        suitableBusinessTypes: fs.productId?.businessUseCases || ['Sweet Shop', 'Bakery', 'Café'],
        commonUses: fs.productId?.commonUses || ['Food Service', 'Daily Preparation']
      };
    });

    // Sort descending by matchScore
    scoredDeals.sort((a, b) => b.matchScore - a.matchScore);

    return scoredDeals.slice(0, Number(limit));
  },

  /**
   * Get real inventory health breakdown for a store owner
   */
  getStoreInventoryHealth: async (ownerId) => {
    const store = await getOwnerStore(ownerId);

    // Fetch all active batches with product info
    const batches = await InventoryBatch.find({
      storeId: store._id,
      status: { $nin: ['EXPIRED', 'SOLD_OUT'] },
      quantity: { $gt: 0 }
    })
      .populate('productId', 'name category unit perishabilityLevel image imageUrl')
      .sort({ expiryDate: 1 })
      .lean();

    let healthyCount = 0;
    let attentionCount = 0;
    let useSoonCount = 0;

    const classifiedBatches = [];
    const excessItems = [];

    for (const batch of batches) {
      const daysRemaining = calculateDaysRemaining(batch.expiryDate);
      let healthStatus = 'HEALTHY'; // 'HEALTHY' | 'ATTENTION' | 'USE_SOON'

      if (daysRemaining <= 2) {
        healthStatus = 'USE_SOON';
        useSoonCount++;
      } else if (daysRemaining <= 4 || batch.quantity >= 25) {
        healthStatus = 'ATTENTION';
        attentionCount++;
      } else {
        healthStatus = 'HEALTHY';
        healthyCount++;
      }

      // Identify potential excess stock:
      // If batch has <= 3 days left or quantity >= 20, compare against sales velocity
      if (daysRemaining <= 3 || (daysRemaining <= 5 && batch.quantity >= 20)) {
        // Estimate expected demand over the remaining days
        // Heuristic velocity: 3-5 units/day based on typical neighborhood volume
        const dailyVelocityEst = 4;
        const expectedDemand = Math.max(1, daysRemaining * dailyVelocityEst);
        const potentialExcess = Math.max(0, batch.quantity - expectedDemand);

        if (potentialExcess > 0 || daysRemaining <= 2) {
          const suggestedDiscount = daysRemaining <= 1 ? 40 : daysRemaining <= 2 ? 30 : 25;
          const suggestedPrice = Math.round((batch.originalPrice || batch.currentPrice) * (1 - suggestedDiscount / 100));

          excessItems.push({
            batchId: batch._id,
            productId: batch.productId?._id,
            productName: batch.productId?.name || 'Inventory Item',
            category: batch.productId?.category || 'OTHER',
            unit: batch.productId?.unit || 'unit',
            batchNumber: batch.batchNumber,
            currentStock: batch.quantity,
            daysRemaining,
            expiryDate: batch.expiryDate,
            originalPrice: batch.originalPrice,
            currentPrice: batch.currentPrice,
            predictedDemand: expectedDemand,
            potentialExcess: potentialExcess > 0 ? potentialExcess : Math.ceil(batch.quantity * 0.5),
            suggestedDiscount,
            suggestedPrice,
            urgency: daysRemaining <= 1 ? 'URGENT' : 'MODERATE',
            suggestedAction: 'Create a Waste Rescue Deal'
          });
        }
      }

      classifiedBatches.push({
        ...batch,
        daysRemaining,
        healthStatus
      });
    }

    return {
      store: {
        id: store._id,
        name: store.name
      },
      summary: {
        totalBatches: batches.length,
        healthyCount,
        attentionCount,
        useSoonCount,
        excessItemsCount: excessItems.length
      },
      excessItems,
      classifiedBatches
    };
  },

  /**
   * Find potential business buyer matches for store's excess / near-expiry items
   * Fully privacy-preserving: aggregates business type counts without exposing personal customer details
   */
  getStoreBuyerDemandInsight: async (ownerId) => {
    const store = await getOwnerStore(ownerId);

    // Fetch near-expiry or excess batches
    const nearExpiryBatches = await InventoryBatch.find({
      storeId: store._id,
      status: { $nin: ['EXPIRED', 'SOLD_OUT'] },
      quantity: { $gt: 0 }
    })
      .populate('productId', 'name category unit businessUseCases commonUses')
      .sort({ expiryDate: 1 })
      .lean();

    if (nearExpiryBatches.length === 0) {
      return {
        matchedItems: [],
        totalPotentialBuyers: 0
      };
    }

    // Fetch all registered business customers opted into discovery
    const businessUsers = await User.find({
      customerType: 'business',
      role: 'CUSTOMER',
      isActive: true
    })
      .select('businessProfile smartPreferences')
      .lean();

    const matchedItems = [];
    let totalPotentialBuyers = 0;

    for (const batch of nearExpiryBatches) {
      const daysRemaining = calculateDaysRemaining(batch.expiryDate);
      if (daysRemaining > 4 && batch.quantity < 20) continue; // skip non-urgent batches

      const pName = (batch.productId?.name || '').toLowerCase();
      const pCat = (batch.productId?.category || '').toLowerCase();
      const bUseCases = (batch.productId?.businessUseCases || []).map((u) => u.toLowerCase());

      // Count matching businesses by type
      const countsByType = {};

      for (const bUser of businessUsers) {
        const bType = bUser.businessProfile?.businessType || 'Other';
        const userCats = (bUser.smartPreferences?.categories || []).map((c) => c.toLowerCase());
        const userProds = (bUser.smartPreferences?.products || []).map((p) => p.toLowerCase());

        const matchesType = bUseCases.some((bu) => bu.includes(bType.toLowerCase()) || bType.toLowerCase().includes(bu));
        const matchesCat = userCats.some((c) => pCat.includes(c) || c.includes(pCat));
        const matchesProd = userProds.some((p) => pName.includes(p) || p.includes(pName));

        if (matchesType || matchesCat || matchesProd) {
          countsByType[bType] = (countsByType[bType] || 0) + 1;
        }
      }

      // Format counts into clean display objects
      const buyerCounts = Object.entries(countsByType).map(([type, count]) => {
        let icon = '🏪';
        if (type.includes('Sweet')) icon = '🍬';
        else if (type.includes('Bakery')) icon = '🧁';
        else if (type.includes('Café') || type.includes('Cafe')) icon = '☕';
        else if (type.includes('Restaurant')) icon = '🍽️';
        else if (type.includes('Kitchen')) icon = '🍳';
        else if (type.includes('Caterer')) icon = '🍱';

        return { type, count, icon };
      });

      const totalForProduct = buyerCounts.reduce((acc, c) => acc + c.count, 0);
      totalPotentialBuyers += totalForProduct;

      matchedItems.push({
        batchId: batch._id,
        productId: batch.productId?._id,
        productName: batch.productId?.name || 'Item',
        quantity: batch.quantity,
        unit: batch.productId?.unit || 'units',
        daysRemaining,
        buyerCounts,
        totalBuyers: totalForProduct,
        commonUses: batch.productId?.commonUses || ['Food Preparation', 'Daily Service']
      });
    }

    return {
      matchedItems,
      totalPotentialBuyers
    };
  }
};

module.exports = wasteRescueService;
