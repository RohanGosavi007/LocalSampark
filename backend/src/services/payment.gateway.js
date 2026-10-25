const crypto = require('crypto');

/**
 * Webhook signature verification for the billing webhook (saas.routes.js).
 *
 * This class also had createPaymentOrder(), described as a "unified payment
 * gateway engine" for Razorpay, Cashfree and UPI. It contacted none of them:
 * the Razorpay branch returned an order id made from random bytes, the
 * Cashfree branch a made-up session id, and the UPI branch a link paying a
 * hard-coded VPA. Nothing called it. Taking a payment is
 * services/payments.service.js; talking to Razorpay is
 * services/razorpay.service.js.
 */
class PaymentGatewayEngine {
  /**
   * Webhook signature validator.
   *
   * Two bypasses used to live here, and both were reachable from unauthenticated
   * routes that mark orders paid (POST /payments/webhook/:provider,
   * POST /saas/webhook/billing):
   *
   *   1. `secret || 'mocksecret'` — with PAYMENT_WEBHOOK_SECRET unset, which is
   *      the deployed state (render.yaml never declared it), the HMAC key was a
   *      literal string published in this file. Anyone reading the repo could
   *      compute a valid signature. saas.routes.js had the same problem with its
   *      own 'webhook_secret' default.
   *   2. `return true` for every non-Razorpay provider — so the Cashfree webhook
   *      accepted any payload with any signature, or none at all.
   *
   * Both now fail closed. A provider with no implemented verifier is rejected
   * rather than trusted, and a missing secret is rejected rather than defaulted.
   *
   * @param {string} provider  'razorpay' | 'cashfree'
   * @param {string|Buffer} payload  the RAW request body, exactly as received
   * @param {string} signature  the provider's signature header
   * @param {string} secret  the shared webhook secret
   * @param {{ timestamp?: string }} [opts]  Cashfree signs timestamp + body
   */
  static verifyWebhookSignature(provider, payload, signature, secret, opts = {}) {
    if (!signature || typeof signature !== 'string') {
      console.error('[PaymentGateway] webhook rejected: missing signature');
      return false;
    }
    if (!secret) {
      console.error(
        `[PaymentGateway] webhook rejected: no secret configured for ${provider}. ` +
        'Set PAYMENT_WEBHOOK_SECRET (and SAAS_WEBHOOK_SECRET for billing).'
      );
      return false;
    }

    const raw = Buffer.isBuffer(payload)
      ? payload.toString('utf8')
      : (typeof payload === 'string' ? payload : JSON.stringify(payload));

    let expected;
    switch (String(provider).toLowerCase()) {
      case 'razorpay':
        // Razorpay signs the raw body and sends lowercase hex.
        expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
        break;

      case 'cashfree': {
        // Cashfree signs (x-webhook-timestamp + rawBody) and sends base64.
        // Without the timestamp the signature cannot be reconstructed, so the
        // delivery is rejected rather than waved through.
        const timestamp = opts.timestamp;
        if (!timestamp) {
          console.error('[PaymentGateway] cashfree webhook rejected: missing x-webhook-timestamp');
          return false;
        }
        expected = crypto.createHmac('sha256', secret).update(`${timestamp}${raw}`).digest('base64');
        break;
      }

      default:
        console.error(`[PaymentGateway] webhook rejected: no verifier for provider '${provider}'`);
        return false;
    }

    return PaymentGatewayEngine.safeEqual(expected, signature);
  }

  /**
   * Length-checked, constant-time comparison. timingSafeEqual throws on a length
   * mismatch, so the lengths are compared first — that leak is the signature
   * length, which is fixed per algorithm and therefore not secret.
   */
  static safeEqual(a, b) {
    const bufA = Buffer.from(String(a));
    const bufB = Buffer.from(String(b));
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  }
}

module.exports = PaymentGatewayEngine;
