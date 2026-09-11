import api from './api';

const inventoryService = {
  // Get inventory statistics summary
  getInventorySummary: async () => {
    const response = await api.get('/inventory/summary');
    return response.data;
  },

  // Get list of batches with filters
  getBatches: async (params = {}) => {
    const response = await api.get('/inventory/batches', { params });
    return response.data;
  },

  // Get expiring soon batches
  getExpiringBatches: async (params = {}) => {
    const response = await api.get('/inventory/batches/expiring', { params });
    return response.data;
  },

  // Get single batch details
  getBatchById: async (id) => {
    const response = await api.get(`/inventory/batches/${id}`);
    return response.data;
  },

  // Create new inventory batch
  createBatch: async (batchData) => {
    const response = await api.post('/inventory/batches', batchData);
    return response.data;
  },

  // Update existing batch
  updateBatch: async (id, batchData) => {
    const response = await api.put(`/inventory/batches/${id}`, batchData);
    return response.data;
  },

  // Update stock quantity
  updateQuantity: async (id, quantity) => {
    const response = await api.patch(`/inventory/batches/${id}/quantity`, { quantity });
    return response.data;
  },

  // Update status
  updateStatus: async (id, status) => {
    const response = await api.patch(`/inventory/batches/${id}/status`, { status });
    return response.data;
  },

  // Delete batch
  deleteBatch: async (id) => {
    const response = await api.delete(`/inventory/batches/${id}`);
    return response.data;
  }
};

export default inventoryService;
