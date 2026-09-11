const express = require('express');
const router = express.Router();
const {
  getEligibleBatches,
  createFlashSale,
  getFlashSales,
  getNearbyFlashSales,
  getFlashSaleById,
  updateFlashSale,
  updateFlashSaleStatus,
  deleteFlashSale
} = require('../controllers/flashSaleController');
const { protect, optionalAuth, authorizeRoles } = require('../middleware/authMiddleware');

// Specific Store Owner & Search routes FIRST before generic :id parameter
router.get('/eligible-batches', protect, authorizeRoles('STORE_OWNER', 'ADMIN'), getEligibleBatches);

// Public Marketplace Endpoints
router.get('/nearby', getNearbyFlashSales);
router.get('/', optionalAuth, getFlashSales);
router.get('/:id', getFlashSaleById);

// Store Owner Management Endpoints
router.post('/', protect, authorizeRoles('STORE_OWNER', 'ADMIN'), createFlashSale);
router.put('/:id', protect, authorizeRoles('STORE_OWNER', 'ADMIN'), updateFlashSale);
router.patch('/:id/status', protect, authorizeRoles('STORE_OWNER', 'ADMIN'), updateFlashSaleStatus);
router.delete('/:id', protect, authorizeRoles('STORE_OWNER', 'ADMIN'), deleteFlashSale);

module.exports = router;
