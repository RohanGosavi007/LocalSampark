/**
 * Taking a payment, and deciding what a payment settles.
 *
 * The rule this file exists to keep: **what is being paid for, and how much,
 * is decided on the server before the customer is sent to the gateway, and is
 * never taken from the request that says the payment succeeded.**
 *
 * Every path that used to handle payments broke that rule somewhere.
 *
 *   - The amount came from the browser: `{ amount }`, or a cart of client-side
 *     prices summed on the server.
 *   - The verification checked that a signature was genuine and then marked
 *     paid whichever `order_id` the request named. A signature proves a
 *     payment was made against a Razorpay order; it says nothing about our
 *     order. One real ₹1 payment could be replayed to settle anything.
 *   - A wallet top-up "order" was an HMAC over (user, amount, id) handed to
 *     whoever asked, and presenting it back credited the wallet. No payment
 *     took place at any point.
 *
 * Here a payment is a row in `payments`, written when the gateway order is
 * created. It records the purpose, the thing being paid for, the owner and the
 * amount in paise. Verification and the webhook both arrive holding a Razorpay
 * order id; they find that row and settle what IT says, once.
 */

const crypto = require('crypto');
const { query, queryOne, withTransaction } = require('../config/database');
const razorpay = require('./razorpay.service');

class PaymentError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'PaymentError';
    this.status = status;
    this.code = code;
  }
}

const SUBSCRIPTION_PERIOD_DAYS = 30;
const TOPUP_MIN_RUPEES = 10;
const TOPUP_MAX_RUPEES = 50000;

const isPaid = (value) => String(value || '').toLowerCase() === 'paid';
const toPaise = (rupees) => Math.round(Number(rupees) * 100);

/**
 * Turns a paid-for plan subscription on, for SUBSCRIPTION_PERIOD_DAYS from now.
 *
 * Called inside the transaction that records the payment — a verified Razorpay
 * payment, or a wallet debit — so a shop is premium exactly when it has been
 * paid for. jobs/subscription-expiry.job.js turns it off again when the period
 * ends; nothing did, so one month's payment bought the plan for good.
 *
 * Returns the end of the period as an ISO string.
 */
