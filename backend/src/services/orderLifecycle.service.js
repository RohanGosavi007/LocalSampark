/**
 * Moving an order from one status to the next: one set of rules.
 *
 * Three endpoints changed an order's status, each with its own idea of what
 * was allowed:
 *
 *   PUT   /shops/my-shop/orders/:id/status   checked the transition, nothing else
 *   PATCH /shop-flow/orders/:id/status       any status from any status; marking
 *                                            an order delivered also marked it
 *                                            PAID, whoever had or had not paid
 *   PUT   /orders/:id/status                 any status from any status
 *
 * So a shop could mark an order that was waiting for an online payment as
 * delivered, have it recorded as paid, and be paid out for it by the platform.
 * A rider could mark an order delivered without the customer's handover code.
 * And a cancelled order kept the customer's money and the stock it had taken.
 *
 * The rules, for every caller:
 *
 *   customer   may cancel their own order until the shop starts preparing it
 *   shop       confirms, prepares and readies its orders; hands a pickup order
 *              over at the counter; delivers an order itself when no delivery
 *              partner has taken it
 *   rider      marks an order they hold as picked up. Delivery is completed
 *              with the customer's code (delivery.controller completeJob)
 *   admin      any step, and may cancel at any point before delivery
 *
 *   An order to be paid online does not move past "pending" until it is paid.
 *   Cancelling returns the stock, and returns the money: to the wallet it came
 *   from, or through Razorpay to the card or UPI account it came from.
 *   Delivering a cash order records who took the cash — the rider or the shop.
 */

const crypto = require('crypto');
const { queryOne, queryMany, query, withTransaction } = require('../config/database');
const payments = require('./payments.service');
const razorpay = require('./razorpay.service');

class LifecycleError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'LifecycleError';
    this.status = status;
    this.code = code;
  }
}

const TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['out_for_delivery', 'delivered', 'cancelled'],
  assigned: ['out_for_delivery', 'delivered', 'cancelled'],
  out_for_delivery: ['delivered', 'cancelled'],
  delivered: ['return_requested'],
  return_requested: ['returned'],
  returned: [],
  cancelled: [],
};

/**
 * Handing an order to a rider, taking it back, or swapping the rider. These are
 * not status requests (nobody asks for "assigned"), so they are not in
 * TRANSITIONS, but they are moves all the same and are written down here, in
 * one place: an order can be (re)assigned only while it is ready or already
 * assigned. Before this, any order in any status could be given a rider,
 * including a delivered one, which then went round again and paid the rider
 * and counted the cash a second time.
 */
const ASSIGNMENT_MOVES = {
  ready: ['assigned'],
  assigned: ['assigned', 'ready'],
};

const ADMIN_ROLES = new Set(['admin', 'super_admin', 'territory_admin', 'moderator']);
const CUSTOMER_CANCELLABLE_FROM = new Set(['pending', 'confirmed']);
const SHOP_CANCELLABLE_FROM = new Set(['pending', 'confirmed', 'preparing', 'ready']);

const lower = (value) => String(value || '').toLowerCase();
const money = (value) => Math.round((Number(value) || 0) * 100) / 100;

/** The names clients use for a status, mapped onto the stored ones. */
function normaliseStatus(input) {
  const v = lower(input);
  if (v === 'dispatched' || v === 'picked_up') return 'out_for_delivery';
  if (v === 'accepted') return 'confirmed';
  if (v === 'ready_for_pickup') return 'ready';
  if (v === 'completed') return 'delivered';
  return v;
}

/** The name an actor goes by in an order's history. */
function roleOf(actor) {
  if (actor.admin) return 'admin';
  if (actor.shop) return 'shop';
  if (actor.rider) return 'rider';
  return 'customer';
}

const isPaid = (order) => lower(order.payment_status) === 'paid';
const isPickup = (order) => lower(order.fulfillment_method) === 'pickup';

/** A cash order that has not been paid: whoever hands it over collects. */
function cashDue(order) {
  return lower(order.payment_method) === 'cod' && !isPaid(order) ? money(order.total_amount) : 0;
}

/** What the rider is paid; orders placed before rider_payout existed fall back to the delivery charge. */
function riderPay(order) {
  const stored = Number(order.rider_payout);
  if (Number.isFinite(stored) && stored > 0) return stored;
  return Number(order.delivery_fee) || 0;
}

