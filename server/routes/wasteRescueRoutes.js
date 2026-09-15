const express = require('express');
const router = express.Router();
const wasteRescueController = require('../controllers/wasteRescueController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// Public Waste Rescue deals
router.get('/deals', wasteRescueController.getDeals);

// Customer personalized recommendations
router.get(
  '/recommendations',
  protect,
  wasteRescueController.getRecommendations
);

// Store owner inventory health metrics
router.get(
  '/inventory-health',
  protect,
  authorizeRoles('STORE_OWNER'),
  wasteRescueController.getInventoryHealth
);

// Store owner buyer match demand insight
router.get(
  '/buyer-demand',
  protect,
  authorizeRoles('STORE_OWNER'),
  wasteRescueController.getBuyerDemand
);

module.exports = router;
