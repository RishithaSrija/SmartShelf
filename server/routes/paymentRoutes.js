const express = require('express');
const router = express.Router();
const {
  getRazorpayKey,
  createPaymentOrder,
  verifyPayment,
  handleWebhook,
  getPaymentDetails,
  getPaymentProvider,
  simulateDemoSuccess,
  simulateDemoFailure
} = require('../controllers/paymentController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// Public / Authenticated provider & key endpoints
router.get('/provider', getPaymentProvider);
router.get('/razorpay/key', getRazorpayKey);

// Demo payment simulation endpoints (Customer only)
router.post('/demo/simulate-success', protect, authorizeRoles('CUSTOMER'), simulateDemoSuccess);
router.post('/demo/simulate-failure', protect, authorizeRoles('CUSTOMER'), simulateDemoFailure);

// Customer endpoints (Razorpay)
router.post('/razorpay/order', protect, authorizeRoles('CUSTOMER'), createPaymentOrder);
router.post('/razorpay/verify', protect, authorizeRoles('CUSTOMER'), verifyPayment);

// Webhook endpoint (Raw body signature verified)
router.post('/razorpay/webhook', handleWebhook);

// Payment details endpoint
router.get('/:id', protect, getPaymentDetails);

module.exports = router;
