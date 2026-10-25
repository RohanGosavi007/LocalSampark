const crypto = require('crypto');
const { query, queryOne, withTransaction } = require('../../../config/database');
const geo = require('../../../utils/geo');
const { pointSql } = require('../../../utils/sqlPoint');
const pricing = require('../../../services/deliveryPricing.service');
const payments = require('../../../services/payments.service');
const platformConfig = require('../../../services/platformConfig.service');
const lifecycle = require('../../../services/orderLifecycle.service');

const NOW = process.env.USE_SQLITE === 'true' ? 'CURRENT_TIMESTAMP' : 'NOW()';

/**
 * The delivery job flow.
 *
 * getJobs, acceptJob, getMyJobs and completeJob all worked through
 * prisma.deliveryRoute, mapped to a table named `delivery_routes` that no
 * migration creates, joined to `shops`, `addresses` and `user.name`/
 * `user.phone` — none of which match the schema either (the real ones are
 * local_shops, and users.full_name/phone_number). The entire delivery-agent
 * API therefore failed on any database built from the migrations, which is why
 * the rider screens in the mobile app were driving off hardcoded jobs.
 *
 * They now run on `orders`, the table checkout writes and the merchant queue
 * and customer tracking already read. It carries everything the flow needs:
 * assigned_agent_id, otp_code, order_status and delivered_at.
 *
 * The old completeJob checked only that the OTP was four digits long and never
 * compared it — its own comment said "If we had OTP stored in DB". It is stored,
 * in orders.otp_code, so a rider could previously close out any assigned
 * delivery with 0000 and no customer involvement.
 */

/** Shape a raw order row into the job payload the rider app renders. */
function toJob(row) {
  const cash = isCashOrder(row);
  return {
    id: String(row.id),
    order_id: String(row.id),
    status: String(row.order_status || 'pending').toLowerCase(),
    type: row.shop_id ? (row.fulfillment_method || 'delivery') : 'parcel',
    pickup: row.shop_name || (row.shop_id ? null : 'Parcel pickup'),
    pickup_address: row.shop_address || row.pickup_address || null,
    dropoff: row.delivery_address || null,
    customer_name: row.customer_name || null,
    customer_phone: row.customer_phone || null,
    distance_km: row.delivery_distance_km === null || row.delivery_distance_km === undefined ? null : Number(row.delivery_distance_km),
    // What the rider is paid: by distance, plus any surge. It was the
    // customer's delivery charge — before that, a fixed ₹45 printed by the app —
    // so an order with free delivery paid its rider nothing.
    earnings: riderPay(row),
    total_amount: Number(row.total_amount) || 0,
    payment_method: String(row.payment_method || '').toLowerCase(),
    // Cash the rider must take from the customer at the door; 0 when prepaid.
    cash_to_collect: cash ? Number(row.total_amount) || 0 : 0,
    created_at: row.created_at,
  };
}

/** A cash order that has not been paid: the rider collects at the door. */
const isCashOrder = (row) => lifecycle.cashDue(row) > 0;
const { riderPay } = lifecycle;

const JOB_COLUMNS = `
  o.id, o.shop_id, o.order_status, o.fulfillment_method, o.delivery_address, o.delivery_fee,
  o.rider_payout, o.delivery_distance_km, o.pickup_address, o.payment_method, o.payment_status,
  o.total_amount, o.created_at, o.assigned_agent_id,
  s.name AS shop_name, s.address AS shop_address,
  u.full_name AS customer_name, u.phone_number AS customer_phone`;

// Work a rider can take: a delivery (not a customer pickup) that is ready, and
// — if it is to be paid online — has been paid.
const AVAILABLE_JOB = `LOWER(o.order_status) = 'ready' AND o.assigned_agent_id IS NULL
  AND LOWER(COALESCE(o.fulfillment_method, 'delivery')) = 'delivery'
  AND NOT (LOWER(COALESCE(o.payment_method, '')) = 'razorpay' AND LOWER(COALESCE(o.payment_status, '')) <> 'paid')`;

