const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Store name is required'],
      trim: true
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Store must be associated with an owner']
    },
    description: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    address: {
      type: String,
      trim: true
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0]
      }
    },
    businessType: {
      type: String,
      enum: {
        values: ['GROCERY', 'BAKERY', 'RESTAURANT', 'SUPERMARKET', 'OTHER'],
        message: '{VALUE} is not a valid business type'
      },
      required: [true, 'Business type is required']
    },
    openingHours: {
      type: String,
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// 2dsphere index for location-based store discovery
storeSchema.index({ location: '2dsphere' });
storeSchema.index({ ownerId: 1 });

module.exports = mongoose.model('Store', storeSchema);