function actorOf(order, user) {
  const id = user && user.id;
  return {
    admin: ADMIN_ROLES.has(lower(user && user.role)) || Boolean(user && user.is_admin),
    shop: Boolean(order.shop_owner_id) && String(order.shop_owner_id) === String(id),
    rider: Boolean(order.assigned_agent_id) && String(order.assigned_agent_id) === String(id),
    customer: String(order.user_id) === String(id),
  };
}

/**
 * What a delivered order sets in motion. Runs inside the transaction that
 * marked it delivered, and only when that UPDATE changed the row — so cash is
 * recorded and the rider paid exactly once.
 *
 *   cash order, platform rider   the rider is holding the customer's cash; it
 *                                goes onto their cash in hand until deposited
 *   cash order, no rider         the shop took the cash at the counter or at
 *                                the door; settlement nets its commission off
 *   any order with a rider       the rider's pay goes to their wallet
 */
async function recordDelivery(client, order) {
  const riderId = order.assigned_agent_id || null;
  const cash = cashDue(order);
  let cashCollectedBy = null;

  if (cash > 0) {
    cashCollectedBy = riderId ? 'rider' : 'shop';
    await client.query(
      "UPDATE orders SET payment_status = 'paid', cash_collected_by = $1 WHERE id = $2",
      [cashCollectedBy, order.id]
    );
    if (riderId) {
      await client.query(
        'UPDATE delivery_agents SET cash_in_hand = COALESCE(cash_in_hand, 0) + $1 WHERE user_id = $2',
        [cash, riderId]
      );
      await client.query(
        `INSERT INTO rider_cash_ledger (id, rider_user_id, order_id, entry_type, amount, note)
         VALUES ($1, $2, $3, 'collected', $4, 'Cash on delivery')`,
        [crypto.randomUUID(), String(riderId), String(order.id), cash]
      );
    }
  }

  const earnings = riderId ? money(riderPay(order)) : 0;
  if (earnings > 0) {
    await payments.creditWallet({ userId: riderId, amount: earnings, purpose: 'delivery_earnings', referenceId: String(order.id), client });
  }

  return { cashCollected: cash, cashCollectedBy, riderEarnings: earnings };
}

/** Puts back the stock an order took. Lines from the universal catalogue hold none. */
async function restoreStock(client, orderId) {
  const lines = (await client.query(
    'SELECT product_id, quantity FROM order_items WHERE order_id = $1 AND product_id IS NOT NULL',
    [orderId]
  )).rows;
  for (const line of lines) {
    await client.query(
      `UPDATE shop_products
          SET inventory_count = COALESCE(inventory_count, 0) + $1, stock_quantity = COALESCE(stock_quantity, 0) + $1
        WHERE id = $2 AND CAST(track_inventory AS TEXT) IN ('1', 'true')`,
      [line.quantity, line.product_id]
    );
  }
}

/**
 * Undoes a cancelled order: stock back, commission voided, money returned.
 *
 * A wallet payment goes back to the wallet here, inside the transaction. A
 * Razorpay payment is marked refund_pending and sent back through the gateway
 * once the transaction has committed (refundThroughGateway) — a call to
 * Razorpay cannot be rolled back, so it is not made from inside one.
 *
 * Returns 'none' | 'wallet' | 'gateway'.
 */
async function undoOrder(client, order) {
  await restoreStock(client, order.id);
  await client.query("UPDATE shop_commissions SET status = 'refunded' WHERE order_id = $1 AND status = 'pending'", [order.id]);

  if (!isPaid(order)) return 'none';
  const method = lower(order.payment_method);

  if (method === 'wallet') {
    await payments.creditWallet({ userId: order.user_id, amount: order.total_amount, purpose: 'order_refund', referenceId: String(order.id), client });
    await client.query("UPDATE orders SET payment_status = 'refunded' WHERE id = $1", [order.id]);
    return 'wallet';
  }
  if (method === 'razorpay') {
    await client.query("UPDATE orders SET payment_status = 'refund_pending' WHERE id = $1", [order.id]);
    return 'gateway';
  }
  // Cash that was collected is only ever recorded at delivery, and a delivered
  // order cannot be cancelled.
  return 'none';
}

