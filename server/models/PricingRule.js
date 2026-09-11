const mongoose = require('mongoose');

const pricingRuleSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: [true, 'Pricing rule must belong to a store']
    },
    daysRemainingMin: {
      type: Number,
      required: [true, 'Minimum days remaining is required'],
      min: [0, 'Minimum days remaining cannot be negative']
    },
    daysRemainingMax: {
      type: Number,
      required: [true, 'Maximum days remaining is required'],
      min: [0, 'Maximum days remaining cannot be negative'],
      validate: {
        validator: function (value) {
          return (
            this.daysRemainingMin === undefined || value >= this.daysRemainingMin
          );
        },
        message: 'Maximum days remaining must be greater than or equal to minimum days remaining'
      }
    },
    discountPercentage: {
      type: Number,
      required: [true, 'Discount percentage is required'],
      min: [0, 'Discount percentage cannot be less than 0'],
      max: [100, 'Discount percentage cannot exceed 100']
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

pricingRuleSchema.index({ storeId: 1 });

module.exports = mongoose.model('PricingRule', pricingRuleSchema);
