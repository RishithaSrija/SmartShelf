const express = require('express');
const router = express.Router();
const {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  getStoreOrders,
  getStoreOrderById,
  updateStoreOrderStatus,
  acceptOrder,
  rejectOrder
} = require('../controllers/orderController');
const { getPaymentDetails } = require('../controllers/paymentController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// 1. Store Owner Order Management Routes (MUST precede generic /:id)
router.get('/store', protect, authorizeRoles('STORE_OWNER', 'ADMIN'), getStoreOrders);
router.get('/store/:id', protect, authorizeRoles('STORE_OWNER', 'ADMIN'), getStoreOrderById);
router.patch('/store/:id/status', protect, authorizeRoles('STORE_OWNER', 'ADMIN'), updateStoreOrderStatus);
router.post('/store/:id/accept', protect, authorizeRoles('STORE_OWNER', 'ADMIN'), acceptOrder);
router.post('/store/:id/reject', protect, authorizeRoles('STORE_OWNER', 'ADMIN'), rejectOrder);

// 2. Direct Accept / Reject Endpoints (Matches requirement 25: POST /api/orders/:id/accept and /reject)
router.post('/:id/accept', protect, authorizeRoles('STORE_OWNER', 'ADMIN'), acceptOrder);
router.post('/:id/reject', protect, authorizeRoles('STORE_OWNER', 'ADMIN'), rejectOrder);
router.get('/:id/payment', protect, getPaymentDetails);

// 3. Customer Order Routes
router.post('/', protect, authorizeRoles('CUSTOMER'), createOrder);
router.get('/my-orders', protect, authorizeRoles('CUSTOMER'), getMyOrders);
router.get('/:id', protect, authorizeRoles('CUSTOMER', 'ADMIN'), getOrderById);
router.patch('/:id/cancel', protect, authorizeRoles('CUSTOMER'), cancelOrder);

module.exports = router;
