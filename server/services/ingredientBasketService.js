const recipeCatalog = require('../data/recipeCatalog');
const FlashSale = require('../models/FlashSale');
const InventoryBatch = require('../models/InventoryBatch');
const Product = require('../models/Product');
const Store = require('../models/Store');
const User = require('../models/User');
const orderService = require('./orderService');

/**
 * Calculates distance between two coordinates in kilometers using Haversine formula
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1));
};

const ingredientBasketService = {
  /**
   * Return all available recipes in the deterministic catalog
   */
  getRecipes: () => {
    return recipeCatalog.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      description: r.description,
      icon: r.icon,
      baseBatchSize: r.baseBatchSize,
      unit: r.unit,
      popularWith: r.popularWith || [],
      ingredientCount: r.ingredients.length,
      typicalIngredients: r.ingredients.map((ing) => ing.name)
    }));
  },

  /**
   * Return detailed recipe by ID with ingredients
   */
  getRecipeById: (recipeId) => {
    const recipe = recipeCatalog.find((r) => r.id === recipeId);
    if (!recipe) {
      const error = new Error(`Recipe with ID "${recipeId}" not found`);
      error.statusCode = 404;
      throw error;
    }
    return recipe;
  },

  /**
   * Deterministically calculate required ingredient quantities based on batch size
   */
  calculateIngredients: (recipeId, batchSize) => {
    const recipe = ingredientBasketService.getRecipeById(recipeId);
    const size = parseFloat(batchSize) || recipe.baseBatchSize;

    if (size <= 0) {
      const error = new Error('Batch size must be greater than zero');
      error.statusCode = 400;
      throw error;
    }

    const scaleFactor = size / recipe.baseBatchSize;

    const scaledIngredients = recipe.ingredients.map((ing) => {
      const scaledQty = parseFloat((ing.ratioPer10Kg * scaleFactor).toFixed(2));
      return {
        id: ing.id,
        name: ing.name,
        requiredQuantity: scaledQty,
        unit: ing.unit,
        keywords: ing.keywords,
        categories: ing.categories,
        optional: !!ing.optional
      };
    });

    return {
      recipeId: recipe.id,
      recipeName: recipe.name,
      recipeCategory: recipe.category,
      batchSize: size,
      unit: recipe.unit,
      ingredients: scaledIngredients
    };
  },

  /**
   * Matches ingredients against SmartShelf active Flash Sales and Inventory
   * Prioritizes stock that needs to move soon (Waste Rescue / Near Expiry)
   */
  matchIngredients: async ({ recipeId, batchSize, latitude, longitude, radius = 15, customerId }) => {
    const { ingredients, recipeName, recipeCategory, batchSize: calculatedSize, unit } =
      ingredientBasketService.calculateIngredients(recipeId, batchSize);

    // Fetch user smart preferences if customerId provided
    let userPreferences = null;
    if (customerId) {
      const user = await User.findById(customerId).select('smartPreferences businessProfile customerType');
      if (user) userPreferences = user;
    }

    // Fetch all active flash sales with unexpired batches and active stores
    const activeFlashSales = await FlashSale.find({
      status: 'ACTIVE',
      availableQuantity: { $gt: 0 },
      endsAt: { $gt: new Date() }
    })
      .populate('productId')
      .populate('storeId')
      .populate('inventoryBatchId');

    const now = new Date();

    const matchedIngredients = ingredients.map((ing) => {
      const candidates = [];

      for (const sale of activeFlashSales) {
        const product = sale.productId;
        const store = sale.storeId;
        const batch = sale.inventoryBatchId;

        // Skip invalid/inactive stores or missing products
        if (!product || !store || !store.isActive) continue;
        if (batch && new Date(batch.expiryDate) <= now) continue;

        const pName = (product.name || '').toLowerCase();
        const pDesc = (product.description || '').toLowerCase();
        const pCat = (product.category || '').toUpperCase();

        // 1. Check keyword and category match
        let keywordScore = 0;
        let matchedKeyword = '';

        for (const kw of ing.keywords) {
          const lowerKw = kw.toLowerCase();
          if (pName.includes(lowerKw)) {
            keywordScore = 100;
            matchedKeyword = kw;
            break;
          } else if (pDesc.includes(lowerKw)) {
            keywordScore = 50;
            matchedKeyword = kw;
          }
        }

        const categoryMatch = ing.categories.map((c) => c.toUpperCase()).includes(pCat);
        if (categoryMatch && keywordScore === 0) {
          keywordScore = 30; // secondary match
        }

        // If no match on keywords or categories, skip
        if (keywordScore === 0 && !categoryMatch) continue;

        // 2. Days remaining and lifecycle priority
        let daysRemaining = sale.daysRemaining;
        if (daysRemaining === undefined && batch?.expiryDate) {
          daysRemaining = Math.max(
            0,
            Math.ceil((new Date(batch.expiryDate) - now) / (1000 * 60 * 60 * 24))
          );
        }

        // Distance computation
        let distanceKm = null;
        if (latitude && longitude && store.location?.coordinates) {
          const [storeLng, storeLat] = store.location.coordinates;
          distanceKm = calculateDistance(latitude, longitude, storeLat, storeLng);
        }

        // If distance exceeds radius significantly, skip (unless radius is huge or no location)
        if (distanceKm !== null && radius && distanceKm > radius * 1.5) {
          continue;
        }

        // 3. Multi-factor scoring
        let score = keywordScore;
        const reasons = [];

        // Expire-Soon & Waste Rescue priority
        if (daysRemaining !== undefined) {
          if (daysRemaining <= 1) {
            score += 50;
            reasons.push('⚡ Use today / tomorrow — urgent rescue');
          } else if (daysRemaining <= 3) {
            score += 40;
            reasons.push(`⚠️ Use soon — ${daysRemaining} days left`);
          } else if (daysRemaining <= 7) {
            score += 20;
            reasons.push(`Use within ${daysRemaining} days`);
          }
        }

        // Flash Sale Discount
        const discount = sale.discountPercentage || 0;
        score += discount;
        if (discount >= 35) {
          reasons.push(`♻️ Steep markdown (${discount}% OFF)`);
        } else if (discount >= 20) {
          reasons.push(`🔥 Flash Sale (${discount}% OFF)`);
        }

        // Sufficient Quantity Bonus
        const availableQty = sale.availableQuantity || 0;
        if (availableQty >= ing.requiredQuantity) {
          score += 35;
          reasons.push('✓ Sufficient quantity available');
        } else if (availableQty > 0) {
          score += 10;
          reasons.push(`Partial stock (${availableQty} ${ing.unit})`);
        }

        // Proximity bonus
        if (distanceKm !== null && distanceKm <= 5) {
          score += 20;
          reasons.push(`Nearby (${distanceKm} km)`);
        }

        // Customer business preference bonus
        if (userPreferences?.smartPreferences?.categories?.includes(pCat)) {
          score += 25;
          reasons.push('Matches business preference');
        }

        candidates.push({
          dealId: sale._id,
          productId: product._id,
          productName: product.name,
          category: product.category,
          unit: product.unit || ing.unit,
          storeId: store._id,
          storeName: store.name,
          storeAddress: store.address,
          distanceKm,
          originalPrice: sale.originalPrice || product.basePrice,
          salePrice: sale.salePrice,
          discountPercentage: discount,
          availableQuantity: availableQty,
          daysRemaining,
          imageUrl: product.imageUrl || product.image,
          perishabilityTier: product.perishabilityTier || (daysRemaining <= 2 ? 'Use Soon' : 'Good for Stocking'),
          isWasteRescue: daysRemaining <= 2 || discount >= 35,
          score,
          reasons: reasons.slice(0, 3)
        });
      }

      // Sort candidates by score descending
      candidates.sort((a, b) => b.score - a.score);

      const topMatch = candidates.length > 0 ? candidates[0] : null;

      // Determine ingredient status
      let status = 'NOT_FOUND';
      let statusMessage = 'Not Available Nearby';

      if (topMatch) {
        if (topMatch.availableQuantity >= ing.requiredQuantity) {
          status = 'AVAILABLE';
          statusMessage = 'Available in full';
        } else if (topMatch.availableQuantity > 0) {
          status = 'PARTIALLY_AVAILABLE';
          statusMessage = `Partially Available (${topMatch.availableQuantity} of ${ing.requiredQuantity} ${ing.unit})`;
        }
      }

      return {
        ingredientId: ing.id,
        ingredientName: ing.name,
        requiredQuantity: ing.requiredQuantity,
        unit: ing.unit,
        optional: ing.optional,
        status, // 'AVAILABLE' | 'PARTIALLY_AVAILABLE' | 'NOT_FOUND'
        statusMessage,
        recommendedMatch: topMatch,
        otherStores: candidates.slice(1, 4) // alternate store options
      };
    });

    // Compute overall basket stats
    let totalEstimatedPrice = 0;
    let totalPotentialSavings = 0;
    const storeIds = new Set();
    let wasteRescueCount = 0;
    let availableCount = 0;
    let partialCount = 0;
    let missingCount = 0;

    for (const item of matchedIngredients) {
      if (item.status === 'AVAILABLE') availableCount++;
      else if (item.status === 'PARTIALLY_AVAILABLE') partialCount++;
      else missingCount++;

      if (item.recommendedMatch) {
        const match = item.recommendedMatch;
        storeIds.add(match.storeId.toString());
        const qtyToBuy = Math.min(item.requiredQuantity, match.availableQuantity);
        totalEstimatedPrice += match.salePrice * qtyToBuy;
        totalPotentialSavings += (match.originalPrice - match.salePrice) * qtyToBuy;
        if (match.isWasteRescue) wasteRescueCount++;
      }
    }

    return {
      recipeId,
      recipeName,
      recipeCategory,
      batchSize: calculatedSize,
      unit,
      summary: {
        totalIngredients: matchedIngredients.length,
        availableCount,
        partialCount,
        missingCount,
        estimatedTotal: parseFloat(totalEstimatedPrice.toFixed(2)),
        potentialSavings: parseFloat(totalPotentialSavings.toFixed(2)),
        storeCount: storeIds.size,
        wasteRescueCount
      },
      ingredients: matchedIngredients
    };
  },

  /**
   * Checkout an Ingredient Basket: creates separate store-specific orders linked by basketGroupId
   */
  checkoutBasket: async (customerId, checkoutData) => {
    const {
      basketGroupId = `BASKET-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      recipeName = 'Ingredient Basket Batch',
      items = [],
      paymentMethod = 'PAY_AT_STORE'
    } = checkoutData;

    if (!Array.isArray(items) || items.length === 0) {
      const error = new Error('Basket must contain at least one ingredient item');
      error.statusCode = 400;
      throw error;
    }

    const createdOrders = [];
    const errors = [];

    // Group or process each item through existing orderService.createOrder
    for (const item of items) {
      try {
        const orderResult = await orderService.createOrder(customerId, {
          flashSaleId: item.flashSaleId || item.dealId,
          quantity: item.quantity || item.orderQuantity,
          paymentMethod,
          orderType: 'INGREDIENT_BASKET',
          recipeName,
          basketGroupId,
          ingredientName: item.ingredientName || item.name
        });

        createdOrders.push(orderResult);
      } catch (err) {
        errors.push({
          item: item.ingredientName || item.name || item.flashSaleId,
          message: err.message
        });
      }
    }

    if (createdOrders.length === 0) {
      const error = new Error(
        `Failed to reserve ingredient basket items: ${errors.map((e) => `${e.item}: ${e.message}`).join(', ')}`
      );
      error.statusCode = 400;
      throw error;
    }

    return {
      basketGroupId,
      recipeName,
      paymentMethod,
      orderCount: createdOrders.length,
      orders: createdOrders,
      errors: errors.length > 0 ? errors : undefined
    };
  }
};

module.exports = ingredientBasketService;