/**
 * Sends a Razorpay payment for a cancelled order back to the customer.
 *
 * The UPDATE that claims the refund is the gate: of two callers, one changes
 * the row and goes to Razorpay; the other stops. If Razorpay refuses or cannot
 * be reached the order goes back to refund_pending, where an administrator
 * (POST /admin/orders/:id/refund) or the unpaid-order job will try again.
 *
 * Returns { refunded, reason? }.
 */
async function refundThroughGateway(orderId) {
  const order = await queryOne('SELECT id, user_id, total_amount, payment_status, order_status FROM orders WHERE id = $1', [orderId]);
  if (!order) return { refunded: false, reason: 'Order not found.' };
  if (lower(order.payment_status) !== 'refund_pending') {
    return { refunded: false, reason: `Order is ${order.payment_status || 'unpaid'}; nothing is waiting to be refunded.` };
  }

  const payment = await queryOne(
    "SELECT * FROM payments WHERE purpose = 'order' AND order_id = $1 AND status = 'paid' ORDER BY paid_at DESC LIMIT 1",
    [String(orderId)]
  );
  if (!payment || !payment.payment_id) return { refunded: false, reason: 'No captured payment is recorded for this order.' };
  if (!razorpay.isConfigured()) return { refunded: false, reason: 'Razorpay keys are not configured.' };

  const claimed = await query(
    "UPDATE orders SET payment_status = 'refunding', updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND payment_status = 'refund_pending'",
    [orderId]
  );
  if (!(claimed.rowCount ?? claimed.changes)) return { refunded: false, reason: 'A refund for this order is already in progress.' };

  try {
    const refund = await razorpay.refundPayment({
      razorpayPaymentId: payment.payment_id,
      amountPaise: payment.amount_paise,
      notes: { payment_id: payment.id, order_id: String(orderId), reason: 'order cancelled' },
    });
    await withTransaction(async (client) => {
      await client.query("UPDATE orders SET payment_status = 'refunded', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [orderId]);
      await client.query(
        "UPDATE payments SET status = 'refunded', failure_reason = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        [`refund ${refund.id}`, payment.id]
      );
    });
    return { refunded: true, refundId: refund.id };
  } catch (error) {
    await query("UPDATE orders SET payment_status = 'refund_pending', updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND payment_status = 'refunding'", [orderId]);
    console.error(`[orders] refund for order ${orderId} failed: ${error.message}`);
    return { refunded: false, reason: 'Razorpay did not accept the refund. It will be retried.' };
  }
}

/** The order with its shop's owner, or null. */
function loadOrder(orderId) {
  return queryOne(
    `SELECT o.*, s.owner_id AS shop_owner_id, s.name AS shop_name
       FROM orders o
       LEFT JOIN local_shops s ON s.id = o.shop_id
      WHERE o.id = $1`,
    [orderId]
  );
}

/** Throws unless `actor` may move `order` from `from` to `to`. */
function authorise(order, actor, from, to) {
  const denied = () => new LifecycleError(403, 'FORBIDDEN', 'You are not allowed to change this order to that status.');

  if (!(actor.admin || actor.shop || actor.rider || actor.customer)) throw denied();
  // A customer or rider asking for a step that is never theirs is refused
  // before the order's state is consulted, so the answer says nothing about it.
  if (!actor.admin && !actor.shop) {
    const riderMay = actor.rider && (to === 'out_for_delivery' || to === 'delivered');
    const customerMay = actor.customer && to === 'cancelled';
    if (!riderMay && !customerMay) throw denied();
  }
  if (!Object.prototype.hasOwnProperty.call(TRANSITIONS, to)) {
    throw new LifecycleError(400, 'UNKNOWN_STATUS', `Unknown status "${to}".`);
  }
  if (!(TRANSITIONS[from] || []).includes(to)) {
    throw new LifecycleError(400, 'INVALID_TRANSITION', `Invalid transition from ${from} to ${to}`);
  }

  // Waiting for an online payment: nobody starts work on it until it arrives.
  const awaitingPayment = lower(order.payment_method) === 'razorpay' && !isPaid(order);
  if (awaitingPayment && to !== 'cancelled') {
    throw new LifecycleError(409, 'PAYMENT_PENDING', 'This order has not been paid for yet. It can be confirmed once the payment is received.');
  }

  if (actor.admin) return;

  const hasRider = Boolean(order.assigned_agent_id);

  if (to === 'cancelled') {
    if (actor.shop && SHOP_CANCELLABLE_FROM.has(from)) return;
        if (actor.customer && CUSTOMER_CANCELLABLE_FROM.has(from)) return;
    // A parcel has no shop and starts out ready: it can be called off until a
    // delivery partner accepts it.
    if (actor.customer && !order.shop_id && from === 'ready' && !hasRider) return;
    if (actor.customer) {
            throw new LifecycleError(409, 'TOO_LATE_TO_CANCEL',
        order.shop_id
          ? 'The shop has started preparing this order, so it can no longer be cancelled.'
          : 'A delivery partner has already accepted this parcel, so it can no longer be cancelled.');
    }
    throw denied();
  }

  if (to === 'out_for_delivery') {
    // The rider holding the order collects it from the shop.
    if (actor.rider && from === 'assigned') return;
    // No rider has taken it: the shop is delivering this one itself.
    if (actor.shop && from === 'ready' && !hasRider && !isPickup(order)) return;
    if (actor.shop && hasRider) {
      throw new LifecycleError(409, 'RIDER_ASSIGNED', 'A delivery partner is handling this order and will update it.');
    }
    throw denied();
  }

  if (to === 'delivered') {
    if (actor.rider) {
      throw new LifecycleError(403, 'HANDOVER_CODE_REQUIRED', "Complete the delivery with the customer's handover code.");
    }
    if (actor.shop && hasRider) {
      throw new LifecycleError(409, 'RIDER_ASSIGNED', 'A delivery partner is handling this order and will complete it.');
    }
    // Handed over at the counter, or delivered by the shop itself.
    if (actor.shop && isPickup(order) && from === 'ready') return;
    if (actor.shop && !isPickup(order) && from === 'out_for_delivery') return;
    if (actor.shop) {
      throw new LifecycleError(400, 'INVALID_TRANSITION',
        isPickup(order) ? 'A pickup order is handed over once it is ready.' : 'Mark the order out for delivery before marking it delivered.');
    }
    throw denied();
  }

  // confirmed, preparing, ready, return_requested, returned: the shop's steps.
  if (actor.shop) return;
  throw denied();
}

/**
 * Moves an order to `to` on behalf of `user`.
 *
 * `shopId`, when given, must be the order's shop (the merchant routes pass the
 * shop they resolved the caller to). Returns { order, from, to, refund,
 * delivery } — or the order unchanged when it is already in that status.
 */
async function changeStatus({ orderId, to: requested, user, shopId = null, reason = null }) {
  const to = normaliseStatus(requested);
  // Refused before the order is looked up: a status that does not exist says
  // nothing about any order.
  if (!Object.prototype.hasOwnProperty.call(TRANSITIONS, to)) {
    throw new LifecycleError(400, 'UNKNOWN_STATUS', `Unknown status "${requested}". Must be one of: ${Object.keys(TRANSITIONS).join(', ')}`);
  }
  const order = await loadOrder(orderId);
  if (!order || (shopId !== null && String(order.shop_id) !== String(shopId))) {
    throw new LifecycleError(404, 'NOT_FOUND', 'Order not found');
  }

  const from = normaliseStatus(order.order_status || 'pending');
  const actor = actorOf(order, user);
  if (from === to && (actor.admin || actor.shop)) {
    return { order, from, to, refund: 'none', delivery: null, unchanged: true };
  }
  authorise(order, actor, from, to);

  let refund = 'none';
  let delivery = null;

  await withTransaction(async (client) => {
    // The gate. The status was read above; this changes the row only if it is
    // still in that status, so two requests cannot both apply the effects of
    // one transition (two refunds, two rider payments).
    const sets = ['order_status = $1', 'status = $2', 'updated_at = CURRENT_TIMESTAMP'];
    const params = [to, to, orderId, from];
    if (to === 'delivered') sets.push('delivered_at = CURRENT_TIMESTAMP');
    if (to === 'cancelled' && reason) {
      params.push(`[Cancelled] ${String(reason).slice(0, 300)}`);
      sets.push(`special_instructions = $${params.length}`);
      params.push(String(reason).slice(0, 300));
      sets.push(`cancellation_reason = $${params.length}`);
    }
    // Who is making the change and why, for the order's history (migration
    // 148). The database copies these into a history row and clears them.
    params.push(user && user.id != null ? String(user.id) : null);
    sets.push(`status_changed_by = $${params.length}`);
    params.push(roleOf(actor));
    sets.push(`status_changed_role = $${params.length}`);
    params.push(reason ? String(reason).slice(0, 300) : null);
    sets.push(`status_change_reason = $${params.length}`);
    const moved = await client.query(
      `UPDATE orders SET ${sets.join(', ')} WHERE id = $3 AND LOWER(COALESCE(order_status, 'pending')) = $4`,
      params
    );
    if (!moved.rowCount) throw new LifecycleError(409, 'CONFLICT', 'This order has just been updated by someone else. Refresh and try again.');

    if (to === 'delivered') delivery = await recordDelivery(client, order);
    if (to === 'cancelled') {
      refund = await undoOrder(client, order);
      // A rider holding a cancelled order is free to take another.
      if (order.assigned_agent_id) {
        await client.query("UPDATE delivery_agents SET status = 'available' WHERE user_id = $1", [order.assigned_agent_id]);
      }
    }
  });

  if (refund === 'gateway') {
    const outcome = await refundThroughGateway(orderId);
    refund = outcome.refunded ? 'gateway' : 'gateway_pending';
  }

  return { order: await loadOrder(orderId), from, to, refund, delivery, unchanged: false };
}

/**
 * Cancels orders that were to be paid online and never were.
 *
 * Placing an order takes its stock straight away. A customer who closes the
 * Razorpay window leaves an order that holds that stock for ever and sits in
 * the shop's queue unconfirmable. After `minutes` it is cancelled and the
 * stock returned. Also retries refunds that Razorpay did not accept first time.
 */
async function expireUnpaidOrders({ minutes = 30, now = new Date() } = {}) {
  const cutoff = new Date(now.getTime() - minutes * 60 * 1000).toISOString();
  const stale = await queryMany(
    `SELECT id, created_at FROM orders
      WHERE LOWER(COALESCE(order_status, 'pending')) = 'pending'
        AND LOWER(COALESCE(payment_method, '')) = 'razorpay'
        AND LOWER(COALESCE(payment_status, 'pending')) NOT IN ('paid', 'refund_pending', 'refunding', 'refunded')
      LIMIT 500`
  );

  let cancelled = 0;
  for (const row of stale) {
    // Compared here rather than in SQL: the two engines store created_at in
    // different text formats, and both parse as dates.
    const created = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(String(row.created_at)) ? row.created_at : `${String(row.created_at).replace(' ', 'T')}Z`);
    if (Number.isNaN(created.getTime()) || created.toISOString() > cutoff) continue;

    const done = await withTransaction(async (client) => {
      const moved = await client.query(
        `UPDATE orders
            SET order_status = 'cancelled', status = 'cancelled', updated_at = CURRENT_TIMESTAMP,
                special_instructions = '[Cancelled] Payment was not completed.',
                status_changed_role = 'system', status_change_reason = 'payment_expired'
          WHERE id = $1 AND LOWER(COALESCE(order_status, 'pending')) = 'pending'
            AND LOWER(COALESCE(payment_status, 'pending')) <> 'paid'`,
        [row.id]
      );
      if (!moved.rowCount) return false;
      await restoreStock(client, row.id);
      await client.query("UPDATE shop_commissions SET status = 'refunded' WHERE order_id = $1 AND status = 'pending'", [row.id]);
      return true;
    });
    if (done) cancelled += 1;
  }

  const waiting = await queryMany("SELECT id FROM orders WHERE payment_status = 'refund_pending' LIMIT 100");
  let refunded = 0;
  for (const row of waiting) {
    if ((await refundThroughGateway(row.id)).refunded) refunded += 1;
  }

  return { cancelled, refunded };
}