const RoutingService = require('../services/routing.service');

/**
 * POST /delivery/quote — what a delivery will cost.
 *
 *   { shopId, subtotal?, deliveryCoordinate | addressId }   an order from a shop
 *   { pickup: { lat, lng }, drop: { lat, lng } }            a parcel
 *
 * The same calculation an order is charged by (deliveryPricing.service.js).
 * A fee endpoint existed before this one; it priced by pincode from an
 * "active orders" and "available drivers" count that the caller supplied.
 */
async function quoteDelivery(req, res, next) {
  try {
    const body = req.body || {};
    let shop;
    if (body.shopId || body.shop_id) {
      shop = await queryOne('SELECT * FROM local_shops WHERE id = $1', [body.shopId || body.shop_id]);
      if (!shop) return res.status(404).json({ success: false, error: 'Shop not found' });
    } else {
      const pickup = pricing.readPoint(body.pickup) || pricing.readPoint({ lat: body.pickupLat, lng: body.pickupLng });
      if (!pickup) return res.status(400).json({ success: false, code: 'LOCATION_REQUIRED', error: 'A pickup location is required.' });
      shop = { latitude: pickup.lat, longitude: pickup.lng, delivery_available: 1 };
    }

    const drop = body.deliveryCoordinate ?? body.drop ?? { lat: body.dropLat, lng: body.dropLng };
    const bill = await pricing.quote({ shop, subtotal: Number(body.subtotal) || 0, pickup: false, drop });
    res.json({ success: true, bill });
  } catch (error) {
    if (error instanceof pricing.PricingError) {
      return res.status(error.status).json({ success: false, code: error.code, error: error.message, ...error.details });
    }
    next(error);
  }
}

// Haversine
// One implementation for the whole backend; see src/utils/geo.js.
const haversineDistance = geo.distanceKm;

/**
 * POST /delivery/request — send a parcel from one address to another.
 *
 * The charge came from the request body (`deliveryFee = 45`), with a distance
 * the caller also supplied and never used. The parcel was then attached to
 * whichever shop happened to be first in the table — so it appeared in a
 * stranger's order queue — and left in a status no rider's job list shows.
 *
 * The charge is now worked out from the two locations. A parcel belongs to no
 * shop; it goes straight to the riders' job list. It can be paid in cash to
 * the rider, from the wallet, or online.
 */
