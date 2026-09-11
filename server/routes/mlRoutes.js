const express = require('express');
const router = express.Router();
const mlController = require('../controllers/mlController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// Store Owner demand prediction endpoints
router.get(
  '/demand/:productId',
  protect,
  authorizeRoles('STORE_OWNER'),
  mlController.getDemandPrediction
);

router.get(
  '/predictions',
  protect,
  authorizeRoles('STORE_OWNER'),
  mlController.getPredictionHistory
);

// Admin ML diagnostics endpoint
router.get(
  '/status',
  protect,
  authorizeRoles('ADMIN'),
  mlController.getAdminMLStatus
);

module.exports = router;
