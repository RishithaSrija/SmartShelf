const mongoose = require('mongoose');

const inventoryBatchSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Inventory batch must be associated with a product']
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: [true, 'Inventory batch must be associated with a store']
    },
    batchNumber: {
      type: String,
      required: [true, 'Batch number is required'],
      trim: true
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0, 'Quantity cannot be negative']
    },
    originalPrice: {
      type: Number,
      required: [true, 'Original price is required'],
      min: [0, 'Original price cannot be negative']
    },
    currentPrice: {
      type: Number,
      required: [true, 'Current price is required'],
      min: [0, 'Current price cannot be negative']
    },
    discountPercentage: {
      type: Number,
      default: 0,
      min: [0, 'Discount percentage cannot be less than 0'],
      max: [100, 'Discount percentage cannot exceed 100']
    },
    manufactureDate: {
      type: Date,
      required: [true, 'Manufacture date is required']
    },
    expiryDate: {
      type: Date,
      required: [true, 'Expiry date is required'],
      validate: {
        validator: function (value) {
          return !this.manufactureDate || value > this.manufactureDate;
        },
        message: 'Expiry date must be later than manufacture date'
      }
    },
    status: {
      type: String,
      enum: {
        values: [
          'AVAILABLE',
          'LOW_STOCK',
          'EXPIRING_SOON',
          'FLASH_SALE',
          'EXPIRED',
          'SOLD_OUT'
        ],
        message: '{VALUE} is not a valid batch status'
      },
      default: 'AVAILABLE'
    }
  },
  {
    timestamps: true
  }
);

// Compound unique index: A store cannot create duplicate batch numbers for the same product
inventoryBatchSchema.index(
  { storeId: 1, productId: 1, batchNumber: 1 },
  { unique: true }
);

// Performance indexes for expiry monitoring, search, & flash sales
inventoryBatchSchema.index({ storeId: 1 });
inventoryBatchSchema.index({ productId: 1 });
inventoryBatchSchema.index({ expiryDate: 1 });
inventoryBatchSchema.index({ status: 1 });

module.exports = mongoose.model('InventoryBatch', inventoryBatchSchema);
