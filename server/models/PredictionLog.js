const mongoose = require('mongoose');

const predictionLogSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: [true, 'Store ID is required'],
      index: true
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product ID is required'],
      index: true
    },
    productName: {
      type: String,
      required: true,
      trim: true
    },
    predictionDate: {
      type: Date,
      required: [true, 'Prediction target date is required']
    },
    predictedDemand: {
      type: Number,
      required: true,
      min: 0
    },
    currentInventory: {
      type: Number,
      default: 0
    },
    modelVersion: {
      type: String,
      default: '1.0'
    }
  },
  {
    timestamps: true
  }
);

predictionLogSchema.index({ storeId: 1, createdAt: -1 });
predictionLogSchema.index({ productId: 1, createdAt: -1 });

module.exports = mongoose.model('PredictionLog', predictionLogSchema);
