import api from './api';

const orderService = {
  // Customer: Create a new flash sale reservation
  createOrder: async (orderData) => {
    const response = await api.post('/orders', orderData);
    return response.data;
  },

  // Customer: Get my orders history
  getMyOrders: async (params = {}) => {
    const response = await api.get('/orders/my-orders', { params });
    return response.data;
  },

  // Customer / Admin: Get single order details
  getOrderById: async (id) => {
    const response = await api.get(`/orders/${id}`);
    return response.data;
  },

  // Customer: Cancel pending reservation
  cancelOrder: async (id, reason = '') => {
    const response = await api.patch(`/orders/${id}/cancel`, { reason });
    return response.data;
  },

  // Store Owner: Get all orders for store
  getStoreOrders: async (params = {}) => {
    const response = await api.get('/orders/store', { params });
    return response.data;
  },

  // Store Owner: Get single store order details
  getStoreOrderById: async (id) => {
    const response = await api.get(`/orders/store/${id}`);
    return response.data;
  },

  // Store Owner: Update store order status (CONFIRMED, COMPLETED, CANCELLED)
  updateStoreOrderStatus: async (id, status, reason = '') => {
    const response = await api.patch(`/orders/store/${id}/status`, { status, reason });
    return response.data;
  },

  // Store Owner: Accept incoming paid/reserved order
  acceptOrder: async (id) => {
    const response = await api.post(`/orders/store/${id}/accept`);
    return response.data;
  },

  // Store Owner: Reject incoming order & initiate refund
  rejectOrder: async (id, reason = '') => {
    const response = await api.post(`/orders/store/${id}/reject`, { reason });
    return response.data;
  },

  // Customer / Store Owner: Get payment and refund reconciliation details
  getPaymentDetails: async (id) => {
    const response = await api.get(`/orders/${id}/payment`);
    return response.data;
  }
};

export default orderService;
