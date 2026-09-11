const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/adminController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// Apply protect and authorizeRoles('ADMIN') to all admin endpoints
router.use(protect, authorizeRoles('ADMIN'));

// Platform Overview Dashboard
router.get('/dashboard', getDashboardStats);

// User Management
router.get('/users', getUsers);
router.get('/users/:id', getUserById);
router.patch('/users/:id/status', updateUserStatus);
router.patch('/users/:id/role', updateUserRole);

// Store Management
router.get('/stores', getStores);
router.get('/stores/:id', getStoreById);
router.patch('/stores/:id/status', updateStoreStatus);

// Product Catalog Overview
router.get('/products', getProducts);

// Inventory Batch Monitoring
router.get('/inventory', getInventory);

// Flash Sales Monitoring & Controls
router.get('/flash-sales', getFlashSales);
router.patch('/flash-sales/:id/status', updateFlashSaleStatus);

// Orders Monitoring
router.get('/orders', getOrders);
router.get('/orders/:id', getOrderById);

// Expiry & Food Waste Reduction
router.get('/expiry-waste', getExpiryWasteMetrics);

// Analytics & Trends
router.get('/analytics', getAnalytics);

// System Health & Background Jobs
router.get('/system-health', getSystemHealth);

// Admin Activity Audit Logs
router.get('/activity-logs', getActivityLogs);

module.exports = router;
