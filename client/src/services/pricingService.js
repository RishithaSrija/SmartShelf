import api from './api';

const pricingService = {
  // Get pricing rules for store owner
  getPricingRules: async () => {
    const response = await api.get('/pricing/rules');
    return response.data;
  },

  // Create a new pricing rule
  createPricingRule: async (ruleData) => {
    const response = await api.post('/pricing/rules', ruleData);
    return response.data;
  },

  // Update an existing pricing rule
  updatePricingRule: async (id, ruleData) => {
    const response = await api.put(`/pricing/rules/${id}`, ruleData);
    return response.data;
  },

  // Toggle active/inactive status of a pricing rule
  updatePricingRuleStatus: async (id, isActive) => {
    const response = await api.patch(`/pricing/rules/${id}/status`, { isActive });
    return response.data;
  },

  // Delete a pricing rule
  deletePricingRule: async (id) => {
    const response = await api.delete(`/pricing/rules/${id}`);
    return response.data;
  },

  // Live Price Preview without touching the database
  previewPrice: async (originalPrice, expiryDate) => {
    const response = await api.post('/pricing/preview', { originalPrice, expiryDate });
    return response.data;
  },

  // Recalculate price for a single inventory batch
  recalculateBatchPrice: async (batchId) => {
    const response = await api.post(`/pricing/recalculate/${batchId}`);
    return response.data;
  },

  // Recalculate prices for ALL inventory batches in owner's store
  recalculateStoreInventory: async () => {
    const response = await api.post('/pricing/recalculate-all');
    return response.data;
  }
};

export default pricingService;
