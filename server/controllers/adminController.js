const adminService = require('../services/adminService');

// @desc    Get Admin platform overview stats
// @route   GET /api/admin/dashboard
// @access  Private (ADMIN)
const getDashboardStats = async (req, res) => {
  try {
    const data = await adminService.getDashboardStats();
    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('[AdminController] getDashboardStats error:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Error fetching dashboard stats'
    });
  }
};

// @desc    Get all users (with search, role, status filters, pagination)
// @route   GET /api/admin/users
// @access  Private (ADMIN)
const getUsers = async (req, res) => {
  try {
    const data = await adminService.getUsers(req.query);
    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('[AdminController] getUsers error:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Error fetching users'
    });
  }
};

// @desc    Get user by ID
// @route   GET /api/admin/users/:id
// @access  Private (ADMIN)
const getUserById = async (req, res) => {
  try {
    const user = await adminService.getUserById(req.params.id);
    return res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('[AdminController] getUserById error:', error.message);
    return res.status(error.statusCode || 404).json({
      success: false,
      message: error.message || 'User not found'
    });
  }
};

// @desc    Activate or deactivate user
// @route   PATCH /api/admin/users/:id/status
// @access  Private (ADMIN)
const updateUserStatus = async (req, res) => {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive boolean flag is required'
      });
    }

    const user = await adminService.updateUserStatus(req.user._id, req.params.id, isActive);
    return res.status(200).json({
      success: true,
      message: `User ${user.name} is now ${isActive ? 'ACTIVE' : 'DEACTIVATED'}`,
      data: user
    });
  } catch (error) {
    console.error('[AdminController] updateUserStatus error:', error.message);
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Error updating user status'
    });
  }
};

// @desc    Change user role (CUSTOMER, STORE_OWNER, ADMIN)
// @route   PATCH /api/admin/users/:id/role
// @access  Private (ADMIN)
const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!role) {
      return res.status(400).json({
        success: false,
        message: 'New role is required'
      });
    }

    const user = await adminService.updateUserRole(req.user._id, req.params.id, role);
    return res.status(200).json({
      success: true,
      message: `User role changed to ${user.role}`,
      data: user
    });
  } catch (error) {
    console.error('[AdminController] updateUserRole error:', error.message);
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Error updating user role'
    });
  }
};

// @desc    Get all stores
// @route   GET /api/admin/stores
// @access  Private (ADMIN)
const getStores = async (req, res) => {
  try {
    const data = await adminService.getStores(req.query);
    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('[AdminController] getStores error:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Error fetching stores'
    });
  }
};

// @desc    Get store by ID
// @route   GET /api/admin/stores/:id
// @access  Private (ADMIN)
const getStoreById = async (req, res) => {
  try {
    const store = await adminService.getStoreById(req.params.id);
    return res.status(200).json({
      success: true,
      data: store
    });
  } catch (error) {
    console.error('[AdminController] getStoreById error:', error.message);
    return res.status(error.statusCode || 404).json({
      success: false,
      message: error.message || 'Store not found'
    });
  }
};

// @desc    Activate or deactivate store
// @route   PATCH /api/admin/stores/:id/status
// @access  Private (ADMIN)
const updateStoreStatus = async (req, res) => {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive boolean flag is required'
      });
    }

    const store = await adminService.updateStoreStatus(req.user._id, req.params.id, isActive);
    return res.status(200).json({
      success: true,
      message: `Store ${store.name} is now ${isActive ? 'ACTIVE' : 'DEACTIVATED'}`,
      data: store
    });
  } catch (error) {
    console.error('[AdminController] updateStoreStatus error:', error.message);
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Error updating store status'
    });
  }
};

// @desc    Get platform-wide products
// @route   GET /api/admin/products
// @access  Private (ADMIN)
const getProducts = async (req, res) => {
  try {
    const data = await adminService.getProducts(req.query);
    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('[AdminController] getProducts error:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Error fetching products'
    });
  }
};

