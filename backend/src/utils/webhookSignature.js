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
    // Only a process that says it is development or test may skip the check.
    // The condition was `=== 'production'`, so staging — or any deployment
    // that never set NODE_ENV — accepted unsigned callbacks that mark orders
    // paid. An unknown environment is treated as one that matters.
    if (!['development', 'test'].includes(process.env.NODE_ENV)) {
      return `${providerName} webhook secret is not configured; refusing unverified callback`;
    }
    console.warn(`[webhook] ${providerName}: no secret configured — signature NOT verified (development only)`);
    return null;
  }
  if (!signature) return `${providerName} webhook missing signature header`;
  if (!verifyHmacSha256(payload, signature, secret, encoding)) {
    return `${providerName} webhook signature mismatch`;
  }
  return null;
}

/**
 * The request body exactly as the provider sent it, as a string.
 *
 * The app-level JSON parser runs before any route and consumes the stream, so
 * a route's own express.raw() never sees a Buffer; server.js keeps the
 * original bytes on req.rawBody for webhook paths instead. A Buffer in
 * req.body is still honoured, for a router mounted without that parser (the
 * tests do this). What must never be signed-over is a parsed object: it turns
 * into "[object Object]", or into re-serialised JSON whose bytes are not the
 * ones that were signed.
 *
 * Returns null when no faithful copy of the body is available.
 */
function rawBodyOf(req) {
  if (Buffer.isBuffer(req.rawBody)) return req.rawBody.toString('utf8');
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
  if (typeof req.body === 'string') return req.body;
  return null;
}

module.exports = { safeCompare, verifyHmacSha256, webhookGuard, rawBodyOf };