async function activateSubscription(client, subscriptionId, reference) {
  const periodEnd = new Date(Date.now() + SUBSCRIPTION_PERIOD_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await client.query(
    `UPDATE vendor_subscriptions
        SET status = 'active', current_period_end = $1, gateway_subscription_id = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3`,
    [periodEnd, reference, subscriptionId]
  );
  await client.query(
    `UPDATE local_shops
        SET crm_tier = 'premium', is_locked = '0', is_premium = '1', premium_expires_at = $1
      WHERE id = (SELECT shop_id FROM vendor_subscriptions WHERE id = $2)`,
    [periodEnd, subscriptionId]
  );
  return periodEnd;
}

/**
 * What can be paid for. Each purpose knows how to load the thing (so its
 * owner and amount come from the database) and what settling it means.
 */
const PURPOSES = {
  order: {
    load: (id) => queryOne('SELECT id, user_id, total_amount, payment_status FROM orders WHERE id = $1', [id]),
        // An order cancelled while its payment was in flight (the customer paid
    // after the unpaid-order job gave up on it) is owed back: it is marked
    // refund_pending, which the same job then sends back through Razorpay.
    settle: (client, payment, gatewayPaymentId) => client.query(
      `UPDATE orders
          SET payment_status = CASE WHEN LOWER(COALESCE(order_status, '')) = 'cancelled' THEN 'refund_pending' ELSE 'paid' END,
              payment_id = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2`,
      [gatewayPaymentId, payment.order_id]
    ),
  },
  shop_order: {
    load: (id) => queryOne('SELECT id, user_id, total_amount, payment_status FROM shop_orders WHERE id = $1', [id]),
    settle: (client, payment, gatewayPaymentId) => client.query(
      "UPDATE shop_orders SET payment_status = 'paid', payment_gateway_ref = $1 WHERE id = $2",
      [gatewayPaymentId, payment.order_id]
    ),
  },
  universal_order: {
    load: (id) => queryOne('SELECT id, user_id, total_amount, payment_status FROM universal_orders WHERE id = $1', [id]),
    settle: (client, payment, gatewayPaymentId) => client.query(
      "UPDATE universal_orders SET payment_status = 'paid', payment_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
      [gatewayPaymentId, payment.order_id]
    ),
  },
    saas_subscription: {
    // The shop's owner pays, the plan's monthly price is the amount, and a
    // subscription already active has been paid for.
    load: (id) => queryOne(
      `SELECT vs.id, s.owner_id AS user_id, p.price_monthly AS total_amount,
              CASE WHEN vs.status = 'active' THEN 'paid' ELSE 'pending' END AS payment_status
         FROM vendor_subscriptions vs
         JOIN local_shops s ON s.id = vs.shop_id
         JOIN saas_plans p ON p.id = vs.plan_id
        WHERE vs.id = $1`,
      [id]
    ),
        settle: (client, payment, gatewayPaymentId) => activateSubscription(client, payment.order_id, gatewayPaymentId),
  },
  /**
   * SamparkPlus: a 30-day membership. The price is a platform setting and is read
   * HERE, on the server, when the gateway order is made; the request names the
   * purpose and nothing else, so a client cannot choose what it pays. Paying again
   * while a membership is running adds a period to the end of it.
   */
  sampark_plus: {
    load: null,
    fixedAmount: async () => {
      // eslint-disable-next-line global-require
      return require('./platformConfig.service').get('samparkplus_price_monthly');
    },
    settle: async (client, payment) => {
      const existing = (await client.query(
        "SELECT id, tier_expires_at FROM user_subscriptions WHERE user_id = $1 AND tier = 'SamparkPlus' ORDER BY created_at DESC LIMIT 1",
        [payment.user_id]
      )).rows[0];
      const running = existing && existing.tier_expires_at ? Date.parse(String(existing.tier_expires_at).replace(' ', 'T') + (/[zZ]|[+-]\d\d:?\d\d$/.test(String(existing.tier_expires_at)) ? '' : 'Z')) : 0;
      const from = Math.max(Date.now(), Number.isFinite(running) ? running : 0);
      const until = new Date(from + SUBSCRIPTION_PERIOD_DAYS * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
      if (existing) {
        await client.query("UPDATE user_subscriptions SET status = 'active', tier_expires_at = $1 WHERE id = $2", [until, existing.id]);
      } else {
        await client.query(
          "INSERT INTO user_subscriptions (id, user_id, tier, status, start_date, tier_expires_at) VALUES ($1, $2, 'SamparkPlus', 'active', CURRENT_TIMESTAMP, $3)",
          [crypto.randomUUID(), payment.user_id, until]
        );
      }
    },
  },
  wallet_topup: {
    load: null,
    settle: async (client, payment) => {
      const rupees = payment.amount_paise / 100;
      let wallet = (await client.query('SELECT id FROM wallets WHERE user_id = $1', [payment.user_id])).rows[0];
      if (!wallet) {
        wallet = { id: crypto.randomUUID() };
        await client.query('INSERT INTO wallets (id, user_id, balance) VALUES ($1, $2, 0)', [wallet.id, payment.user_id]);
      }
      await client.query('UPDATE wallets SET balance = balance + $1 WHERE id = $2', [rupees, wallet.id]);
      await client.query(
        `INSERT INTO wallet_transactions (id, wallet_id, amount, type, purpose, reference_id, status)
         VALUES ($1, $2, $3, 'credit', 'wallet_topup', $4, 'completed')`,
        [crypto.randomUUID(), wallet.id, rupees, payment.id]
      );
    },
  },
};

/** The ways an order can be paid, however the client spelled them. */
const METHODS = { cod: 'cod', cash: 'cod', razorpay: 'razorpay', online: 'razorpay', upi: 'razorpay', card: 'razorpay', wallet: 'wallet' };

/** 'cod' | 'razorpay' | 'wallet', or null for anything else. COD when absent. */
function paymentMethod(value) {
  if (value === undefined || value === null || value === '') return 'cod';
  return METHODS[String(value).trim().toLowerCase()] || null;
}

/**
 * Takes `amount` rupees from a wallet, or throws 402 leaving it untouched.
 *
 * The balance check is in the UPDATE's WHERE clause, not a SELECT before it:
 * two orders placed at once then cannot both pass a check against the same
 * balance. Pass `client` to make the debit part of a caller's transaction.
 */
async function debitWallet({ userId, amount, purpose, referenceId, client }) {
  const rupees = Math.round(Number(amount) * 100) / 100;
  if (!Number.isFinite(rupees) || rupees <= 0) {
    throw new PaymentError(400, 'INVALID_AMOUNT', 'The amount to pay must be more than zero.');
  }
  const run = async (c) => {
    const debited = await c.query(
      'UPDATE wallets SET balance = balance - $1 WHERE user_id = $2 AND balance >= $1',
      [rupees, userId]
    );
    if (!debited.rowCount) {
      throw new PaymentError(402, 'INSUFFICIENT_BALANCE', 'Insufficient wallet balance.');
    }
    await c.query(
      `INSERT INTO wallet_transactions (id, wallet_id, amount, type, purpose, reference_id, status)
       VALUES ($1, (SELECT id FROM wallets WHERE user_id = $2), $3, 'debit', $4, $5, 'completed')`,
      [crypto.randomUUID(), userId, rupees, purpose, referenceId || null]
    );
  };
  return client ? run(client) : withTransaction(run);
}

/** Puts `amount` rupees back: the reversal of a debit whose order was never written. */
async function creditWallet({ userId, amount, purpose, referenceId, client }) {
  const rupees = Math.round(Number(amount) * 100) / 100;
  if (!Number.isFinite(rupees) || rupees <= 0) return;
    const run = async (c) => {
    // The recipient may never have opened their wallet. Without a row the
    // UPDATE below changed nothing and the money was credited to nobody.
    let wallet = (await c.query('SELECT id FROM wallets WHERE user_id = $1', [userId])).rows[0];
    if (!wallet) {
      wallet = { id: crypto.randomUUID() };
      await c.query('INSERT INTO wallets (id, user_id, balance) VALUES ($1, $2, 0)', [wallet.id, userId]);
    }
    await c.query('UPDATE wallets SET balance = balance + $1 WHERE id = $2', [rupees, wallet.id]);
    await c.query(
      `INSERT INTO wallet_transactions (id, wallet_id, amount, type, purpose, reference_id, status)
       VALUES ($1, $2, $3, 'credit', $4, $5, 'completed')`,
      [crypto.randomUUID(), wallet.id, rupees, purpose, referenceId || null]
    );
  };
  return client ? run(client) : withTransaction(run);
}

/** What the browser needs to open Razorpay Checkout for a payment row. */
function checkoutPayload(payment) {
  return {
    paymentId: payment.id,
    keyId: razorpay.keyId(),
    razorpayOrderId: payment.gateway_order_id,
    amount: payment.amount_paise,
    currency: payment.currency || 'INR',
    purpose: payment.purpose,
    referenceId: payment.order_id || null,
  };
}

/**
 * Starts a payment: fixes what it is for and how much, and creates the
 * Razorpay order for exactly that.
 *
 * `amount` is read only for a wallet top-up, where the customer chooses it.
 * For everything else it comes from the order row, and the order must belong
 * to the caller.
 */
async function createPayment({ user, purpose, referenceId, amount }) {
  if (!user || !user.id) throw new PaymentError(401, 'UNAUTHENTICATED', 'Sign in to pay.');

  const kind = PURPOSES[purpose];
  if (!kind) throw new PaymentError(400, 'UNKNOWN_PURPOSE', `Unknown payment purpose: ${purpose}`);
  // Keys AND the switch (ENABLE_ONLINE_PAYMENTS): see razorpay.onlinePaymentsEnabled.
  if (!(razorpay.isConfigured() && razorpay.onlinePaymentsEnabled())) throw new razorpay.PaymentsUnavailableError();

  let amountPaise;
  let reference = null;

  if (kind.load) {
    if (referenceId === undefined || referenceId === null || referenceId === '') {
      throw new PaymentError(400, 'REFERENCE_REQUIRED', 'referenceId is required.');
    }
    const row = await kind.load(referenceId);
    // The same answer for "no such order" and "not yours", so this cannot be
    // used to find out which order ids exist.
    if (!row || String(row.user_id) !== String(user.id)) {
      throw new PaymentError(404, 'NOT_FOUND', 'Order not found.');
    }
    if (isPaid(row.payment_status)) {
      throw new PaymentError(409, 'ALREADY_PAID', 'This order has already been paid.');
    }
    amountPaise = toPaise(row.total_amount);
    reference = String(row.id);
  } else if (kind.fixedAmount) {
    // The server's price; whatever `amount` the request carried is ignored.
    amountPaise = toPaise(await kind.fixedAmount());
  } else {
    const rupees = Number(amount);
    if (!Number.isFinite(rupees) || rupees < TOPUP_MIN_RUPEES || rupees > TOPUP_MAX_RUPEES) {
      throw new PaymentError(400, 'INVALID_AMOUNT', `Enter an amount between ₹${TOPUP_MIN_RUPEES} and ₹${TOPUP_MAX_RUPEES}.`);
    }
    amountPaise = toPaise(rupees);
  }

  if (!Number.isInteger(amountPaise) || amountPaise < 100) {
    throw new PaymentError(400, 'INVALID_AMOUNT', 'The amount to pay must be at least ₹1.');
  }

  // A retry — the customer closed the Razorpay window and pressed Pay again —
  // gets the gateway order already opened for this exact payment, rather than
  // a second one for the same thing.
  if (reference) {
    const open = await queryOne(
      `SELECT * FROM payments
        WHERE purpose = $1 AND order_id = $2 AND user_id = $3 AND status = 'created' AND amount_paise = $4
        ORDER BY created_at DESC LIMIT 1`,
      [purpose, reference, user.id, amountPaise]
    );
    if (open && open.gateway_order_id) return checkoutPayload(open);
  }

  const id = crypto.randomUUID();
  const gatewayOrder = await razorpay.createOrder({
    amountPaise,
    receipt: id,
    notes: { payment_id: id, purpose, reference_id: reference || '' },
  });

  await query(
    `INSERT INTO payments
       (id, user_id, order_id, amount, amount_paise, currency, status, gateway_order_id, receipt, purpose)
     VALUES ($1, $2, $3, $4, $5, 'INR', 'created', $6, $7, $8)`,
    [id, user.id, reference, amountPaise / 100, amountPaise, gatewayOrder.id, id, purpose]
  );

  return checkoutPayload({
    id, order_id: reference, amount_paise: amountPaise, currency: 'INR', gateway_order_id: gatewayOrder.id, purpose,
  });
}

/**
 * Marks a payment paid and applies what it was for, exactly once.
 *
 * Both the browser's verification call and Razorpay's webhook end here, in
 * either order and possibly both. The UPDATE … WHERE status <> 'paid' is the
 * gate: whichever arrives first changes the row and goes on to apply the
 * effect; the other changes nothing and stops. Crediting a wallet is additive,
 * so without that gate a retried webhook would pay out twice.
 */
async function settle(payment, gatewayPaymentId) {
  const kind = PURPOSES[payment.purpose];
  if (!kind) throw new PaymentError(500, 'UNKNOWN_PURPOSE', `Payment ${payment.id} has no known purpose.`);

  return withTransaction(async (client) => {
    const claimed = await client.query(
      `UPDATE payments
          SET status = 'paid', payment_id = $1, paid_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2 AND status <> 'paid'`,
      [gatewayPaymentId, payment.id]
    );
    if (!claimed.rowCount) return { settled: false, alreadyPaid: true };

    await kind.settle(client, payment, gatewayPaymentId);
    return { settled: true, alreadyPaid: false };
  });
}

/**
 * The browser reporting a successful payment. The three values are what
 * Razorpay Checkout hands to its success handler.
 */
async function confirmPayment({ user, razorpayOrderId, razorpayPaymentId, signature }) {
  if (!user || !user.id) throw new PaymentError(401, 'UNAUTHENTICATED', 'Sign in to pay.');
  if (!razorpayOrderId || !razorpayPaymentId || !signature) {
    throw new PaymentError(400, 'MISSING_FIELDS', 'razorpay_order_id, razorpay_payment_id and razorpay_signature are required.');
  }

  const payment = await queryOne('SELECT * FROM payments WHERE gateway_order_id = $1', [razorpayOrderId]);
  if (!payment || String(payment.user_id) !== String(user.id)) {
    throw new PaymentError(404, 'NOT_FOUND', 'Payment not found.');
  }

  if (!razorpay.verifyCheckoutSignature({ razorpayOrderId, razorpayPaymentId, signature })) {
    throw new PaymentError(400, 'BAD_SIGNATURE', 'Payment verification failed.');
  }

  // The signature already ties the payment to the order. Asking Razorpay as
  // well catches a payment that was authorised and then failed or was
  // refunded before we were told. If Razorpay cannot be reached the signature
  // stands, and the webhook will correct anything that later changes.
  try {
    const remote = await razorpay.fetchPayment(razorpayPaymentId);
    if (remote) {
      if (remote.order_id && remote.order_id !== razorpayOrderId) {
        throw new PaymentError(400, 'ORDER_MISMATCH', 'Payment verification failed.');
      }
      if (remote.amount !== undefined && Number(remote.amount) !== Number(payment.amount_paise)) {
        throw new PaymentError(400, 'AMOUNT_MISMATCH', 'Payment verification failed.');
      }
      if (remote.status && !['captured', 'authorized'].includes(remote.status)) {
        throw new PaymentError(402, 'NOT_CAPTURED', 'The payment was not completed.');
      }
    }
  } catch (err) {
    if (err instanceof PaymentError) throw err;
    console.warn(`[payments] could not confirm ${razorpayPaymentId} with Razorpay; proceeding on signature: ${err.message}`);
  }

  const outcome = await settle(payment, razorpayPaymentId);
  return { ...outcome, paymentId: payment.id, purpose: payment.purpose, referenceId: payment.order_id || null };
}

/**
 * A verified webhook event from Razorpay. The caller has already checked the
 * signature against the raw body.
 */
async function handleWebhookEvent(event) {
  const type = event && event.event;
  const entity = event && event.payload && event.payload.payment && event.payload.payment.entity;
  if (!type || !entity || !entity.order_id) return { ignored: 'not a payment event' };

  const payment = await queryOne('SELECT * FROM payments WHERE gateway_order_id = $1', [entity.order_id]);
  if (!payment) return { ignored: 'no payment for this gateway order' };

  if (type === 'payment.captured' || type === 'order.paid') {
    // The amount Razorpay collected must be the amount this payment was for.
    if (Number(entity.amount) !== Number(payment.amount_paise)) {
      console.error(
        `[payments] webhook amount mismatch for ${payment.id}: gateway ${entity.amount} paise, expected ${payment.amount_paise}`
      );
      return { rejected: 'amount mismatch' };
    }
    return settle(payment, entity.id);
  }

  if (type === 'payment.failed') {
    await query(
      `UPDATE payments SET status = 'failed', failure_reason = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2 AND status = 'created'`,
      [String(entity.error_description || entity.error_code || 'failed').slice(0, 250), payment.id]
    );
    return { failed: true };
  }

  return { ignored: `unhandled event ${type}` };
}

module.exports = {
  PaymentError,
  PURPOSES: Object.keys(PURPOSES),
  TOPUP_MIN_RUPEES,
  TOPUP_MAX_RUPEES,
  createPayment,
  confirmPayment,
    handleWebhookEvent,
  settle,
  paymentMethod,
  onlinePaymentAvailable: () => razorpay.isConfigured() && razorpay.onlinePaymentsEnabled(),
    debitWallet,
  creditWallet,
  activateSubscription,
  SUBSCRIPTION_PERIOD_DAYS,
};
