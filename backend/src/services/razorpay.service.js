/**
 * Razorpay, in one place.
 *
 * Four files each built their own client, all with the same fallback:
 *
 *     new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_mockkey', … })
 *
 * so a deployment without keys did not fail to start or refuse to take
 * payments — it built a client with credentials that cannot work and let the
 * first customer discover it. A fifth, payment.gateway.js, did not call
 * Razorpay at all and returned a made-up order id.
 *
 * Everything that talks to Razorpay now goes through here, and there is no
 * fallback: without both keys, isConfigured() is false and every operation
 * throws PaymentsUnavailableError, which the routes turn into a 503 the client
 * can show as "online payment is not available". Adding the keys to the
 * environment is all it takes to switch it on.
 *
 *   RAZORPAY_KEY_ID          public; sent to the browser to open Checkout
 *   RAZORPAY_KEY_SECRET      private; signs and verifies
 *   RAZORPAY_WEBHOOK_SECRET  private; set in the Razorpay dashboard on the
 *                            webhook, and distinct from the key secret
 */

const crypto = require('crypto');

class PaymentsUnavailableError extends Error {
  constructor(message = 'Online payment is not configured') {
    super(message);
    this.name = 'PaymentsUnavailableError';
    this.code = 'PAYMENTS_UNAVAILABLE';
    this.status = 503;
  }
}

/** A value that is set, and is not one of the placeholders this repository has shipped. */
function real(value) {
  if (!value || typeof value !== 'string') return null;
  const v = value.trim();
  if (!v) return null;
  if (/^(your_|YOUR_|changeme|rzp_test_mock|rzp_test_YourKeyId|mock)/.test(v) || v === 'mocksecret' || v === 'mock_secret') return null;
  // .env.production.template writes its blanks as <razorpay-key-id>.
  if (/^<.*>$/.test(v)) return null;
  return v;
}

const keyId = () => real(process.env.RAZORPAY_KEY_ID);
const keySecret = () => real(process.env.RAZORPAY_KEY_SECRET);
// PAYMENT_WEBHOOK_SECRET is the name an older handler read; honoured so a
// deployment that set that one is not silently left without verification.
const webhookSecret = () => real(process.env.RAZORPAY_WEBHOOK_SECRET) || real(process.env.PAYMENT_WEBHOOK_SECRET);

function isConfigured() {
  return Boolean(keyId() && keySecret());
}

let client = null;
let clientFor = null;
let injected = null;

/** The SDK client, built on first use and rebuilt if the keys change. */
function sdk() {
  if (injected) return injected;
  if (!isConfigured()) throw new PaymentsUnavailableError();
  const fingerprint = `${keyId()}:${keySecret()}`;
  if (!client || clientFor !== fingerprint) {
    const Razorpay = require('razorpay');
    client = new Razorpay({ key_id: keyId(), key_secret: keySecret() });
    clientFor = fingerprint;
  }
  return client;
}

/** Length-checked, constant-time comparison of two hex strings. */
function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/**
 * Creates a Razorpay order for an exact number of paise.
 *
 * `receipt` is our own payment id (Razorpay caps it at 40 characters) and
 * `notes` carries the same reference, so the order can be traced back from
 * the dashboard or from a webhook without consulting our database first.
 */
async function createOrder({ amountPaise, receipt, notes = {} }) {
  if (!Number.isInteger(amountPaise) || amountPaise < 100) {
    throw new Error('amountPaise must be a whole number of paise, at least 100 (₹1)');
  }
  const order = await sdk().orders.create({
    amount: amountPaise,
    currency: 'INR',
    receipt: String(receipt).slice(0, 40),
    notes,
  });
  if (!order || !order.id) throw new Error('Razorpay did not return an order id');
  return order;
}

/**
 * Is this the signature Razorpay Checkout returns for a successful payment?
 *
 * It signs `<order_id>|<payment_id>` with the key secret. A valid signature
 * says that payment was made against that order, and nothing more: which of
 * OUR orders it settles is decided by looking the Razorpay order id up in the
 * payments table, never by anything else in the request.
 */
function verifyCheckoutSignature({ razorpayOrderId, razorpayPaymentId, signature }) {
  const secret = keySecret();
  if (!secret) throw new PaymentsUnavailableError();
  if (!razorpayOrderId || !razorpayPaymentId || !signature) return false;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');
  return safeEqual(expected, signature);
}

/**
 * Is this webhook delivery from Razorpay? `rawBody` must be the bytes as
 * received: the signature is over those, and re-serialised JSON need not
 * reproduce them.
 */
function verifyWebhookSignature(rawBody, signature) {
  const secret = webhookSecret();
  if (!secret || !signature || rawBody === undefined || rawBody === null) return false;
  const body = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody), 'utf8');
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
  return safeEqual(expected, String(signature));
}

/** The payment as Razorpay holds it: status, amount in paise, order id. */
async function fetchPayment(razorpayPaymentId) {
  return sdk().payments.fetch(razorpayPaymentId);
}

/**
 * Sends a captured payment back to where it came from. `amountPaise` is the
 * whole payment unless a smaller amount is given. Razorpay returns the refund
 * (id `rfnd_…`); the money reaches the customer in its own time.
 */
async function refundPayment({ razorpayPaymentId, amountPaise, notes = {} }) {
  if (!razorpayPaymentId) throw new Error('razorpayPaymentId is required to refund a payment');
  if (!Number.isInteger(amountPaise) || amountPaise < 100) {
    throw new Error('amountPaise must be a whole number of paise, at least 100 (₹1)');
  }
  const refund = await sdk().payments.refund(razorpayPaymentId, { amount: amountPaise, speed: 'normal', notes });
  if (!refund || !refund.id) throw new Error('Razorpay did not return a refund id');
  return refund;
}

/** Tests substitute the SDK; passing null restores the real one. */
function _setClientForTests(fake) {
  injected = fake;
}

module.exports = {
  PaymentsUnavailableError,
  isConfigured,
  isWebhookConfigured: () => Boolean(webhookSecret()),
  keyId,
  createOrder,
  verifyCheckoutSignature,
  verifyWebhookSignature,
    fetchPayment,
  refundPayment,
  _setClientForTests,
};
