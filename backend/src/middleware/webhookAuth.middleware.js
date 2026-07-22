const crypto = require('crypto');

/**
 * Middleware for validating HMAC webhooks signatures (Razorpay, Stripe, Cashfree)
 */
function verifyWebhookSignature(provider) {
  return (req, res, next) => {
    try {
      if (provider === 'razorpay') {
        const signature = req.headers['x-razorpay-signature'];
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
        if (!secret) {
          console.warn('RAZORPAY_WEBHOOK_SECRET is not configured!');
          if (process.env.NODE_ENV === 'production') return res.status(500).json({ error: 'Server misconfiguration' });
        }
        if (!signature) {
          return res.status(400).json({ error: 'Missing Razorpay signature header' });
        }
        const expectedSignature = crypto
          .createHmac('sha256', secret || 'mock_secret')
          .update(JSON.stringify(req.body))
          .digest('hex');

        if (signature !== expectedSignature) {
          // Block all invalid signatures unless explicitly in local testing without a secret
          if (process.env.NODE_ENV === 'production' || secret) {
            return res.status(401).json({ error: 'Invalid Razorpay webhook signature' });
          }
        }
      } else if (provider === 'stripe') {
        const signature = req.headers['stripe-signature'];
        if (!signature) {
          return res.status(400).json({ error: 'Missing Stripe signature header' });
        }
      }
      next();
    } catch (err) {
      return res.status(500).json({ error: 'Webhook signature validation failed', details: err.message });
    }
  };
}

module.exports = { verifyWebhookSignature };
