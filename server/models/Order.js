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
        values: [
          'PENDING',
          'CONFIRMED',
          'CANCELLED',
          'COMPLETED',
          'EXPIRED',
          'PENDING_PAYMENT',
          'WAITING_FOR_STORE_ACCEPTANCE',
          'ACCEPTED',
          'REJECTED'
        ],
        message: '{VALUE} is not a valid order status'
      },
      default: 'PENDING'
    },
    paymentMethod: {
      type: String,
      enum: {
        values: ['ONLINE', 'PAY_AT_STORE'],
        message: '{VALUE} is not a valid payment method'
      },
      default: 'PAY_AT_STORE'
    },
    paymentStatus: {
      type: String,
      enum: {
        values: [
          'PENDING',
          'AUTHORIZED',
          'CAPTURED',
          'FAILED',
          'REFUND_PENDING',
          'REFUNDED',
          'REFUND_FAILED'
        ],
        message: '{VALUE} is not a valid payment status'
      },
      default: 'PENDING'
    },
    razorpayOrderId: {
      type: String,
      trim: true
    },
    razorpayPaymentId: {
      type: String,
      trim: true
    },
    razorpaySignature: {
      type: String,
      trim: true
    },
    refundId: {
      type: String,
      trim: true
    },
    paymentProvider: {
      type: String,
      enum: ['DEMO', 'RAZORPAY', 'NONE'],
      default: 'DEMO'
    },
    isDemoPayment: {
      type: Boolean,
      default: true
    },
    demoPaymentDetails: {
      method: {
        type: String,
        enum: ['UPI', 'CARD', 'NET_BANKING', 'DEMO_DEFAULT'],
        default: 'UPI'
      },
      transactionId: {
        type: String,
        trim: true
      },
      simulatedAt: {
        type: Date
      }
    },
    refundAmount: {
      type: Number,
      min: [0, 'Refund amount cannot be negative']
    },
    refundedAt: {
      type: Date
    },
    paymentTimeline: [
      {
        status: {
          type: String,
          trim: true
        },
        paymentStatus: {
          type: String,
          trim: true
        },
        title: {
          type: String,
          required: true,
          trim: true
        },
        description: {
          type: String,
          trim: true
        },
        timestamp: {
          type: Date,
          default: Date.now
        }
      }
    ],
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
    },
    rejectionReason: {
      type: String,
      trim: true
    },
    orderType: {
      type: String,
      enum: {
        values: ['DIRECT', 'INGREDIENT_BASKET'],
        message: '{VALUE} is not a valid order type'
      },
      default: 'DIRECT'
    },
    recipeName: {
      type: String,
      trim: true
    },
    basketGroupId: {
      type: String,
      trim: true
    },
    ingredientName: {
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
orderSchema.index({ basketGroupId: 1 }, { sparse: true });
orderSchema.index({ status: 1, reservationExpiresAt: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ razorpayOrderId: 1 }, { sparse: true });
orderSchema.index({ razorpayPaymentId: 1 }, { sparse: true });

module.exports = mongoose.model('Order', orderSchema);
