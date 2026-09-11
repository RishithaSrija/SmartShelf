const axios = require('axios');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Store = require('../models/Store');
const InventoryBatch = require('../models/InventoryBatch');
const PredictionLog = require('../models/PredictionLog');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001';

const getOwnerStore = async (ownerId) => {
  const store = await Store.findOne({ ownerId });
  if (!store) {
    const error = new Error('No store registered for this store owner');
    error.statusCode = 404;
    throw error;
  }
  return store;
};

const mlService = {
  /**
   * Predict product demand for store owner
   */
  getDemandPrediction: async (ownerId, productId, targetDateStr) => {
    const store = await getOwnerStore(ownerId);

    // 1. Verify product ownership
    const product = await Product.findById(productId);
    if (!product) {
      const error = new Error('Product not found');
      error.statusCode = 404;
      throw error;
    }

    if (product.storeId.toString() !== store._id.toString()) {
      const error = new Error('You are not authorized to access predictions for products of another store');
      error.statusCode = 403;
      throw error;
    }

    const targetDate = targetDateStr ? new Date(targetDateStr) : new Date(Date.now() + 24 * 60 * 60 * 1000);
    const dateFormatted = targetDate.toISOString().split('T')[0];

    // 2. Compute current active inventory and near-expiry quantities
    const [currentBatches, completedOrdersAgg] = await Promise.all([
      InventoryBatch.find({
        productId: product._id,
        status: { $nin: ['EXPIRED', 'SOLD_OUT'] },
        quantity: { $gt: 0 }
      }),
      Order.aggregate([
        {
          $match: {
            productId: product._id,
            status: 'COMPLETED'
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            unitsSold: { $sum: '$quantity' }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    const currentInventory = currentBatches.reduce((acc, b) => acc + (b.quantity || 0), 0);

    // Check near-expiry batches (expiring in <= 3 days)
    const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const nearExpiryQuantity = currentBatches
      .filter((b) => new Date(b.expiryDate) <= threeDaysFromNow)
      .reduce((acc, b) => acc + b.quantity, 0);

    const historicalDailySales = completedOrdersAgg.map((item) => ({
      date: item._id,
      unitsSold: item.unitsSold
    }));

    // 3. Minimum Data Threshold Check (e.g. 30 daily observations)
    const MIN_REQUIRED_OBSERVATIONS = 30;

    if (historicalDailySales.length < MIN_REQUIRED_OBSERVATIONS) {
      // Return clear INSUFFICIENT_DATA status rather than guessing
      return {
        success: false,
        code: 'INSUFFICIENT_DATA',
        message: 'Not enough historical sales data for a reliable prediction.',
        suggestedAction: 'Continue recording sales to unlock demand predictions.',
        productId: product._id,
        productName: product.name,
        currentInventory,
        observationsCount: historicalDailySales.length,
        requiredObservations: MIN_REQUIRED_OBSERVATIONS,
        historicalDailySales
      };
    }

    // 4. Call Python FastAPI Microservice
    let predictionResult;
    try {
      const mlResponse = await axios.post(
        `${ML_SERVICE_URL}/predict`,
        {
          storeId: String(store._id),
          productId: String(product._id),
          productCategory: product.category || 'OTHER',
          date: dateFormatted,
          historicalDailySales
        },
        { timeout: 4000 }
      );

      predictionResult = mlResponse.data;
    } catch (err) {
      console.error('[MLService] FastAPI communication error:', err.message);
      const error = new Error('Demand prediction service is temporarily unavailable.');
      error.statusCode = 503;
      throw error;
    }

    const predictedDemand = predictionResult.prediction || 0;
    const roundedPrediction = predictionResult.roundedPrediction || Math.round(predictedDemand);

    // 5. Generate Business & Expiry Insights
    let inventoryInsight = 'Current inventory is sufficient for projected demand.';
    if (currentInventory < roundedPrediction) {
      inventoryInsight = 'Demand may exceed current inventory (Potential stockout).';
    } else if (currentInventory > roundedPrediction * 1.5) {
      inventoryInsight = 'Inventory may exceed expected demand.';
    }

    let expiryInsight = null;
    if (nearExpiryQuantity > 0) {
      const remainingExpiring = Math.max(0, nearExpiryQuantity - roundedPrediction);
      if (remainingExpiring > 0) {
        expiryInsight = `${remainingExpiring} units of near-expiry stock may remain unsold before expiration. Consider a flash sale promotion.`;
      } else {
        expiryInsight = 'Projected demand is expected to absorb all near-expiry inventory.';
      }
    }

    // 6. Record Prediction Log
    try {
      await PredictionLog.create({
        storeId: store._id,
        productId: product._id,
        productName: product.name,
        predictionDate: targetDate,
        predictedDemand: roundedPrediction,
        currentInventory,
        modelVersion: predictionResult.modelVersion || '1.0'
      });
    } catch (logErr) {
      console.error('[MLService] PredictionLog save error:', logErr.message);
    }

    return {
      success: true,
      data: {
        productId: product._id,
        productName: product.name,
        category: product.category,
        predictionDate: dateFormatted,
        predictedDemand,
        roundedPrediction,
        currentInventory,
        nearExpiryQuantity,
        inventoryInsight,
        expiryInsight,
        modelVersion: predictionResult.modelVersion || '1.0',
        confidenceNote: 'Prediction based on historical sales patterns.',
        historicalDailySales: historicalDailySales.slice(-14)
      }
    };
  },

  /**
   * Get prediction history for store owner
   */
  getPredictionHistory: async (ownerId, queryParams = {}) => {
    const store = await getOwnerStore(ownerId);

    const page = Math.max(1, parseInt(queryParams.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(queryParams.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = { storeId: store._id };

    if (queryParams.productId) {
      filter.productId = queryParams.productId;
    }

    const [logs, total] = await Promise.all([
      PredictionLog.find(filter)
        .populate('productId', 'name category brand unit image')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      PredictionLog.countDocuments(filter)
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
  },

  /**
   * Get ML Microservice Health & Diagnostics for Admin
   */
  getMLHealth: async () => {
    try {
      const response = await axios.get(`${ML_SERVICE_URL}/health`, { timeout: 3000 });
      return {
        serviceStatus: 'HEALTHY',
        ...response.data
      };
    } catch (err) {
      return {
        serviceStatus: 'OFFLINE',
        modelLoaded: false,
        modelVersion: '1.0',
        message: 'Python ML FastAPI microservice is offline or unreachable.'
      };
    }
  }
};

module.exports = mlService;
