const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: [true, 'Order number is required'],
      unique: true,
      trim: true,
      uppercase: true
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Order must belong to a customer']
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: [true, 'Order must belong to a store']
    },
    flashSaleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FlashSale',
      required: [true, 'Order must reference a flash sale deal']
    },
    inventoryBatchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryBatch',
      required: [true, 'Order must reference an inventory batch']
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Order must reference a product']
    },
    productName: {
      type: String,
      required: [true, 'Product name snapshot is required'],
      trim: true
    },
    storeName: {
      type: String,
      required: [true, 'Store name snapshot is required'],
      trim: true
    },
    quantity: {
      type: Number,
      required: [true, 'Order quantity is required'],
      min: [1, 'Quantity must be at least 1']
    },
    unitPrice: {
      type: Number,
      required: [true, 'Unit price is required'],
      min: [0, 'Unit price cannot be negative']
    },
    totalPrice: {
      type: Number,
      required: [true, 'Total price is required'],
      min: [0, 'Total price cannot be negative']
    },
    status: {
      type: String,
      enum: {
        values: ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'EXPIRED'],
        message: '{VALUE} is not a valid order status'
      },
      default: 'PENDING'
    },
    reservationExpiresAt: {
      type: Date,
      required: [true, 'Reservation expiry date is required']
    },
    pickupTime: {
      type: Date
    },
    cancellationReason: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Performance & Discovery indexes
orderSchema.index({ customerId: 1, createdAt: -1 });
orderSchema.index({ storeId: 1, createdAt: -1 });
orderSchema.index({ flashSaleId: 1 });
orderSchema.index({ status: 1, reservationExpiresAt: 1 });

module.exports = mongoose.model('Order', orderSchema);
