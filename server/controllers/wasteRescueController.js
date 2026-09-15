const wasteRescueService = require('../services/wasteRescueService');

// @desc    Get Waste Rescue deals
// @route   GET /api/waste-rescue/deals
// @access  Public / Optional Auth
const getDeals = async (req, res) => {
  try {
    const result = await wasteRescueService.getWasteRescueDeals(req.query);
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[WasteRescueController] getDeals error:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Error fetching Waste Rescue deals'
    });
  }
};

// @desc    Get smart matching recommendations for customer
// @route   GET /api/waste-rescue/recommendations
// @access  Private (CUSTOMER)
const getRecommendations = async (req, res) => {
  try {
    const recommendations = await wasteRescueService.getSmartRecommendations(
      req.user,
      req.query
    );
    return res.status(200).json({
      success: true,
      data: {
        recommendations,
        customerType: req.user.customerType || 'personal',
        businessType: req.user.businessProfile?.businessType || null
      }
    });
  } catch (error) {
    console.error('[WasteRescueController] getRecommendations error:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Error generating smart recommendations'
    });
  }
};

// @desc    Get inventory health breakdown for store owner
// @route   GET /api/waste-rescue/inventory-health
// @access  Private (STORE_OWNER)
const getInventoryHealth = async (req, res) => {
  try {
    const health = await wasteRescueService.getStoreInventoryHealth(req.user._id);
    return res.status(200).json({
      success: true,
      data: health
    });
  } catch (error) {
    console.error('[WasteRescueController] getInventoryHealth error:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Error fetching inventory health metrics'
    });
  }
};

// @desc    Get potential business buyers insight for store owner excess stock
// @route   GET /api/waste-rescue/buyer-demand
// @access  Private (STORE_OWNER)
const getBuyerDemand = async (req, res) => {
  try {
    const demandInsight = await wasteRescueService.getStoreBuyerDemandInsight(req.user._id);
    return res.status(200).json({
      success: true,
      data: demandInsight
    });
  } catch (error) {
    console.error('[WasteRescueController] getBuyerDemand error:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Error analyzing local business demand'
    });
  }
};

module.exports = {
  getDeals,
  getRecommendations,
  getInventoryHealth,
  getBuyerDemand
};