/**
 * Gives an order to a rider (`riderUserId`), or takes it off the current one
 * (null: back to ready). The shop that owns the order and administrators may
 * do this, and only while the order is ready or assigned (ASSIGNMENT_MOVES).
 * The previous rider is freed, the new one marked on delivery, and the change
 * is written to the order's history. Returns { order, from, to }.
 */
async function assignRider({ orderId, riderUserId = null, user, shopId = null }) {
  const order = await loadOrder(orderId);
  if (!order || (shopId !== null && String(order.shop_id) !== String(shopId))) {
    throw new LifecycleError(404, 'NOT_FOUND', 'Order not found');
  }
  const actor = actorOf(order, user);
  if (!(actor.admin || actor.shop)) {
    throw new LifecycleError(403, 'FORBIDDEN', 'Only the shop that owns this order, or an administrator, can assign a rider.');
  }

  const from = normaliseStatus(order.order_status || 'pending');
  const to = riderUserId ? 'assigned' : 'ready';
  if (!(ASSIGNMENT_MOVES[from] || []).includes(to)) {
    throw new LifecycleError(409, 'NOT_ASSIGNABLE',
      from === 'pending' || from === 'confirmed' || from === 'preparing'
        ? 'The order is not ready yet. A rider can be assigned once it is ready.'
        : `This order is ${from} and cannot be given to a rider.`);
  }
  if (riderUserId) {
    if (isPickup(order)) throw new LifecycleError(409, 'NOT_ASSIGNABLE', 'A pickup order is collected by the customer and needs no rider.');
    if (lower(order.payment_method) === 'razorpay' && !isPaid(order)) {
      throw new LifecycleError(409, 'PAYMENT_PENDING', 'This order has not been paid for yet.');
    }
  } else if (!order.assigned_agent_id) {
    throw new LifecycleError(409, 'NOT_ASSIGNABLE', 'No rider is assigned to this order.');
  }

  await withTransaction(async (client) => {
    const moved = await client.query(
      `UPDATE orders
          SET assigned_agent_id = $1, order_status = $2, status = $3, updated_at = CURRENT_TIMESTAMP,
              status_changed_by = $4, status_changed_role = $5, status_change_reason = $6
        WHERE id = $7 AND LOWER(COALESCE(order_status, 'pending')) = $8`,
      // One parameter per column: PostgreSQL refuses a reused one across types.
      [riderUserId || null, to, to, user && user.id != null ? String(user.id) : null, roleOf(actor),
        riderUserId ? 'rider_assigned' : 'rider_removed', orderId, from]
    );
    if (!moved.rowCount) throw new LifecycleError(409, 'CONFLICT', 'This order has just been updated by someone else. Refresh and try again.');
    if (order.assigned_agent_id) {
      await client.query("UPDATE delivery_agents SET status = 'available' WHERE user_id = $1", [order.assigned_agent_id]);
    }
    if (riderUserId) {
      await client.query("UPDATE delivery_agents SET status = 'on_delivery' WHERE user_id = $1", [riderUserId]);
    }
  });

  return { order: await loadOrder(orderId), from, to };
}

