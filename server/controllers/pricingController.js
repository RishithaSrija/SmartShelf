const pricingService = require('../services/pricingService');

// @desc    Get pricing rules for store owner
// @route   GET /api/pricing/rules
// @access  Private (STORE_OWNER)
const getRules = async (req, res) => {
  try {
    const rules = await pricingService.getRules(req.user._id);
    return res.status(200).json({
      success: true,
      data: rules
    });
  } catch (error) {
    console.error('[PricingController] getRules error:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Internal server error while fetching pricing rules'
    });
  }
};

// @desc    Create a new pricing rule
// @route   POST /api/pricing/rules
// @access  Private (STORE_OWNER)
const createRule = async (req, res) => {
  try {
    const rule = await pricingService.createRule(req.user._id, req.body);
    return res.status(201).json({
      success: true,
      message: 'Pricing rule created successfully',
      data: rule
    });
  } catch (error) {
    console.error('[PricingController] createRule error:', error.message);
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Internal server error while creating pricing rule'
    });
  }
};

// @desc    Update a pricing rule
// @route   PUT /api/pricing/rules/:id
// @access  Private (STORE_OWNER)
const updateRule = async (req, res) => {
  try {
    const rule = await pricingService.updateRule(req.user._id, req.params.id, req.body);
    return res.status(200).json({
      success: true,
      message: 'Pricing rule updated successfully',
      data: rule
    });
  } catch (error) {
    console.error('[PricingController] updateRule error:', error.message);
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Internal server error while updating pricing rule'
    });
  }
};

// @desc    Toggle pricing rule status
// @route   PATCH /api/pricing/rules/:id/status
// @access  Private (STORE_OWNER)
const updateRuleStatus = async (req, res) => {
  try {
    const { isActive } = req.body;
    const rule = await pricingService.updateRuleStatus(req.user._id, req.params.id, isActive);
    return res.status(200).json({
      success: true,
      message: `Pricing rule ${rule.isActive ? 'activated' : 'deactivated'} successfully`,
      data: rule
    });
  } catch (error) {
    console.error('[PricingController] updateRuleStatus error:', error.message);
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Internal server error while toggling rule status'
    });
  }
};

// @desc    Delete pricing rule
// @route   DELETE /api/pricing/rules/:id
// @access  Private (STORE_OWNER)
const deleteRule = async (req, res) => {
  try {
    const result = await pricingService.deleteRule(req.user._id, req.params.id);
    return res.status(200).json(result);
  } catch (error) {
    console.error('[PricingController] deleteRule error:', error.message);
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Unable to delete pricing rule'
    });
  }
};

// @desc    Preview pricing calculation without saving to database
// @route   POST /api/pricing/preview
// @access  Private (STORE_OWNER)
const previewPrice = async (req, res) => {
  try {
    const { originalPrice, expiryDate } = req.body;
    if (!originalPrice || !expiryDate) {
      return res.status(400).json({
        success: false,
        message: 'Both originalPrice and expiryDate are required for preview'
      });
    }

    const preview = await pricingService.previewPrice(req.user._id, originalPrice, expiryDate);
    return res.status(200).json({
      success: true,
      data: preview
    });
  } catch (error) {
    console.error('[PricingController] previewPrice error:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Internal server error during price preview'
    });
  }
};

// @desc    Recalculate price for a single batch
// @route   POST /api/pricing/recalculate/:batchId
// @access  Private (STORE_OWNER)
const recalculateBatchPrice = async (req, res) => {
  try {
    const data = await pricingService.recalculateBatchPrice(req.user._id, req.params.batchId);
    return res.status(200).json({
      success: true,
      message: 'Price recalculated successfully',
      data
    });
  } catch (error) {
    console.error('[PricingController] recalculateBatchPrice error:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Internal server error while recalculating batch price'
    });
  }
};

// @desc    Recalculate prices for all inventory batches in owner store
// @route   POST /api/pricing/recalculate-all
// @access  Private (STORE_OWNER)
const recalculateStoreInventory = async (req, res) => {
  try {
    const summary = await pricingService.recalculateStoreInventory(req.user._id);
    return res.status(200).json({
      success: true,
      message: 'Store inventory prices recalculated successfully',
      data: summary
    });
  } catch (error) {
    console.error('[PricingController] recalculateStoreInventory error:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Internal server error while recalculating store inventory'
    });
  }
};

module.exports = {
  getRules,
  createRule,
  updateRule,
  updateRuleStatus,
  deleteRule,
  previewPrice,
  recalculateBatchPrice,
  recalculateStoreInventory
};
