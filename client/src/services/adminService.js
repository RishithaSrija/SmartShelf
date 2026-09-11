import api from './api';

const adminService = {
  // Platform Overview Dashboard Stats
  getDashboardStats: async () => {
    const response = await api.get('/admin/dashboard');
    return response.data;
  },

  // User Management
  getUsers: async (params = {}) => {
    const response = await api.get('/admin/users', { params });
    return response.data;
  },

  getUserById: async (id) => {
    const response = await api.get(`/admin/users/${id}`);
    return response.data;
  },

  updateUserStatus: async (id, isActive) => {
    const response = await api.patch(`/admin/users/${id}/status`, { isActive });
    return response.data;
  },

  updateUserRole: async (id, role) => {
    const response = await api.patch(`/admin/users/${id}/role`, { role });
    return response.data;
  },

  // Store Management
  getStores: async (params = {}) => {
    const response = await api.get('/admin/stores', { params });
    return response.data;
  },

  getStoreById: async (id) => {
    const response = await api.get(`/admin/stores/${id}`);
    return response.data;
  },

  updateStoreStatus: async (id, isActive) => {
    const response = await api.patch(`/admin/stores/${id}/status`, { isActive });
    return response.data;
  },

  // Products Overview
  getProducts: async (params = {}) => {
    const response = await api.get('/admin/products', { params });
    return response.data;
  },

  // Inventory Overview
  getInventory: async (params = {}) => {
    const response = await api.get('/admin/inventory', { params });
    return response.data;
  },

  // Flash Sales Monitoring
  getFlashSales: async (params = {}) => {
    const response = await api.get('/admin/flash-sales', { params });
    return response.data;
  },

  updateFlashSaleStatus: async (id, action) => {
    const response = await api.patch(`/admin/flash-sales/${id}/status`, { action });
    return response.data;
  },

  // Orders Monitoring
  getOrders: async (params = {}) => {
    const response = await api.get('/admin/orders', { params });
    return response.data;
  },

  getOrderById: async (id) => {
    const response = await api.get(`/admin/orders/${id}`);
    return response.data;
  },

  // Expiry & Food Waste Reduction
  getExpiryWasteMetrics: async () => {
    const response = await api.get('/admin/expiry-waste');
    return response.data;
  },

  // Analytics & Trends
  getAnalytics: async (timeRange = '30d') => {
    const response = await api.get('/admin/analytics', { params: { timeRange } });
    return response.data;
  },

  // System Health & Background Jobs
  getSystemHealth: async () => {
    const response = await api.get('/admin/system-health');
    return response.data;
  },

  // Admin Activity Audit Logs
  getActivityLogs: async (params = {}) => {
    const response = await api.get('/admin/activity-logs', { params });
    return response.data;
  }
};

export default adminService;
