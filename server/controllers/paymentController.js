const razorpayService = require('../services/razorpayService');
const orderService = require('../services/orderService');
const demoPaymentService = require('../services/demoPaymentService');
const Order = require('../models/Order');

// @desc    Get public Razorpay Key ID for client checkout initialization
// @route   GET /api/payments/razorpay/key
// @access  Public / Authenticated
const getRazorpayKey = async (req, res) => {
  try {
    const keyId = razorpayService.getPublicKey();
    return res.status(200).json({
      success: true,
      data: { keyId }
    });
  } catch (error) {
    console.error('[PaymentController] getRazorpayKey error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve payment configuration'
    });
  }
};

// @desc    Create Razorpay Order for customer checkout
// @route   POST /api/payments/razorpay/order
// @access  Private (CUSTOMER)
const createPaymentOrder = async (req, res) => {
  try {
    const { flashSaleId, quantity, orderId } = req.body;

    // If an existing order is passed to be paid online
    if (orderId) {
      const order = await Order.findOne({
        _id: orderId,
        customerId: req.user._id
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      const amountPaise = Math.round(order.totalPrice * 100);
      const rzpOrder = await razorpayService.createRazorpayOrder({
        amountPaise,
        currency: 'INR',
        receipt: order.orderNumber,
        notes: {
          smartShelfOrderId: order.orderNumber,
          customerId: String(req.user._id)
        }
      });

      order.razorpayOrderId = rzpOrder.id;
      order.paymentMethod = 'ONLINE';
      order.status = 'PENDING_PAYMENT';
      await order.save();

      return res.status(200).json({
        success: true,
        data: {
          order,
          razorpay: {
            orderId: rzpOrder.id,
            amount: amountPaise,
            currency: 'INR',
            keyId: razorpayService.getPublicKey()
          }
        }
      });
    }

    // Otherwise create full reservation order with ONLINE payment method
    const orderResult = await orderService.createOrder(req.user._id, {
      flashSaleId,
      quantity,
      paymentMethod: 'ONLINE'
    });

    return res.status(201).json({
      success: true,
      message: 'Razorpay order created successfully',
      data: orderResult
    });
  } catch (error) {
    console.error('[PaymentController] createPaymentOrder error:', error.message);
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Unable to create payment order'
    });
  }
};

// @desc    Verify Razorpay payment signature
// @route   POST /api/payments/razorpay/verify
// @access  Private (CUSTOMER)
const verifyPayment = async (req, res) => {
  try {
    const order = await orderService.verifyOnlinePayment(req.user._id, req.body);
    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully and order waiting for store acceptance',
      data: order
    });
  } catch (error) {
    console.error('[PaymentController] verifyPayment error:', error.message);
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Payment signature verification failed'
    });
  }
};

// @desc    Handle Razorpay Webhooks (RAW body HMAC SHA-256 verification)
// @route   POST /api/payments/razorpay/webhook
// @access  Public (Signature validated)
const handleWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const rawBody = req.rawBody || JSON.stringify(req.body);

    if (!signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing Razorpay signature header'
      });
    }

    const result = await orderService.handleRazorpayWebhook(rawBody, signature, req.body);
    return res.status(200).json({
      status: 'ok',
      result
    });
  } catch (error) {
    console.error('[PaymentController] handleWebhook error:', error.message);
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Webhook verification error'
    });
  }
};

// @desc    Get payment and refund details for an order
// @route   GET /api/orders/:id/payment
// @access  Private (CUSTOMER, STORE_OWNER, ADMIN)
const getPaymentDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const isObjectId = require('mongoose').Types.ObjectId.isValid(id);
    const query = isObjectId ? { $or: [{ _id: id }, { orderNumber: id }] } : { orderNumber: id };

    const order = await Order.findOne(query)
      .select('orderNumber status paymentMethod paymentStatus paymentProvider isDemoPayment demoPaymentDetails refundId refundAmount refundedAt paymentTimeline razorpayOrderId razorpayPaymentId totalPrice createdAt updatedAt');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('[PaymentController] getPaymentDetails error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve payment details'
    });
  }
};

// @desc    Get active payment provider configuration (Demo vs Live)
// @route   GET /api/payments/provider
// @access  Public / Authenticated
const getPaymentProvider = async (req, res) => {
  try {
    const info = demoPaymentService.getProviderInfo();
    return res.status(200).json({
      success: true,
      data: info
    });
  } catch (error) {
    console.error('[PaymentController] getPaymentProvider error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve payment provider info'
    });
  }
};

// @desc    Simulate Successful Demo Payment for an order
// @route   POST /api/payments/demo/simulate-success
// @access  Private (CUSTOMER)
const simulateDemoSuccess = async (req, res) => {
  try {
    const { orderId, method } = req.body;
    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required to simulate payment'
      });
    }

    const order = await demoPaymentService.simulatePaymentSuccess({
      orderId,
      customerId: req.user._id,
      method: method || 'UPI'
    });

    return res.status(200).json({
      success: true,
      message: 'Demo payment simulated successfully! Order sent to store for confirmation.',
      data: order
    });
  } catch (error) {
    console.error('[PaymentController] simulateDemoSuccess error:', error.message);
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Payment simulation failed'
    });
  }
};

// @desc    Simulate Failed Demo Payment for an order
// @route   POST /api/payments/demo/simulate-failure
// @access  Private (CUSTOMER)
const simulateDemoFailure = async (req, res) => {
  try {
    const { orderId, reason } = req.body;
    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required to simulate payment failure'
      });
    }

    const order = await demoPaymentService.simulatePaymentFailure({
      orderId,
      customerId: req.user._id,
      reason: reason || 'Customer simulated payment decline'
    });

    return res.status(200).json({
      success: true,
      message: 'Demo payment failure simulated. Order remains reserved for retry.',
      data: order
    });
  } catch (error) {
    console.error('[PaymentController] simulateDemoFailure error:', error.message);
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Simulation error'
    });
  }
};

module.exports = {
  getRazorpayKey,
  createPaymentOrder,
  verifyPayment,
  handleWebhook,
  getPaymentDetails,
  getPaymentProvider,
  simulateDemoSuccess,
  simulateDemoFailure
};
