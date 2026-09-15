import api from './api';

const wasteRescueService = {
  // Get public Waste Rescue deals
  getWasteRescueDeals: async (params = {}) => {
    const response = await api.get('/waste-rescue/deals', { params });
    return response.data;
  },

  // Get smart matching recommendations for customer
  getSmartRecommendations: async (params = {}) => {
    const response = await api.get('/waste-rescue/recommendations', { params });
    return response.data;
  },

  // Get store owner inventory health breakdown
  getInventoryHealth: async () => {
    const response = await api.get('/waste-rescue/inventory-health');
    return response.data;
  },

  // Get store owner buyer demand insight
  getBuyerDemand: async () => {
    const response = await api.get('/waste-rescue/buyer-demand');
    return response.data;
  },

  // Update customer shopping mode & smart preferences
  updatePreferences: async (preferenceData) => {
    const response = await api.put('/auth/preferences', preferenceData);
    return response.data;
  }
};

export default wasteRescueService;
