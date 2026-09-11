const inventoryService = require('../services/inventoryService');

// @desc    Create a new inventory batch
// @route   POST /api/inventory/batches
// @access  Private (STORE_OWNER)
const createBatch = async (req, res) => {
  try {
    const batch = await inventoryService.createBatch(req.user._id, req.body);
    return res.status(201).json({
      success: true,
      message: 'Inventory batch created successfully',
      data: batch
    });
  } catch (error) {
    console.error('[InventoryController] createBatch error:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Internal server error while creating inventory batch'
    });
  }
};

// @desc    Get inventory batches for store owner
// @route   GET /api/inventory/batches
// @access  Private (STORE_OWNER)
const getBatches = async (req, res) => {
  try {
    const result = await inventoryService.getBatches(req.user._id, req.query);
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[InventoryController] getBatches error:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Internal server error while fetching inventory'
    });
  }
};

// @desc    Get single batch by ID
// @route   GET /api/inventory/batches/:id
// @access  Private (STORE_OWNER)
const getBatchById = async (req, res) => {
  try {
    const batch = await inventoryService.getBatchById(req.user._id, req.params.id);
    return res.status(200).json({
      success: true,
      data: batch
    });
  } catch (error) {
    console.error('[InventoryController] getBatchById error:', error.message);
    return res.status(error.statusCode || 404).json({
      success: false,
      message: error.message || 'Inventory batch not found'
    });
  }
};

// @desc    Update batch details
// @route   PUT /api/inventory/batches/:id
// @access  Private (STORE_OWNER)
const updateBatch = async (req, res) => {
  try {
    const batch = await inventoryService.updateBatch(
      req.user._id,
      req.params.id,
      req.body
    );
    return res.status(200).json({
      success: true,
      message: 'Inventory batch updated successfully',
      data: batch
    });
  } catch (error) {
    console.error('[InventoryController] updateBatch error:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Internal server error while updating batch'
    });
  }
};

// @desc    Update batch quantity
// @route   PATCH /api/inventory/batches/:id/quantity
// @access  Private (STORE_OWNER)
const updateQuantity = async (req, res) => {
  try {
    const { quantity } = req.body;
    const batch = await inventoryService.updateQuantity(
      req.user._id,
      req.params.id,
      quantity
    );
    return res.status(200).json({
      success: true,
      message: 'Stock quantity updated successfully',
      data: batch
    });
  } catch (error) {
    console.error('[InventoryController] updateQuantity error:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Internal server error while updating stock quantity'
    });
  }
};

// @desc    Update batch status
// @route   PATCH /api/inventory/batches/:id/status
// @access  Private (STORE_OWNER)
const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const batch = await inventoryService.updateStatus(
      req.user._id,
      req.params.id,
      status
    );
    return res.status(200).json({
      success: true,
      message: 'Batch status updated successfully',
      data: batch
    });
  } catch (error) {
    console.error('[InventoryController] updateStatus error:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Internal server error while updating batch status'
    });
  }
};

// @desc    Delete batch
// @route   DELETE /api/inventory/batches/:id
// @access  Private (STORE_OWNER)
const deleteBatch = async (req, res) => {
  try {
    const result = await inventoryService.deleteBatch(req.user._id, req.params.id);
    return res.status(200).json(result);
  } catch (error) {
    console.error('[InventoryController] deleteBatch error:', error.message);
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Unable to delete batch'
    });
  }
};

// @desc    Get Inventory Summary Statistics
// @route   GET /api/inventory/summary
// @access  Private (STORE_OWNER)
const getInventorySummary = async (req, res) => {
  try {
    const summary = await inventoryService.getInventorySummary(req.user._id);
    return res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('[InventoryController] getInventorySummary error:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Internal server error while fetching summary'
    });
  }
};

// @desc    Get Expiring Soon batches for store owner
// @route   GET /api/inventory/batches/expiring
// @access  Private (STORE_OWNER)
const getExpiringBatches = async (req, res) => {
  try {
    const { days } = req.query;
    const expiryService = require('../services/expiryService');
    const batches = await expiryService.getExpiringBatchesForStore(req.user._id, days);
    return res.status(200).json({
      success: true,
      data: batches
    });
  } catch (error) {
    console.error('[InventoryController] getExpiringBatches error:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Internal server error while fetching expiring batches'
    });
  }
};

module.exports = {
  createBatch,
  getBatches,
  getBatchById,
  updateBatch,
  updateQuantity,
  updateStatus,
  deleteBatch,
  getInventorySummary,
  getExpiringBatches
};
