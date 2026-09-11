const flashSaleService = require('../services/flashSaleService');

// @desc    Get eligible inventory batches for store owner
// @route   GET /api/flash-sales/eligible-batches
// @access  Private (STORE_OWNER)
const getEligibleBatches = async (req, res) => {
  try {
    const batches = await flashSaleService.getEligibleBatches(req.user._id);
    return res.status(200).json({
      success: true,
      data: batches
    });
  } catch (error) {
    console.error('[FlashSaleController] getEligibleBatches error:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Internal server error while fetching eligible batches'
    });
  }
};

// @desc    Create a new Flash Sale
// @route   POST /api/flash-sales
// @access  Private (STORE_OWNER)
const createFlashSale = async (req, res) => {
  try {
    const flashSale = await flashSaleService.createFlashSale(req.user._id, req.body);
    return res.status(201).json({
      success: true,
      message: 'Flash sale published successfully',
      data: flashSale
    });
  } catch (error) {
    console.error('[FlashSaleController] createFlashSale error:', error.message);
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Unable to create flash sale'
    });
  }
};

// @desc    Get Flash Sales (Public or Store Owner)
// @route   GET /api/flash-sales
// @access  Public (Filterable) / Private (STORE_OWNER via query mode=owner)
const getFlashSales = async (req, res) => {
  try {
    if (req.user && req.user.role === 'STORE_OWNER' && req.query.mode === 'owner') {
      const data = await flashSaleService.getStoreFlashSales(req.user._id, req.query);
      return res.status(200).json({
        success: true,
        data
      });
    }

    // Public Marketplace query
    const data = await flashSaleService.getPublicFlashSales(req.query);
    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('[FlashSaleController] getFlashSales error:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Internal server error while fetching flash sales'
    });
  }
};

// @desc    Get nearby Flash Sales by customer coordinates and radius (Public)
// @route   GET /api/flash-sales/nearby
// @access  Public
const getNearbyFlashSales = async (req, res) => {
  try {
    const data = await flashSaleService.getNearbyFlashSales(req.query);
    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('[FlashSaleController] getNearbyFlashSales error:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Internal server error while fetching nearby flash sales'
    });
  }
};

// @desc    Get single Flash Sale by ID (Public)
// @route   GET /api/flash-sales/:id
// @access  Public
const getFlashSaleById = async (req, res) => {
  try {
    const flashSale = await flashSaleService.getPublicFlashSaleById(req.params.id);
    return res.status(200).json({
      success: true,
      data: flashSale
    });
  } catch (error) {
    console.error('[FlashSaleController] getFlashSaleById error:', error.message);
    return res.status(error.statusCode || 404).json({
      success: false,
      message: error.message || 'Flash sale deal not found'
    });
  }
};

// @desc    Update Flash Sale details
// @route   PUT /api/flash-sales/:id
// @access  Private (STORE_OWNER)
const updateFlashSale = async (req, res) => {
  try {
    const flashSale = await flashSaleService.updateFlashSale(
      req.user._id,
      req.params.id,
      req.body
    );
    return res.status(200).json({
      success: true,
      message: 'Flash sale updated successfully',
      data: flashSale
    });
  } catch (error) {
    console.error('[FlashSaleController] updateFlashSale error:', error.message);
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Internal server error while updating flash sale'
    });
  }
};

// @desc    Toggle Flash Sale status
// @route   PATCH /api/flash-sales/:id/status
// @access  Private (STORE_OWNER)
const updateFlashSaleStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const flashSale = await flashSaleService.updateFlashSaleStatus(
      req.user._id,
      req.params.id,
      status
    );
    return res.status(200).json({
      success: true,
      message: `Flash sale status updated to ${flashSale.status}`,
      data: flashSale
    });
  } catch (error) {
    console.error('[FlashSaleController] updateFlashSaleStatus error:', error.message);
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Internal server error while updating flash sale status'
    });
  }
};

// @desc    Delete Flash Sale
// @route   DELETE /api/flash-sales/:id
// @access  Private (STORE_OWNER)
const deleteFlashSale = async (req, res) => {
  try {
    const result = await flashSaleService.deleteFlashSale(req.user._id, req.params.id);
    return res.status(200).json(result);
  } catch (error) {
    console.error('[FlashSaleController] deleteFlashSale error:', error.message);
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Unable to delete flash sale'
    });
  }
};

module.exports = {
  getEligibleBatches,
  createFlashSale,
  getFlashSales,
  getNearbyFlashSales,
  getFlashSaleById,
  updateFlashSale,
  updateFlashSaleStatus,
  deleteFlashSale
};
