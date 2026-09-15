const orderService = require('../services/orderService');

// @desc    Create a new flash sale reservation / order
// @route   POST /api/orders
// @access  Private (CUSTOMER)
const createOrder = async (req, res) => {
  try {
    const order = await orderService.createOrder(req.user._id, req.body);
    return res.status(201).json({
      success: true,
      message: 'Deal reserved successfully',
      data: order
    });
  } catch (error) {
    console.error('[OrderController] createOrder error:', error.message);
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Unable to reserve deal'
    });
  }
};

// @desc    Get customer's orders history
// @route   GET /api/orders/my-orders
// @access  Private (CUSTOMER)
const getMyOrders = async (req, res) => {
  try {
    const data = await orderService.getCustomerOrders(req.user._id, req.query);
    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('[OrderController] getMyOrders error:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Internal server error while fetching orders'
    });
  }
};

// @desc    Get single order details for customer
// @route   GET /api/orders/:id
// @access  Private (CUSTOMER, ADMIN)
const getOrderById = async (req, res) => {
  try {
    const order = await orderService.getCustomerOrder(req.user._id, req.params.id);
    return res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('[OrderController] getOrderById error:', error.message);
    return res.status(error.statusCode || 404).json({
      success: false,
      message: error.message || 'Order not found'
    });
  }
};

// @desc    Cancel a pending customer reservation
// @route   PATCH /api/orders/:id/cancel
// @access  Private (CUSTOMER)
const cancelOrder = async (req, res) => {
  try {
    const { reason } = req.body;
    const order = await orderService.cancelCustomerOrder(
      req.user._id,
      req.params.id,
      reason
    );
    return res.status(200).json({
      success: true,
      message: 'Reservation cancelled successfully',
      data: order
    });
  } catch (error) {
    console.error('[OrderController] cancelOrder error:', error.message);
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Unable to cancel reservation'
    });
  }
};

// @desc    Get store orders for Store Owner
// @route   GET /api/orders/store
// @access  Private (STORE_OWNER, ADMIN)
const getStoreOrders = async (req, res) => {
  try {
    const data = await orderService.getStoreOrders(req.user._id, req.query);
    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('[OrderController] getStoreOrders error:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Internal server error while fetching store orders'
    });
  }
};

// @desc    Get single store order for Store Owner
// @route   GET /api/orders/store/:id
// @access  Private (STORE_OWNER, ADMIN)
const getStoreOrderById = async (req, res) => {
  try {
    const order = await orderService.getStoreOrder(req.user._id, req.params.id);
    return res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('[OrderController] getStoreOrderById error:', error.message);
    return res.status(error.statusCode || 404).json({
      success: false,
      message: error.message || 'Store order not found'
    });
  }
};

// @desc    Update store order status (CONFIRMED, COMPLETED, CANCELLED)
// @route   PATCH /api/orders/store/:id/status
// @access  Private (STORE_OWNER, ADMIN)
const updateStoreOrderStatus = async (req, res) => {
  try {
    const { status, reason } = req.body;
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Target status is required'
      });
    }

    const order = await orderService.updateStoreOrderStatus(
      req.user._id,
      req.params.id,
      status,
      reason
    );

    return res.status(200).json({
      success: true,
      message: `Order status updated to ${order.status}`,
      data: order
    });
  } catch (error) {
    console.error('[OrderController] updateStoreOrderStatus error:', error.message);
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Unable to update order status'
    });
  }
};

// @desc    Store Owner accepts incoming order
// @route   POST /api/orders/store/:id/accept or POST /api/orders/:id/accept
// @access  Private (STORE_OWNER, ADMIN)
const acceptOrder = async (req, res) => {
  try {
    const order = await orderService.acceptStoreOrder(req.user._id, req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Order accepted successfully',
      data: order
    });
  } catch (error) {
    console.error('[OrderController] acceptOrder error:', error.message);
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Unable to accept order'
    });
  }
};

// @desc    Store Owner rejects incoming order & initiates refund if paid
// @route   POST /api/orders/store/:id/reject or POST /api/orders/:id/reject
// @access  Private (STORE_OWNER, ADMIN)
const rejectOrder = async (req, res) => {
  try {
    const { reason } = req.body;
    const order = await orderService.rejectStoreOrder(
      req.user._id,
      req.params.id,
      reason || 'Rejected by store owner'
    );
    return res.status(200).json({
      success: true,
      message: 'Order rejected and refund initiated if applicable',
      data: order
    });
  } catch (error) {
    console.error('[OrderController] rejectOrder error:', error.message);
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Unable to reject order'
    });
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  getStoreOrders,
  getStoreOrderById,
  updateStoreOrderStatus,
  acceptOrder,
  rejectOrder
};

