/**
 * Webhook signature verification.
 *
 * Two problems this exists to fix:
 *
 * 1. Comparisons were plain `===` / `!==` on HMAC digests. String equality
 *    short-circuits on the first differing byte, which leaks how much of a
 *    candidate signature was correct. timingSafeEqual does not.
 *
 * 2. Verification was skipped entirely when the secret was unset — Stripe fell
 *    through to a bare JSON.parse and Razorpay skipped its check, so a
 *    misconfigured production environment silently accepted unsigned webhooks
 *    that mutate payment state. Verification now fails closed.
 */
const crypto = require('crypto');

/**
 * Constant-time compare of two signatures.
 *
 * Length is compared first and separately: timingSafeEqual throws on a length
 * mismatch, and length is not the secret here, so this leaks nothing useful.
 */
function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  try {
    return crypto.timingSafeEqual(bufA, bufB);
  } catch (_e) {
    return false;
  }
}

/**
 * Verify an HMAC-SHA256 signature over a raw payload.
 *
 * @param {string|Buffer} payload  Raw body exactly as received.
 * @param {string} signature       Signature from the provider's header.
 * @param {string} secret          Shared secret.
 * @param {'hex'|'base64'} encoding Digest encoding the provider uses.
 */
function verifyHmacSha256(payload, signature, secret, encoding = 'hex') {
  if (!secret || !signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest(encoding);
  return safeCompare(expected, signature);
}

/**
 * Guard for a webhook whose secret may not be configured.
 *
 * Returns a reason string when the request must be rejected, or null when it
 * may proceed. Outside development an unconfigured secret is itself a rejection:
 * accepting unverified payment callbacks is strictly worse than refusing them.
 */
function webhookGuard({ secret, signature, payload, encoding = 'hex', providerName }) {
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      return `${providerName} webhook secret is not configured; refusing unverified callback`;
    }
    // Non-production keeps local testing workable, but says so loudly.
    console.warn(`[webhook] ${providerName}: no secret configured — signature NOT verified (non-production only)`);
    return null;
  }
  if (!signature) return `${providerName} webhook missing signature header`;
  if (!verifyHmacSha256(payload, signature, secret, encoding)) {
    return `${providerName} webhook signature mismatch`;
  }
  return null;
}

module.exports = { safeCompare, verifyHmacSha256, webhookGuard };
