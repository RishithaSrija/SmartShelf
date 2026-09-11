const express = require('express');
const router = express.Router();
const {
  createStore,
  getMyStore,
  getStoreById,
  updateStore,
  toggleStoreStatus
} = require('../controllers/storeController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// Protected Store Owner Routes
router.post('/', protect, authorizeRoles('STORE_OWNER', 'ADMIN'), createStore);
router.get('/mystore', protect, authorizeRoles('STORE_OWNER', 'ADMIN'), getMyStore);
router.put('/mystore', protect, authorizeRoles('STORE_OWNER', 'ADMIN'), updateStore);
router.patch('/mystore/status', protect, authorizeRoles('STORE_OWNER', 'ADMIN'), toggleStoreStatus);

// Public Route
router.get('/:id', getStoreById);

module.exports = router;
