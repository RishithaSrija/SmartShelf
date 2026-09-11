const mongoose = require('mongoose');

const flashSaleSchema = new mongoose.Schema(
  {
    inventoryBatchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryBatch',
      required: [true, 'Flash Sale must reference an inventory batch']
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Flash Sale must reference a product']
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: [true, 'Flash Sale must reference a store']
    },
    title: {
      type: String,
      required: [true, 'Flash Sale title is required'],
      trim: true,
      maxlength: [120, 'Title cannot exceed 120 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    originalPrice: {
      type: Number,
      required: [true, 'Original price is required'],
      min: [0.01, 'Original price must be greater than 0']
    },
    salePrice: {
      type: Number,
      required: [true, 'Sale price is required'],
      min: [0, 'Sale price cannot be negative']
    },
    discountPercentage: {
      type: Number,
      required: [true, 'Discount percentage is required'],
      min: [0, 'Discount percentage cannot be negative'],
      max: [100, 'Discount percentage cannot exceed 100']
    },
    availableQuantity: {
      type: Number,
      required: [true, 'Available quantity is required'],
      min: [0, 'Available quantity cannot be negative']
    },
    startsAt: {
      type: Date,
      default: Date.now
    },
    endsAt: {
      type: Date,
      required: [true, 'End time is required']
    },
    status: {
      type: String,
      enum: {
        values: ['DRAFT', 'ACTIVE', 'PAUSED', 'SOLD_OUT', 'EXPIRED', 'CANCELLED'],
        message: '{VALUE} is not a valid flash sale status'
      },
      default: 'ACTIVE'
    }
  },
  {
    timestamps: true
  }
);

flashSaleSchema.index({ storeId: 1 });
flashSaleSchema.index({ productId: 1 });
flashSaleSchema.index({ inventoryBatchId: 1 });
flashSaleSchema.index({ status: 1, endsAt: 1 });
flashSaleSchema.index({ inventoryBatchId: 1, status: 1 });

module.exports = mongoose.model('FlashSale', flashSaleSchema);
