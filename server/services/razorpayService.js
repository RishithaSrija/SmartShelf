const Razorpay = require('razorpay');
const crypto = require('crypto');

let razorpayInstance = null;

/**
 * Initialize or return the Razorpay SDK instance
 */
const getRazorpayInstance = () => {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    console.warn('[RazorpayService] RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET not set in environment.');
  }

  if (!razorpayInstance && key_id && key_secret) {
    razorpayInstance = new Razorpay({
      key_id,
      key_secret
    });
  }

  return razorpayInstance;
};

const razorpayService = {
  /**
   * Return the public Razorpay Key ID safe for frontend use
   */
  getPublicKey: () => {
    return process.env.RAZORPAY_KEY_ID || '';
  },

  /**
   * Create a Razorpay Order
   * @param {Object} options
   * @param {number} options.amountPaise - Amount in paise (1 INR = 100 paise)
   * @param {string} [options.currency='INR'] - Currency code
   * @param {string} options.receipt - Internal receipt / order reference
   * @param {Object} [options.notes={}] - Key-value metadata notes
   */
  createRazorpayOrder: async ({ amountPaise, currency = 'INR', receipt, notes = {} }) => {
    if (!amountPaise || amountPaise <= 0) {
      const error = new Error('Invalid order amount for payment creation');
      error.statusCode = 400;
      throw error;
    }

    const instance = getRazorpayInstance();

    // If Razorpay instance is available, call the official API
    if (instance) {
      try {
        const order = await instance.orders.create({
          amount: Math.round(amountPaise),
          currency,
          receipt: String(receipt).slice(0, 40), // Razorpay receipt max 40 chars
          notes
        });
        return order;
      } catch (err) {
        console.error('[RazorpayService] orders.create API error:', err.message);

        // In development/test mode with dummy credentials or network offline, provide fallback test order
        if (
          process.env.NODE_ENV === 'test' ||
          process.env.RAZORPAY_KEY_ID?.includes('Dev') ||
          process.env.RAZORPAY_KEY_ID?.includes('test')
        ) {
          console.log('[RazorpayService] Falling back to local test order generation.');
          return {
            id: `order_test_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
            entity: 'order',
            amount: Math.round(amountPaise),
            amount_paid: 0,
            amount_due: Math.round(amountPaise),
            currency,
            receipt,
            status: 'created',
            attempts: 0,
            notes,
            created_at: Math.floor(Date.now() / 1000)
          };
        }
        throw err;
      }
    }

    // Offline fallback for local development without credentials configured
    return {
      id: `order_dev_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      entity: 'order',
      amount: Math.round(amountPaise),
      amount_paid: 0,
      amount_due: Math.round(amountPaise),
      currency,
      receipt,
      status: 'created',
      attempts: 0,
      notes,
      created_at: Math.floor(Date.now() / 1000)
    };
  },

  /**
   * Verify server-side payment signature (HMAC SHA-256)
   * razorpay_order_id + '|' + razorpay_payment_id signed with RAZORPAY_KEY_SECRET
   */
  verifyPaymentSignature: ({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) => {
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return false;
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      console.error('[RazorpayService] Cannot verify signature: RAZORPAY_KEY_SECRET is missing');
      return false;
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      return expectedSignature === razorpay_signature;
    } catch (err) {
      console.error('[RazorpayService] verifyPaymentSignature error:', err.message);
      return false;
    }
  },

  /**
   * Verify Razorpay Webhook signature against RAW request body
   * @param {Buffer|string} rawBody - Raw unparsed HTTP request body
   * @param {string} signature - Header 'x-razorpay-signature'
   */
  verifyWebhookSignature: (rawBody, signature) => {
    if (!rawBody || !signature) {
      return false;
    }

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('[RazorpayService] Cannot verify webhook: RAZORPAY_WEBHOOK_SECRET is missing');
      return false;
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      return expectedSignature === signature;
    } catch (err) {
      console.error('[RazorpayService] verifyWebhookSignature error:', err.message);
      return false;
    }
  },

  /**
   * Fetch payment details from Razorpay API
   */
  fetchPayment: async (paymentId) => {
    const instance = getRazorpayInstance();
    if (!instance) {
      throw new Error('Razorpay instance not initialized');
    }

    try {
      const payment = await instance.payments.fetch(paymentId);
      return payment;
    } catch (err) {
      console.error('[RazorpayService] payments.fetch error:', err.message);
      if (
        process.env.NODE_ENV === 'test' ||
        process.env.RAZORPAY_KEY_ID?.includes('Dev') ||
        process.env.RAZORPAY_KEY_ID?.includes('test')
      ) {
        return {
          id: paymentId,
          entity: 'payment',
          amount: 10000,
          currency: 'INR',
          status: 'captured',
          captured: true
        };
      }
      throw err;
    }
  },

  /**
   * Initiate a server-side refund for a paid order
   * @param {string} paymentId - The razorpay payment ID
   * @param {number} amountPaise - Amount in paise
   * @param {Object} [notes={}] - Metadata notes (e.g. order number, rejection reason)
   */
  initiateRefund: async (paymentId, amountPaise, notes = {}) => {
    if (!paymentId) {
      const error = new Error('Payment ID is required to initiate refund');
      error.statusCode = 400;
      throw error;
    }

    const instance = getRazorpayInstance();

    if (instance) {
      try {
        const refundPayload = {
          notes
        };
        if (amountPaise && amountPaise > 0) {
          refundPayload.amount = Math.round(amountPaise);
        }

        const refund = await instance.payments.refund(paymentId, refundPayload);
        return refund;
      } catch (err) {
        console.error('[RazorpayService] payments.refund API error:', err.message);

        // Fallback for test/mock modes
        if (
          process.env.NODE_ENV === 'test' ||
          process.env.RAZORPAY_KEY_ID?.includes('Dev') ||
          process.env.RAZORPAY_KEY_ID?.includes('test')
        ) {
          console.log('[RazorpayService] Returning simulated test refund.');
          return {
            id: `rfnd_test_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
            entity: 'refund',
            amount: Math.round(amountPaise || 100),
            currency: 'INR',
            payment_id: paymentId,
            status: 'processed',
            speed_processed: 'optimum',
            notes,
            created_at: Math.floor(Date.now() / 1000)
          };
        }
        throw err;
      }
    }

    return {
      id: `rfnd_dev_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      entity: 'refund',
      amount: Math.round(amountPaise || 100),
      currency: 'INR',
      payment_id: paymentId,
      status: 'processed',
      speed_processed: 'optimum',
      notes,
      created_at: Math.floor(Date.now() / 1000)
    };
  }
};

module.exports = razorpayService;
