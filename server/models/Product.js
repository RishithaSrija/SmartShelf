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
    },
    // Intelligent Business & Product Lifecycle Fields
    perishabilityLevel: {
      type: Number,
      enum: [1, 2, 3],
      default: 2 // 1: Highly Perishable ("Use Soon"), 2: Ingredients ("Good for Stocking"), 3: Value-Added ("Great for Business Use")
    },
    businessUseCases: {
      type: [String],
      default: []
    },
    commonUses: {
      type: [String],
      default: []
    }
  },
  {
    timestamps: true
  }
);

// Pre-save hook to generate normalizedName, sync image fields, and infer defaults
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

  // Auto-infer perishabilityLevel and businessUseCases if empty
  const nameLower = (this.name || '').toLowerCase();
  const category = (this.category || '').toUpperCase();

  if (!this.businessUseCases || this.businessUseCases.length === 0) {
    if (category === 'DAIRY' || nameLower.includes('milk') || nameLower.includes('paneer') || nameLower.includes('curd')) {
      this.businessUseCases = ['Sweet Shop', 'Bakery', 'Café', 'Dessert Businesses'];
      this.commonUses = ['Dairy', 'Sweets', 'Bakery', 'Desserts'];
    } else if (category === 'BAKERY' || nameLower.includes('flour') || nameLower.includes('maida') || nameLower.includes('egg')) {
      this.businessUseCases = ['Bakery', 'Café', 'Restaurant', 'Cloud Kitchen'];
      this.commonUses = ['Baking', 'Pastries', 'Snacks', 'Breads'];
    } else if (nameLower.includes('ghee') || nameLower.includes('besan') || nameLower.includes('sugar') || nameLower.includes('jaggery')) {
      this.businessUseCases = ['Sweet Shop', 'Bakery', 'Caterer', 'Food Manufacturer'];
      this.commonUses = ['Sweets', 'Laddu', 'Savoury Foods', 'Desserts'];
    } else if (category === 'FRUITS' || category === 'VEGETABLES') {
      this.businessUseCases = ['Restaurant', 'Café', 'Juice Bar', 'Caterer'];
      this.commonUses = ['Fresh Food', 'Salads', 'Juices', 'Cooking'];
    } else {
      this.businessUseCases = ['Café', 'Restaurant', 'Grocery / Retail'];
      this.commonUses = ['General Food Service', 'Prepared Meals'];
    }
  }

  // Auto-infer perishabilityLevel if default 2
  if (this.isModified('name') || this.isModified('category')) {
    if (
      category === 'DAIRY' ||
      category === 'FRUITS' ||
      category === 'VEGETABLES' ||
      nameLower.includes('milk') ||
      nameLower.includes('paneer') ||
      nameLower.includes('curd') ||
      nameLower.includes('bread') ||
      nameLower.includes('egg')
    ) {
      this.perishabilityLevel = 1; // "Use Soon"
    } else if (
      nameLower.includes('ghee') ||
      nameLower.includes('sugar') ||
      nameLower.includes('flour') ||
      nameLower.includes('besan') ||
      nameLower.includes('rice') ||
      nameLower.includes('dry fruit') ||
      nameLower.includes('spice')
    ) {
      this.perishabilityLevel = 2; // "Good for Stocking"
    } else {
      this.perishabilityLevel = 3; // "Great for Business Use"
    }
  }

  next();
});

// Indexes for performance and store-scoped unique products
productSchema.index({ storeId: 1, normalizedName: 1 }, { unique: true });
productSchema.index({ storeId: 1 });
productSchema.index({ category: 1 });
productSchema.index({ isActive: 1 });

module.exports = mongoose.model('Product', productSchema);
