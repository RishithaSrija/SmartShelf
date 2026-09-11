const express = require('express');
const router = express.Router();
const {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  getStoreOrders,
  getStoreOrderById,
  updateStoreOrderStatus
} = require('../controllers/orderController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// 1. Store Owner Order Management Routes (MUST precede generic /:id)
router.get('/store', protect, authorizeRoles('STORE_OWNER', 'ADMIN'), getStoreOrders);
router.get('/store/:id', protect, authorizeRoles('STORE_OWNER', 'ADMIN'), getStoreOrderById);
router.patch('/store/:id/status', protect, authorizeRoles('STORE_OWNER', 'ADMIN'), updateStoreOrderStatus);

// 2. Customer Order Routes
router.post('/', protect, authorizeRoles('CUSTOMER'), createOrder);
router.get('/my-orders', protect, authorizeRoles('CUSTOMER'), getMyOrders);
router.get('/:id', protect, authorizeRoles('CUSTOMER', 'ADMIN'), getOrderById);
router.patch('/:id/cancel', protect, authorizeRoles('CUSTOMER'), cancelOrder);

module.exports = router;