// @desc    Get platform-wide inventory batches
// @route   GET /api/admin/inventory
// @access  Private (ADMIN)
const getInventory = async (req, res) => {
  try {
    const data = await adminService.getInventory(req.query);
    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('[AdminController] getInventory error:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Error fetching inventory'
    });
  }
};

// @desc    Get platform-wide flash sales
// @route   GET /api/admin/flash-sales
// @access  Private (ADMIN)
const getFlashSales = async (req, res) => {
  try {
    const data = await adminService.getFlashSales(req.query);
    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('[AdminController] getFlashSales error:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Error fetching flash sales'
    });
  }
};

// @desc    Admin update flash sale status (PAUSE, CANCEL, RESUME)
// @route   PATCH /api/admin/flash-sales/:id/status
// @access  Private (ADMIN)
const updateFlashSaleStatus = async (req, res) => {
  try {
    const { action } = req.body;
    if (!action) {
      return res.status(400).json({
        success: false,
        message: 'Action (PAUSE, CANCEL, RESUME) is required'
      });
    }

    const sale = await adminService.updateFlashSaleStatus(req.user._id, req.params.id, action);
    return res.status(200).json({
      success: true,
      message: `Flash sale ${action} completed successfully`,
      data: sale
    });
  } catch (error) {
    console.error('[AdminController] updateFlashSaleStatus error:', error.message);
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Error updating flash sale'
    });
  }
};

// @desc    Get platform-wide orders
// @route   GET /api/admin/orders
// @access  Private (ADMIN)
const getOrders = async (req, res) => {
  try {
    const data = await adminService.getOrders(req.query);
    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('[AdminController] getOrders error:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Error fetching orders'
    });
  }
};

// @desc    Get order details by ID
// @route   GET /api/admin/orders/:id
// @access  Private (ADMIN)
const getOrderById = async (req, res) => {
  try {
    const order = await adminService.getOrderById(req.params.id);
    return res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('[AdminController] getOrderById error:', error.message);
    return res.status(error.statusCode || 404).json({
      success: false,
      message: error.message || 'Order not found'
    });
  }
};

// @desc    Get expiry and food waste prevention metrics
// @route   GET /api/admin/expiry-waste
// @access  Private (ADMIN)
const getExpiryWasteMetrics = async (req, res) => {
  try {
    const data = await adminService.getExpiryWasteMetrics();
    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('[AdminController] getExpiryWasteMetrics error:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Error fetching waste metrics'
    });
  }
};

// @desc    Get platform analytics (7d, 30d, 90d)
// @route   GET /api/admin/analytics
// @access  Private (ADMIN)
const getAnalytics = async (req, res) => {
  try {
    const data = await adminService.getAnalytics(req.query.timeRange);
    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('[AdminController] getAnalytics error:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Error fetching analytics'
    });
  }
};

// @desc    Get detailed system health & background jobs overview
// @route   GET /api/admin/system-health
// @access  Private (ADMIN)
const getSystemHealth = async (req, res) => {
  try {
    const data = await adminService.getSystemHealth();
    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('[AdminController] getSystemHealth error:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Error fetching system health'
    });
  }
};

// @desc    Get admin activity audit logs
// @route   GET /api/admin/activity-logs
// @access  Private (ADMIN)
const getActivityLogs = async (req, res) => {
  try {
    const data = await adminService.getActivityLogs(req.query);
    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('[AdminController] getActivityLogs error:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Error fetching activity logs'
    });
  }
};

module.exports = {
  getDashboardStats,
  getUsers,
  getUserById,
  updateUserStatus,
  updateUserRole,
  getStores,
  getStoreById,
  updateStoreStatus,
  getProducts,
  getInventory,
  getFlashSales,
  updateFlashSaleStatus,
  getOrders,
  getOrderById,
  getExpiryWasteMetrics,
  getAnalytics,
  getSystemHealth,
  getActivityLogs
};