/**
 * Every status an order has been in, oldest first: who moved it, from what, to
 * what, when, and why. Read from order_status_history, which the database
 * writes and refuses to change.
 */
function historyFor(orderId) {
  return queryMany(
    `SELECT id, from_status, to_status, actor_user_id, actor_role, reason, created_at
       FROM order_status_history
      WHERE order_id = $1
      ORDER BY id ASC`,
    [String(orderId)]
  );
}

/**
 * The named way an order ended, from its history: CANCELLED_BY_CUSTOMER,
 * REJECTED_BY_SELLER, CANCELLED_BY_ADMIN, EXPIRED (an online payment never
 * arrived) or PAYMENT_FAILED. Null for an order that is not cancelled.
 */
function terminalState(history) {
  const last = [...(history || [])].reverse().find((h) => lower(h.to_status) === 'cancelled');
  if (!last) return null;
  if (lower(last.reason) === 'payment_expired') return 'EXPIRED';
  if (lower(last.reason) === 'payment_failed') return 'PAYMENT_FAILED';
  if (last.actor_role === 'admin') return 'CANCELLED_BY_ADMIN';
  if (last.actor_role === 'shop') return 'REJECTED_BY_SELLER';
  if (last.actor_role === 'customer') return 'CANCELLED_BY_CUSTOMER';
  return 'CANCELLED_BY_ADMIN';
}

module.exports = {
  LifecycleError,
  historyFor,
  terminalState,
  assignRider,
  ASSIGNMENT_MOVES,
  TRANSITIONS,
  normaliseStatus,
  cashDue,
  riderPay,
  recordDelivery,
  changeStatus,
  refundThroughGateway,
  expireUnpaidOrders,
};
