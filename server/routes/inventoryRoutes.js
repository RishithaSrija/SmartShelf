const express = require('express');
const router = express.Router();
const {
  createBatch,
  getBatches,
  getBatchById,
  updateBatch,
  updateQuantity,
  updateStatus,
  deleteBatch,
  getInventorySummary,
  getExpiringBatches
} = require('../controllers/inventoryController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// All inventory management routes require authentication and store owner role
router.use(protect);
router.use(authorizeRoles('STORE_OWNER', 'ADMIN'));

router.get('/summary', getInventorySummary);
router.get('/batches/expiring', getExpiringBatches);
router.post('/batches', createBatch);
router.get('/batches', getBatches);
router.get('/batches/:id', getBatchById);
router.put('/batches/:id', updateBatch);
router.patch('/batches/:id/quantity', updateQuantity);
router.patch('/batches/:id/status', updateStatus);
router.delete('/batches/:id', deleteBatch);

module.exports = router;
