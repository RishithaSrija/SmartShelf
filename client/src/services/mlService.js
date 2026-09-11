import api from './api';

const mlService = {
  /**
   * Get demand prediction for a specific product and date
   */
  getDemandPrediction: async (productId, date) => {
    const params = date ? { date } : {};
    const res = await api.get(`/ml/demand/${productId}`, { params });
    return res.data;
  },

  /**
   * Get historical prediction logs for the authenticated store owner
   */
  getPredictionHistory: async (queryParams = {}) => {
    const res = await api.get('/ml/predictions', { params: queryParams });
    return res.data;
  },

  /**
   * Get ML Microservice diagnostic status for Admin
   */
  getMLStatus: async () => {
    const res = await api.get('/ml/status');
    return res.data;
  }
};

export default mlService;
