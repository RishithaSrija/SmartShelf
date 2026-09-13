const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      minlength: [2, 'Product name must be at least 2 characters'],
      maxlength: [100, 'Product name cannot exceed 100 characters']
    },
    normalizedName: {
      type: String,
      trim: true,
      lowercase: true,
      select: false
    },
    category: {
      type: String,
      enum: {
        values: [
          'DAIRY',
          'BAKERY',
          'BEVERAGES',
          'FRUITS',
          'VEGETABLES',
          'SNACKS',
          'FROZEN',
          'READY_TO_EAT',
          'OTHER'
        ],
        message: '{VALUE} is not a valid product category'
      },
      required: [true, 'Product category is required']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    brand: {
      type: String,
      trim: true,
      maxlength: [100, 'Brand name cannot exceed 100 characters']
    },
    image: {
      type: String,
      trim: true
    },
    imageUrl: {
      type: String,
      trim: true
    },
    imagePublicId: {
      type: String,
      trim: true
    },
    additionalImages: [
      {
        imageUrl: { type: String, trim: true },
        imagePublicId: { type: String, trim: true }
      }
    ],
    unit: {
      type: String,
      required: [true, 'Product unit is required'],
      trim: true,
      enum: {
        values: [
          'piece',
          'kg',
          'gram',
          'liter',
          'ml',
          'pack',
          'box',
          'bottle',
          'dozen'
        ],
        message: '{VALUE} is not a valid unit'
      },
      default: 'piece'
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: [true, 'Product must belong to a store']
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

// Pre-save hook to generate normalizedName and sync image fields
productSchema.pre('save', function (next) {
  if (this.name) {
    this.normalizedName = this.name.toLowerCase().trim();
  }

  // Ensure bidirectional synchronization between image and imageUrl
  if (this.imageUrl && !this.image) {
    this.image = this.imageUrl;
  } else if (this.image && !this.imageUrl) {
    this.imageUrl = this.image;
  }

  next();
});

// Indexes for performance and store-scoped unique products
productSchema.index({ storeId: 1, normalizedName: 1 }, { unique: true });
productSchema.index({ storeId: 1 });
productSchema.index({ category: 1 });
productSchema.index({ isActive: 1 });

module.exports = mongoose.model('Product', productSchema);
