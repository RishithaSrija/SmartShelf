import api from './api';

const flashSaleService = {
  // Public marketplace flash sales query
  getPublicFlashSales: async (params = {}) => {
    const response = await api.get('/flash-sales', { params });
    return response.data;
  },

  // Public single flash sale deal details
  getFlashSaleById: async (id) => {
    const response = await api.get(`/flash-sales/${id}`);
    return response.data;
  },

  // Get eligible inventory batches for store owner
  getEligibleBatches: async () => {
    const response = await api.get('/flash-sales/eligible-batches');
    return response.data;
  },

  // Get store owner flash sales list
  getStoreFlashSales: async (params = {}) => {
    const response = await api.get('/flash-sales', {
      params: { ...params, mode: 'owner' }
    });
    return response.data;
  },

  // Create & Publish new Flash Sale
  createFlashSale: async (saleData) => {
    const response = await api.post('/flash-sales', saleData);
    return response.data;
  },

  // Update existing Flash Sale details
  updateFlashSale: async (id, saleData) => {
    const response = await api.put(`/flash-sales/${id}`, saleData);
    return response.data;
  },

  // Toggle Flash Sale status (ACTIVE / PAUSED / CANCELLED)
  updateFlashSaleStatus: async (id, status) => {
    const response = await api.patch(`/flash-sales/${id}/status`, { status });
    return response.data;
  },

  // Delete Flash Sale
  deleteFlashSale: async (id) => {
    const response = await api.delete(`/flash-sales/${id}`);
    return response.data;
  }
};

export default flashSaleService;
