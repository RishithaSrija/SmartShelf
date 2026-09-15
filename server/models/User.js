const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'User name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      select: false
    },
    role: {
      type: String,
      enum: {
        values: ['CUSTOMER', 'STORE_OWNER', 'ADMIN'],
        message: '{VALUE} is not a valid user role'
      },
      default: 'CUSTOMER'
    },
    phone: {
      type: String,
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
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
    // Intelligent Business & Customer Mode Fields
    customerType: {
      type: String,
      enum: ['personal', 'business'],
      default: 'personal'
    },
    businessProfile: {
      businessName: {
        type: String,
        trim: true
      },
      businessType: {
        type: String,
        enum: [
          'Sweet Shop',
          'Bakery',
          'Restaurant',
          'Café',
          'Caterer',
          'Cloud Kitchen',
          'Food Manufacturer',
          'Grocery / Retail',
          'Other'
        ],
        default: 'Other'
      },
      businessSize: {
        type: String,
        enum: ['Small', 'Medium', 'Large'],
        default: 'Small'
      },
      preferredQuantity: {
        type: String,
        enum: ['small', 'bulk'],
        default: 'small'
      },
      buyingFrequency: {
        type: String,
        enum: ['Daily', 'Weekly', 'Biweekly', 'Monthly', 'Occasionally'],
        default: 'Weekly'
      },
      optInDiscovery: {
        type: Boolean,
        default: true
      }
    },
    smartPreferences: {
      categories: {
        type: [String],
        default: []
      },
      products: {
        type: [String],
        default: []
      },
      shelfLifePreference: {
        type: String,
        enum: ['any', 'short', 'urgent'],
        default: 'any'
      },
      bulkBuying: {
        type: Boolean,
        default: false
      }
    }
  },
  {
    timestamps: true
  }
);

// 2dsphere index for location-based queries
userSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('User', userSchema);
