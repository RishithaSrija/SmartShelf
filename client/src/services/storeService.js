import api from './api';

const storeService = {
  // Get store owned by current logged-in user
  getMyStore: async () => {
    const response = await api.get('/stores/mystore');
    return response.data;
  },

  // Create a new store
  createStore: async (storeData) => {
    const response = await api.post('/stores', storeData);
    return response.data;
  },

  // Update existing store details
  updateStore: async (storeData) => {
    const response = await api.put('/stores/mystore', storeData);
    return response.data;
  },

  // Toggle store active/inactive status
  toggleStoreStatus: async () => {
    const response = await api.patch('/stores/mystore/status');
    return response.data;
  },

  // Get store by ID (public)
  getStoreById: async (id) => {
    const response = await api.get(`/stores/${id}`);
    return response.data;
  }
};

export default storeService;
