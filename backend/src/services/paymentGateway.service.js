const logger = require('../config/logger');

let razorpayInstance = null;
let stripeInstance = null;

// Initialize Razorpay SDK if keys exist
try {
  const Razorpay = require('razorpay');
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    logger.info('✅ Razorpay Payment SDK initialized');
  } else {
    logger.info('ℹ️ Razorpay keys not provided. Payment gateway running in Sandbox Mode.');
  }
} catch (err) {
  logger.warn('⚠️ Razorpay SDK load warning:', err.message);
}

// Initialize Stripe SDK if keys exist
try {
  const Stripe = require('stripe');
  if (process.env.STRIPE_SECRET_KEY) {
    stripeInstance = Stripe(process.env.STRIPE_SECRET_KEY);
    logger.info('✅ Stripe Payment SDK initialized');
  } else {
    logger.info('ℹ️ Stripe secret key not provided. Stripe gateway running in Sandbox Mode.');
  }
} catch (err) {
  logger.warn('⚠️ Stripe SDK load warning:', err.message);
}

/**
 * Unified Payment Service
 */
const PaymentService = {
  /**
   * Create Razorpay Order
   */
  async createRazorpayOrder(amountInINR, currency = 'INR', receipt = `rcpt_${Date.now()}`) {
    const amountInPaise = Math.round(amountInINR * 100);

    if (razorpayInstance) {
      try {
        const order = await razorpayInstance.orders.create({
          amount: amountInPaise,
          currency,
          receipt,
          payment_capture: 1,
        });
        return { success: true, orderId: order.id, amount: order.amount, currency: order.currency, mode: 'live' };
      } catch (error) {
        logger.error('Razorpay Order Creation Failed:', error.message);
        throw error;
      }
    }

    // Sandbox Auto-Fallback
    const mockOrderId = `order_sim_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    logger.info(`[PaymentSandbox] Created simulated Razorpay order ${mockOrderId} for ₹${amountInINR}`);
    return {
      success: true,
      orderId: mockOrderId,
      amount: amountInPaise,
      currency,
      mode: 'sandbox',
      key: 'rzp_test_sandbox_key_12345'
    };
  },

  /**
   * Verify Razorpay Payment Signature
   */
  verifyRazorpaySignature(orderId, paymentId, signature) {
    if (orderId.startsWith('order_sim_')) {
      logger.info(`[PaymentSandbox] Verified simulated Razorpay payment ${paymentId}`);
      return true;
    }

    if (!process.env.RAZORPAY_KEY_SECRET) return false;

    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    return expectedSignature === signature;
  },

  /**
   * Create Stripe Payment Intent
   */
  async createStripePaymentIntent(amountInINR, currency = 'inr', metadata = {}) {
    const amountInCents = Math.round(amountInINR * 100);

    if (stripeInstance) {
      try {
        const paymentIntent = await stripeInstance.paymentIntents.create({
          amount: amountInCents,
          currency,
          metadata,
        });
        return { success: true, clientSecret: paymentIntent.client_secret, intentId: paymentIntent.id, mode: 'live' };
      } catch (error) {
        logger.error('Stripe PaymentIntent Creation Failed:', error.message);
        throw error;
      }
    }

    // Sandbox Auto-Fallback
    const mockClientSecret = `pi_sim_${Date.now()}_secret_${Math.random().toString(36).substring(7)}`;
    logger.info(`[PaymentSandbox] Created simulated Stripe PaymentIntent for ₹${amountInINR}`);
    return {
      success: true,
      clientSecret: mockClientSecret,
      intentId: `pi_sim_${Date.now()}`,
      mode: 'sandbox'
    };
  }
};

module.exports = PaymentService;
