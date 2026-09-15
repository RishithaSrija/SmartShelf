import api from './api';

let razorpayScriptLoadedPromise = null;

/**
 * Dynamically load Razorpay checkout script
 */
export const loadRazorpayScript = () => {
  if (window.Razorpay) {
    return Promise.resolve(true);
  }

  if (razorpayScriptLoadedPromise) {
    return razorpayScriptLoadedPromise;
  }

  razorpayScriptLoadedPromise = new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.error('[PaymentService] Failed to load Razorpay SDK');
      resolve(false);
    };
    document.body.appendChild(script);
  });

  return razorpayScriptLoadedPromise;
};

const paymentService = {
  // Get public Razorpay Key ID
  getRazorpayKey: async () => {
    try {
      const response = await api.get('/payments/razorpay/key');
      return response.data?.data?.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID || '';
    } catch (err) {
      return import.meta.env.VITE_RAZORPAY_KEY_ID || '';
    }
  },

  // Create Razorpay order on backend
  createPaymentOrder: async (paymentData) => {
    const response = await api.post('/payments/razorpay/order', paymentData);
    return response.data;
  },

  // Verify Razorpay payment signature
  verifyPayment: async (verificationData) => {
    const response = await api.post('/payments/razorpay/verify', verificationData);
    return response.data;
  },

  // Get payment details
  getPaymentDetails: async (orderId) => {
    const response = await api.get(`/payments/${orderId}`);
    return response.data;
  },

  // Get active payment provider configuration (Demo vs Live)
  getPaymentProvider: async () => {
    try {
      const response = await api.get('/payments/provider');
      return response.data?.data || { provider: 'DEMO', isDemo: true };
    } catch (err) {
      return { provider: 'DEMO', isDemo: true };
    }
  },

  // Simulate successful demo payment
  simulateDemoSuccess: async ({ orderId, method = 'UPI' }) => {
    const response = await api.post('/payments/demo/simulate-success', { orderId, method });
    return response.data;
  },

  // Simulate failed demo payment
  simulateDemoFailure: async ({ orderId, reason = 'User simulated payment failure' }) => {
    const response = await api.post('/payments/demo/simulate-failure', { orderId, reason });
    return response.data;
  }
};

export default paymentService;