const requestDelivery = async (req, res, next) => {
  try {
    const body = req.body || {};
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const pickup = pricing.readPoint(body.pickup) || pricing.readPoint({ lat: body.pickupLat, lng: body.pickupLng });
    const drop = pricing.readPoint(body.drop) || pricing.readPoint({ lat: body.dropLat, lng: body.dropLng });
    const pickupAddress = typeof body.pickupAddress === 'string' ? body.pickupAddress.trim() : '';
    const deliveryAddress = typeof body.deliveryAddress === 'string' ? body.deliveryAddress.trim() : '';
    if (!pickup || !drop) {
      return res.status(400).json({ success: false, code: 'LOCATION_REQUIRED', error: 'Pickup and drop locations are required to price a delivery.' });
    }
    if (!pickupAddress || !deliveryAddress) {
      return res.status(400).json({ success: false, error: 'Pickup and delivery addresses are required.' });
    }
    const method = payments.paymentMethod(body.paymentMethod);
    if (!method) return res.status(400).json({ success: false, error: 'paymentMethod must be cod, razorpay or wallet' });
    if (method === 'razorpay' && !payments.onlinePaymentAvailable()) {
      return res.status(503).json({ success: false, code: 'PAYMENTS_UNAVAILABLE', error: 'Online payment is not available right now. Please choose another payment method.' });
    }

    const bill = await pricing.quote({
      shop: { latitude: pickup.lat, longitude: pickup.lng, delivery_available: 1 },
      subtotal: 0,
      pickup: false,
      drop,
    });
    // A parcel has no items: nothing for a small-order fee or free delivery to apply to.
    const deliveryFee = bill.deliveryBreakdown.base + bill.deliveryBreakdown.distanceCharge + bill.deliveryBreakdown.surge;
    const totalAmount = Math.round((deliveryFee + bill.platformFee) * 100) / 100;

    const orderId = crypto.randomUUID();
    const orderNumber = `LS-P2P-${Date.now().toString().slice(-6)}`;
    const packageDetails = String(body.packageDetails || 'Parcel').slice(0, 300);

    await withTransaction(async (client) => {
      if (method === 'wallet') {
        await payments.debitWallet({ userId, amount: totalAmount, purpose: 'parcel_payment', referenceId: orderId, client });
      }
      await client.query(
        `INSERT INTO orders
           (id, user_id, subtotal, total_amount, delivery_fee, platform_fee,
            payment_method, payment_status, order_status, status,
            fulfillment_method, delivery_address, delivery_coordinate, delivery_lat, delivery_lng,
            pickup_address, pickup_lat, pickup_lng, delivery_distance_km, surge_multiplier, rider_payout,
            special_instructions, otp_code)
         VALUES ($1, $2, 0, $3, $4, $5, $6, $7, 'ready', 'ready', 'delivery', $8,
                 ${pointSql(drop.lat, drop.lng)}, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
        [
          orderId, userId, totalAmount, deliveryFee, bill.platformFee,
          method, method === 'wallet' ? 'paid' : 'pending',
          deliveryAddress, drop.lat, drop.lng,
          pickupAddress, pickup.lat, pickup.lng, bill.distanceKm, bill.surgeMultiplier, bill.riderPayout,
          `[Parcel] ${packageDetails}`,
          // The rider must quote this back to close the delivery; completeJob
          // compares it. Six digits from the CSPRNG, not Math.random().
          String(crypto.randomInt(100000, 1000000)),
        ]
      );
    });

    const newOrder = await queryOne('SELECT * FROM orders WHERE id = $1', [orderId]);
    newOrder.orderNumber = orderNumber;

    let paymentData = null;
    if (method === 'razorpay') {
      try {
        paymentData = await payments.createPayment({ user: req.user, purpose: 'order', referenceId: orderId });
      } catch (err) {
        console.error(`[delivery] could not start payment for parcel ${orderId}: ${err.message}`);
      }
    }

    // Notify online riders via WebSocket — once it can actually be taken.
    const io = req.app.get('io');
    if (io && method !== 'razorpay') {
      io.emit('new_delivery_job', { jobId: newOrder.id, orderId: newOrder.id, orderNumber, fee: bill.riderPayout });
    }

    res.status(201).json({
      success: true,
      message: method === 'razorpay' ? 'Delivery requested; payment pending.' : 'Delivery requested. Finding the nearest delivery partner.',
      order: newOrder,
      jobId: newOrder.id,
      bill: { deliveryFee, platformFee: bill.platformFee, total: totalAmount, distanceKm: bill.distanceKm, etaMinutes: bill.etaMinutes },
      paymentData,
    });
  } catch (error) {
    if (error instanceof pricing.PricingError) {
      return res.status(error.status).json({ success: false, code: error.code, error: error.message, ...error.details });
    }
    if (error instanceof payments.PaymentError) {
      return res.status(error.status).json({ success: false, code: error.code, error: error.message });
    }
    next(error);
  }
};

const getJobs = async (req, res, next) => {
  try {
    const { pincode } = req.query;

    // A job is available once the shop has marked the order ready and no rider
    // has taken it.
    const params = [];
        let where = `WHERE ${AVAILABLE_JOB}`;
    if (pincode) {
      params.push(pincode);
      where += ` AND s.pincode = $${params.length}`;
    }

    const rows = await query(
      `SELECT ${JOB_COLUMNS}
         FROM orders o
         LEFT JOIN local_shops s ON s.id = o.shop_id
         LEFT JOIN users u ON u.id = o.user_id
         ${where}
        ORDER BY o.created_at ASC
        LIMIT 100`,
      params
    );

    res.json({ success: true, data: (rows.rows || rows || []).map(toJob) });
  } catch (error) {
    next(error);
  }
};

const acceptJob = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.id;

        // A cash order puts the platform's money in the rider's pocket until it
    // is deposited. Past the limit, the rider deposits before taking more.
    const job = await queryOne('SELECT id, payment_method, payment_status, total_amount FROM orders o WHERE o.id = $1', [jobId]);
    if (job && isCashOrder(job)) {
      const [agent, limit] = await Promise.all([
        queryOne('SELECT cash_in_hand FROM delivery_agents WHERE user_id = $1', [userId]),
        platformConfig.get('rider_cash_limit'),
      ]);
      const holding = Number(agent && agent.cash_in_hand) || 0;
      if (limit > 0 && holding >= limit) {
        return res.status(409).json({
          error: `You are holding ₹${holding} in cash. Deposit it before taking another cash order.`,
          code: 'CASH_LIMIT_REACHED',
          cashInHand: holding,
          limit,
        });
      }
    }

    // Conditional update rather than read-then-write: two riders tapping Accept
    // at the same moment cannot both win.
    const claimed = await query(
      `UPDATE orders
          SET assigned_agent_id = $1, order_status = 'assigned', updated_at = ${NOW}
        WHERE id = $2 AND id IN (SELECT o.id FROM orders o WHERE o.id = $2 AND ${AVAILABLE_JOB})`,
      [userId, jobId]
    );

    const affected = claimed?.rowCount ?? claimed?.changes ?? 0;
    if (!affected) {
      return res.status(400).json({
        error: 'This job has already been accepted or is no longer available.',
      });
    }

    const row = await queryOne(
      `SELECT ${JOB_COLUMNS}
         FROM orders o
         LEFT JOIN local_shops s ON s.id = o.shop_id
         LEFT JOIN users u ON u.id = o.user_id
        WHERE o.id = $1`,
      [jobId]
    );

    res.json({ success: true, message: 'Job accepted.', data: toJob(row) });
  } catch (error) {
    next(error);
  }
};

const completeJob = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const { otp } = req.body;
    const userId = req.user.id;

    const order = await queryOne(
                  'SELECT * FROM orders WHERE id = $1',
      [jobId]
    );

    if (!order || String(order.assigned_agent_id) !== String(userId)) {
      return res.status(403).json({ error: 'This job is not assigned to you.' });
    }

    const status = String(order.order_status || '').toLowerCase();
    if (!['assigned', 'out_for_delivery'].includes(status)) {
      return res.status(400).json({ error: `A job in status "${status}" cannot be completed.` });
    }

    // The handover code is compared, not merely counted. The previous version
    // checked only that the OTP was four characters long and never compared it
    // — its own comment read "If we had OTP stored in DB" — so any four digits
    // closed out any assigned delivery with no customer involvement. It is
    // stored, in orders.otp_code.
    const expected = String(order.otp_code || '');
    const supplied = String(otp || '');
    if (!expected) {
      return res.status(409).json({ error: 'This order has no handover code recorded. Contact support.' });
    }
    // Length is compared first because timingSafeEqual throws on a mismatch.
    if (
      supplied.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))
    ) {
      return res.status(403).json({ error: 'Incorrect handover code.' });
    }

        // Credit the rider the delivery fee. The mobile screen used to announce
    // "Earnings (₹45) added to your wallet" with nothing behind it.
    //
    // The UPDATE is the gate: it only changes an order that is still out for
    // delivery, and the fee is credited only if it changed one. The status was
    // read above and the credit made unconditionally, so two requests sent
    // together both passed the read and both paid the fee.
        let outcome = null;
    const completed = await withTransaction(async (client) => {
      const delivered = await client.query(
        `UPDATE orders
            SET order_status = 'delivered', status = 'delivered', delivered_at = ${NOW}, updated_at = ${NOW}
          WHERE id = $1 AND assigned_agent_id = $2 AND LOWER(order_status) IN ('assigned', 'out_for_delivery')`,
        [jobId, userId]
      );
      if (!delivered.rowCount) return false;

      // Cash on delivery: the customer has now paid — to the rider. The order
      // is marked paid and the amount goes onto the rider's cash in hand,
      // where it stays until they deposit it. Nothing recorded this before: a
      // cash order stayed "pending" for ever and nobody could say who was
      // holding the money. The rider's own pay goes to their wallet.
      outcome = await lifecycle.recordDelivery(client, order);
      return true;
    });
    const earnings = outcome ? outcome.riderEarnings : 0;
    const cashCollected = outcome ? outcome.cashCollected : 0;
    if (!completed) {
      return res.status(409).json({ error: 'This delivery has already been completed.' });
    }

    // Tell whoever is watching the order (the customer's tracking screen).
    const io = req.app?.get ? req.app.get('io') : null;
    if (io) {
      io.emit(`order_status_${jobId}`, { orderId: jobId, status: 'DELIVERED' });
      io.to(`order_${jobId}`).to(`order:${jobId}`).emit('order_status_update', { orderId: jobId, status: 'DELIVERED' });
    }


        res.json({
      success: true,
      message: 'Delivery completed successfully!',
      jobId,
      status: 'DELIVERED',
            data: { orderId: jobId, earnings, cashCollected },
    });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    next(error);
  }
};

/**
 * Kept as a no-op for its two call sites in shop.routes.js.
 *
 * It created a row in delivery_routes, a table no migration defines, inside a
 * try/catch that swallowed the failure and returned null — so checkout has never
 * produced a delivery job, silently, on every order.
 *
 * It could not have worked even with the table: shop.routes.js calls it as
 * (orderId, shopId, userId, lat, lng, address, items) while the signature reads
 * (orderId, shopLat, shopLng, dropLat, dropLng, distanceKm), so a shop id landed
 * in shopLat and a user id in shopLng.
 *
 * A delivery job is no longer a separate record: getJobs derives available work
 * from orders that the shop has marked ready and no rider has claimed, so there
 * is nothing to create here.
 */
const autoCreateShopDelivery = async () => null;

/**
 * Move an accepted job along the lifecycle short of delivery.
 *
 * There was no endpoint for this at all, so a rider had no way to tell anyone
 * they had collected the order — the customer's tracking screen stayed on
 * "assigned" until the delivery was completed outright.
 */
const updateJobStatus = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const { status } = req.body;
    const userId = req.user.id;

    // Completion goes through completeJob, which verifies the handover code.
    // Allowing 'delivered' here would be a way around it.
    const ALLOWED = ['out_for_delivery'];
    if (!ALLOWED.includes(String(status || '').toLowerCase())) {
      return res.status(400).json({ error: `status must be one of: ${ALLOWED.join(', ')}` });
    }

    const updated = await query(
      `UPDATE orders
          SET order_status = $1, updated_at = ${NOW}
        WHERE id = $2 AND assigned_agent_id = $3 AND LOWER(order_status) = 'assigned'`,
      [status, jobId, userId]
    );

    const affected = updated?.rowCount ?? updated?.changes ?? 0;
    if (!affected) {
      return res.status(400).json({ error: 'This job is not assigned to you, or is not awaiting pickup.' });
    }

    res.json({ success: true, status });
  } catch (error) {
    next(error);
  }
};

const getMyJobs = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const rows = await query(
      `SELECT ${JOB_COLUMNS}
         FROM orders o
         LEFT JOIN local_shops s ON s.id = o.shop_id
         LEFT JOIN users u ON u.id = o.user_id
        WHERE o.assigned_agent_id = $1
          AND LOWER(o.order_status) IN ('assigned', 'out_for_delivery')
        ORDER BY o.created_at ASC`,
      [userId]
    );

    res.json({ success: true, data: (rows.rows || rows || []).map(toJob) });
  } catch (error) {
    next(error);
  }
};

const onboarding = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { vehicleNumber, vehicleType, dlNumber } = req.body;

        // prisma.deliveryAgentProfile maps to delivery_agent_profiles, which no
        // migration creates; the rider record lives in delivery_agents. The role
        // update also wrote 'DELIVERY', while every role check in this codebase
        // compares against the lowercase 'delivery_agent'.
        const existing = await queryOne('SELECT id FROM delivery_agents WHERE user_id = $1', [userId]);

        if (existing) {
            await query(
                `UPDATE delivery_agents
                    SET vehicle_number = $1, vehicle_type = $2, updated_at = ${NOW}
                  WHERE user_id = $3`,
                [vehicleNumber || null, vehicleType || 'motorcycle', userId]
            );
        } else {
            await query(
                `INSERT INTO delivery_agents (id, user_id, vehicle_type, vehicle_number, status)
                 VALUES ($1, $2, $3, $4, 'offline')`,
                [crypto.randomUUID(), userId, vehicleType || 'motorcycle', vehicleNumber || null]
            );
        }

                // The role is not changed here. This used to set it to 'delivery_agent'
        // for whoever applied, immediately — before any review, and whatever
        // the account was: a shop owner stopped being one, and an administrator
        // who tried the form stopped being an administrator. The rider role is
        // taken up with PUT /auth/switch-role once the application is approved.


        res.status(200).json({
            success: true,
            message: 'KYC Application submitted successfully.',
            // The old handler reported success for a KYC review that nothing
            // queues; say plainly that it is pending rather than implying it is
            // done.
            kycStatus: 'pending',
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Fetch Delivery Analytics
 */
const getAnalytics = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const agent = await queryOne('SELECT * FROM delivery_agents WHERE user_id = $1', [userId]);
        if (!agent) return res.status(404).json({ error: 'Driver profile not found' });

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const since = todayStart.toISOString();

        // Wallet balance, lifetime earnings and today's numbers were all
        // hardcoded to zero, so a rider who had completed deliveries was shown
        // an empty ledger.
        const [walletRow, lifetimeRow, todayRow, txRows] = await Promise.all([
            queryOne('SELECT id, balance FROM wallets WHERE user_id = $1 LIMIT 1', [userId]),
            queryOne(
                `SELECT COUNT(*) as deliveries, COALESCE(SUM(COALESCE(NULLIF(rider_payout, 0), delivery_fee)), 0) as earnings
                   FROM orders
                  WHERE assigned_agent_id = $1 AND LOWER(order_status) = 'delivered'`,
                [userId]
            ),
            queryOne(
                `SELECT COUNT(*) as deliveries, COALESCE(SUM(COALESCE(NULLIF(rider_payout, 0), delivery_fee)), 0) as earnings
                   FROM orders
                  WHERE assigned_agent_id = $1 AND LOWER(order_status) = 'delivered'
                    AND delivered_at >= $2`,
                [userId, since]
            ),
            query(
                `SELECT wt.id, wt.amount, wt.type AS transaction_type, wt.purpose, wt.created_at
                   FROM wallet_transactions wt
                   JOIN wallets w ON w.id = wt.wallet_id
                  WHERE w.user_id = $1
                  ORDER BY wt.created_at DESC
                  LIMIT 20`,
                [userId]
            ),
        ]);

        res.json({
            success: true,
            data: {
                wallet: {
                    balance: Number(walletRow?.balance) || 0,
                    total_earned: Number(lifetimeRow?.earnings) || 0,
                },
                todayAnalytics: {
                    total_deliveries: Number(todayRow?.deliveries) || 0,
                    total_earnings: Number(todayRow?.earnings) || 0,
                },
                lifetime: {
                    total_deliveries: Number(lifetimeRow?.deliveries) || 0,
                    total_earnings: Number(lifetimeRow?.earnings) || 0,
                },
                rating: agent.rating != null ? Number(agent.rating) : null,
                transactions: txRows.rows || txRows || [],
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
  quoteDelivery,
  requestDelivery,
  getJobs,
  acceptJob,
  completeJob,
  updateJobStatus,
  getMyJobs,
  autoCreateShopDelivery,
  onboarding,
  getAnalytics
};
