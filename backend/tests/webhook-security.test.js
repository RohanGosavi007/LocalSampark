/**
 * Webhook and payment signature security.
 *
 * Each test here corresponds to a hole found in the pre-launch audit. They are
 * written as the attack, so a regression fails loudly rather than quietly
 * reopening a payment-forgery path.
 */
const crypto = require('crypto');
const { safeCompare, verifyHmacSha256, webhookGuard } = require('../src/utils/webhookSignature');

const SECRET = 'test_webhook_secret';
const sign = (payload, secret = SECRET, enc = 'hex') =>
  crypto.createHmac('sha256', secret).update(payload).digest(enc);

describe('safeCompare', () => {
  it('accepts identical strings', () => {
    expect(safeCompare('abc123', 'abc123')).toBe(true);
  });

  it('rejects differing strings of equal length', () => {
    expect(safeCompare('abc123', 'abc124')).toBe(false);
  });

  it('rejects differing lengths without throwing', () => {
    // crypto.timingSafeEqual throws on length mismatch; this must not propagate.
    expect(() => safeCompare('short', 'muchlonger')).not.toThrow();
    expect(safeCompare('short', 'muchlonger')).toBe(false);
  });

  it('rejects non-string input rather than coercing', () => {
    expect(safeCompare(undefined, 'x')).toBe(false);
    expect(safeCompare(null, null)).toBe(false);
    expect(safeCompare({}, {})).toBe(false);
  });

  it('rejects empty against non-empty', () => {
    expect(safeCompare('', 'abc')).toBe(false);
  });
});

describe('verifyHmacSha256', () => {
  const body = JSON.stringify({ event: 'payment.captured', amount: 50000 });

  it('accepts a correctly signed payload', () => {
    expect(verifyHmacSha256(body, sign(body), SECRET)).toBe(true);
  });

  it('rejects a payload signed with the wrong secret', () => {
    expect(verifyHmacSha256(body, sign(body, 'attacker_secret'), SECRET)).toBe(false);
  });

  it('rejects a tampered payload carrying a valid signature for the original', () => {
    const goodSig = sign(body);
    const tampered = JSON.stringify({ event: 'payment.captured', amount: 999999 });
    expect(verifyHmacSha256(tampered, goodSig, SECRET)).toBe(false);
  });

  it('rejects when the signature is absent', () => {
    expect(verifyHmacSha256(body, undefined, SECRET)).toBe(false);
    expect(verifyHmacSha256(body, '', SECRET)).toBe(false);
  });

  it('rejects when the secret is absent', () => {
    expect(verifyHmacSha256(body, sign(body), undefined)).toBe(false);
  });

  it('supports base64 digests (Cashfree)', () => {
    const b64 = sign(body, SECRET, 'base64');
    expect(verifyHmacSha256(body, b64, SECRET, 'base64')).toBe(true);
    expect(verifyHmacSha256(body, b64, SECRET, 'hex')).toBe(false);
  });
});

describe('webhookGuard fail-closed behaviour', () => {
  const body = '{"type":"PAYMENT_SUCCESS_WEBHOOK"}';
  const ORIGINAL_ENV = process.env.NODE_ENV;
  afterEach(() => { process.env.NODE_ENV = ORIGINAL_ENV; });

  it('rejects an unconfigured secret in production', () => {
    process.env.NODE_ENV = 'production';
    const reason = webhookGuard({
      secret: undefined, signature: 'anything', payload: body, providerName: 'Cashfree',
    });
    expect(reason).toMatch(/not configured/i);
  });

  it('allows an unconfigured secret outside production, for local testing', () => {
    process.env.NODE_ENV = 'development';
    const reason = webhookGuard({
      secret: undefined, signature: 'anything', payload: body, providerName: 'Cashfree',
    });
    expect(reason).toBeNull();
  });

  it('rejects a missing signature header when a secret IS configured', () => {
    // The original bug: `if (signature && ...)` meant omitting the header
    // skipped verification entirely.
    process.env.NODE_ENV = 'production';
    const reason = webhookGuard({
      secret: SECRET, signature: undefined, payload: body, providerName: 'Razorpay',
    });
    expect(reason).toMatch(/missing signature/i);
  });

  it('rejects a forged signature', () => {
    process.env.NODE_ENV = 'production';
    const reason = webhookGuard({
      secret: SECRET, signature: 'deadbeef', payload: body, providerName: 'Razorpay',
    });
    expect(reason).toMatch(/mismatch/i);
  });

  it('admits a correctly signed request', () => {
    process.env.NODE_ENV = 'production';
    const reason = webhookGuard({
      secret: SECRET, signature: sign(body), payload: body, providerName: 'Razorpay',
    });
    expect(reason).toBeNull();
  });

  it('binds the signature to the exact bytes, so replayed sig + new body fails', () => {
    process.env.NODE_ENV = 'production';
    const sigForOriginal = sign(body);
    const attackerBody = '{"type":"PAYMENT_SUCCESS_WEBHOOK","data":{"order":{"order_id":"victim"}}}';
    const reason = webhookGuard({
      secret: SECRET, signature: sigForOriginal, payload: attackerBody, providerName: 'Cashfree',
    });
    expect(reason).toMatch(/mismatch/i);
  });
});

describe('Razorpay payment signature (order_id|payment_id scheme)', () => {
  const KEY_SECRET = 'rzp_key_secret';
  const orderId = 'order_ABC123';
  const paymentId = 'pay_XYZ789';
  const valid = crypto.createHmac('sha256', KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex');

  it('accepts the genuine signature', () => {
    expect(safeCompare(valid, valid)).toBe(true);
  });

  it('rejects a signature minted with the leaked placeholder secret', () => {
    // Regression guard for the removed `|| 'mocksecret'` fallback: anyone
    // reading the repo knew that constant and could sign their own payments.
    const forged = crypto.createHmac('sha256', 'mocksecret').update(`${orderId}|${paymentId}`).digest('hex');
    expect(safeCompare(valid, forged)).toBe(false);
  });

  it('rejects a signature for a different order', () => {
    const other = crypto.createHmac('sha256', KEY_SECRET).update(`order_OTHER|${paymentId}`).digest('hex');
    expect(safeCompare(valid, other)).toBe(false);
  });
});
