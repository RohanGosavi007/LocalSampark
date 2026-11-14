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
    pickup_lat: row.pickup_lat != null ? Number(row.pickup_lat) : (row.shop_latitude != null ? Number(row.shop_latitude) : null),
    pickup_lng: row.pickup_lng != null ? Number(row.pickup_lng) : (row.shop_longitude != null ? Number(row.shop_longitude) : null),
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
  o.rider_payout, o.delivery_distance_km, o.pickup_address, o.pickup_lat, o.pickup_lng,
  o.payment_method, o.payment_status, o.total_amount, o.created_at, o.assigned_agent_id,
  s.name AS shop_name, s.address AS shop_address, s.latitude AS shop_latitude, s.longitude AS shop_longitude,
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
    const { pincode, lat, lng } = req.query;
    const userId = req.user?.id;

    let riderLat = lat != null ? Number(lat) : null;
    let riderLng = lng != null ? Number(lng) : null;

    if ((riderLat === null || riderLng === null || !Number.isFinite(riderLat) || !Number.isFinite(riderLng)) && userId) {
      const agent = await queryOne('SELECT current_lat, current_lng FROM delivery_agents WHERE user_id = $1', [userId]);
      if (agent && agent.current_lat != null && agent.current_lng != null) {
        riderLat = Number(agent.current_lat);
        riderLng = Number(agent.current_lng);
      }
    }

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

    let jobs = (rows.rows || rows || []).map(toJob);

    // Calculate proximity and sort nearest pickup first when rider coordinates exist
    if (riderLat != null && riderLng != null && Number.isFinite(riderLat) && Number.isFinite(riderLng)) {
      jobs = jobs.map((job) => {
        const pLat = job.pickup_lat;
        const pLng = job.pickup_lng;
        let distanceToPickupKm = null;
        if (pLat != null && pLng != null && Number.isFinite(pLat) && Number.isFinite(pLng)) {
          distanceToPickupKm = Math.round(geo.distanceKm({ lat: riderLat, lng: riderLng }, { lat: pLat, lng: pLng }) * 100) / 100;
        }
        return {
          ...job,
          distance_to_pickup_km: distanceToPickupKm,
        };
      });

      jobs.sort((a, b) => {
        if (a.distance_to_pickup_km === null && b.distance_to_pickup_km === null) return 0;
        if (a.distance_to_pickup_km === null) return 1;
        if (b.distance_to_pickup_km === null) return -1;
        return a.distance_to_pickup_km - b.distance_to_pickup_km;
      });
    }

    res.json({ success: true, data: jobs });
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
          SET assigned_agent_id = $1, order_status = 'assigned', status = 'assigned', updated_at = ${NOW},
              status_changed_by = $3, status_changed_role = 'rider', status_change_reason = 'rider_accepted'
        WHERE id = $2 AND id IN (SELECT o.id FROM orders o WHERE o.id = $2 AND ${AVAILABLE_JOB})`,
      [userId, jobId, String(userId)]
    );

    const affected = claimed?.rowCount ?? claimed?.changes ?? 0;
    if (!affected) {
      return res.status(400).json({
        error: 'This job has already been accepted or is no longer available.',
      });
    }

    // Mark delivery agent active on this delivery
    await query(`UPDATE delivery_agents SET status = 'on_delivery', updated_at = ${NOW} WHERE user_id = $1`, [userId]);

    const row = await queryOne(
      `SELECT ${JOB_COLUMNS}
         FROM orders o
         LEFT JOIN local_shops s ON s.id = o.shop_id
         LEFT JOIN users u ON u.id = o.user_id
        WHERE o.id = $1`,
      [jobId]
    );

    // Broadcast status change to customer and merchant tracking
    const io = req.app?.get ? req.app.get('io') : null;
    if (io) {
      io.emit(`order_status_${jobId}`, { orderId: jobId, status: 'ASSIGNED' });
      io.to(`order_${jobId}`).to(`order:${jobId}`).emit('order_status_update', { orderId: jobId, status: 'ASSIGNED' });
    }

    res.json({ success: true, message: 'Job accepted.', data: toJob(row) });
  } catch (error) {
    next(error);
  }
};

const rejectJob = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.id;

    // Release job back to ready pool if not yet picked up
    const released = await query(
      `UPDATE orders
          SET assigned_agent_id = NULL, order_status = 'ready', status = 'ready', updated_at = ${NOW},
              status_changed_by = $3, status_changed_role = 'rider', status_change_reason = 'rider_released'
        WHERE id = $1 AND assigned_agent_id = $2 AND LOWER(order_status) = 'assigned'`,
      [jobId, userId, String(userId)]
    );

    const affected = released?.rowCount ?? released?.changes ?? 0;
    if (!affected) {
      return res.status(400).json({
        error: 'This job cannot be released (it may not be assigned to you or has already been picked up).',
      });
    }

    await query(`UPDATE delivery_agents SET status = 'available', updated_at = ${NOW} WHERE user_id = $1`, [userId]);

    const io = req.app?.get ? req.app.get('io') : null;
    if (io) {
      io.emit(`order_status_${jobId}`, { orderId: jobId, status: 'READY' });
      io.to(`order_${jobId}`).to(`order:${jobId}`).emit('order_status_update', { orderId: jobId, status: 'READY' });
    }

    res.json({ success: true, message: 'Job released back to queue.' });
  } catch (error) {
    next(error);
  }
};

const pickupJob = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.id;

    const updated = await query(
      `UPDATE orders
          SET order_status = 'out_for_delivery', status = 'out_for_delivery', updated_at = ${NOW},
              status_changed_by = $3, status_changed_role = 'rider', status_change_reason = 'picked_up'
        WHERE id = $1 AND assigned_agent_id = $2 AND LOWER(order_status) = 'assigned'`,
      [jobId, userId, String(userId)]
    );

    const affected = updated?.rowCount ?? updated?.changes ?? 0;
    if (!affected) {
      return res.status(400).json({ error: 'This job is not assigned to you, or is not awaiting pickup.' });
    }

    const io = req.app?.get ? req.app.get('io') : null;
    if (io) {
      io.emit(`order_status_${jobId}`, { orderId: jobId, status: 'OUT_FOR_DELIVERY' });
      io.to(`order_${jobId}`).to(`order:${jobId}`).emit('order_status_update', { orderId: jobId, status: 'OUT_FOR_DELIVERY' });
    }

    res.json({ success: true, status: 'out_for_delivery' });
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
            SET order_status = 'delivered', status = 'delivered', delivered_at = ${NOW}, updated_at = ${NOW},
                status_changed_by = $3, status_changed_role = 'rider', status_change_reason = 'handover_code_verified'
          WHERE id = $1 AND assigned_agent_id = $2 AND LOWER(order_status) IN ('assigned', 'out_for_delivery')`,
        [jobId, userId, String(userId)]
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

    // Reset rider status to available for future jobs
    await query(`UPDATE delivery_agents SET status = 'available', updated_at = ${NOW} WHERE user_id = $1`, [userId]);

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
          SET order_status = $1, status = $2, updated_at = ${NOW},
              status_changed_by = $5, status_changed_role = 'rider', status_change_reason = 'picked_up'
        WHERE id = $3 AND assigned_agent_id = $4 AND LOWER(order_status) = 'assigned'`,
      // One parameter per column: PostgreSQL refuses a reused one across types.
      [String(status).toLowerCase(), String(status).toLowerCase(), jobId, userId, String(userId)]
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
    const {
      vehicleNumber,
      vehicleType,
      dlNumber,
      aadharNumber,
      rcNumber,
      bankAccountNumber,
      bankIfsc,
      bankAccountName,
      profileImageUrl,
      dlImageUrl,
      rcImageUrl,
      aadhaarImageUrl,
      fullName
    } = req.body || {};

    const vType = String(vehicleType || 'motorcycle').toLowerCase();
    const ALLOWED_VEHICLES = ['motorcycle', 'scooter', 'bicycle', 'ev'];
    if (!ALLOWED_VEHICLES.includes(vType)) {
      return res.status(400).json({
        success: false,
        error: `vehicleType must be one of: ${ALLOWED_VEHICLES.join(', ')}`,
      });
    }

    if (aadharNumber && !/^\d{12}$/.test(String(aadharNumber).trim())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Aadhaar number. Must be a 12-digit number.',
      });
    }

    if (bankIfsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(String(bankIfsc).trim())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid bank IFSC code format. Expected 4 letters, 0, and 6 alphanumeric characters.',
      });
    }

    if (fullName) {
      await query('UPDATE users SET full_name = $1 WHERE id = $2', [String(fullName).trim(), userId]);
    }

    const existing = await queryOne('SELECT id FROM delivery_agents WHERE user_id = $1', [userId]);

    if (existing) {
      await query(
        `UPDATE delivery_agents
            SET vehicle_number = $1, vehicle_type = $2, dl_number = $3,
                aadhar_number = $4, rc_number = $5, bank_account_number = $6,
                bank_ifsc = $7, bank_account_name = $8, profile_image_url = $9,
                dl_image_url = $10, rc_image_url = $11, aadhaar_image_url = $12,
                kyc_status = 'pending', rejection_reason = NULL, updated_at = ${NOW}
          WHERE user_id = $13`,
        [
          vehicleNumber || null,
          vType,
          dlNumber || null,
          aadharNumber ? String(aadharNumber).trim() : null,
          rcNumber || null,
          bankAccountNumber ? String(bankAccountNumber).trim() : null,
          bankIfsc ? String(bankIfsc).trim().toUpperCase() : null,
          bankAccountName ? String(bankAccountName).trim() : null,
          profileImageUrl || null,
          dlImageUrl || null,
          rcImageUrl || null,
          aadhaarImageUrl || null,
          userId,
        ]
      );
    } else {
      await query(
        `INSERT INTO delivery_agents (
           id, user_id, vehicle_type, vehicle_number, dl_number,
           aadhar_number, rc_number, bank_account_number, bank_ifsc,
           bank_account_name, profile_image_url, dl_image_url, rc_image_url,
           aadhaar_image_url, kyc_status, status, is_online, cash_in_hand
         ) VALUES (
           $1, $2, $3, $4, $5,
           $6, $7, $8, $9,
           $10, $11, $12, $13,
           $14, 'pending', 'offline', false, 0
         )`,
        [
          crypto.randomUUID(),
          userId,
          vType,
          vehicleNumber || null,
          dlNumber || null,
          aadharNumber ? String(aadharNumber).trim() : null,
          rcNumber || null,
          bankAccountNumber ? String(bankAccountNumber).trim() : null,
          bankIfsc ? String(bankIfsc).trim().toUpperCase() : null,
          bankAccountName ? String(bankAccountName).trim() : null,
          profileImageUrl || null,
          dlImageUrl || null,
          rcImageUrl || null,
          aadhaarImageUrl || null,
        ]
      );
    }

    res.status(200).json({
      success: true,
      message: 'KYC Application submitted successfully.',
      kycStatus: 'pending',
    });
  } catch (error) {
    next(error);
  }
};

const getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const agent = await queryOne(
      `SELECT da.*, u.full_name as user_full_name, u.phone_number, u.email
         FROM delivery_agents da
         JOIN users u ON u.id = da.user_id
        WHERE da.user_id = $1`,
      [userId]
    );

    if (!agent) {
      return res.status(404).json({ success: false, error: 'Delivery agent profile not found' });
    }

    const rawBank = agent.bank_account_number ? String(agent.bank_account_number) : '';
    const maskedBank = rawBank
      ? 'X'.repeat(Math.max(0, rawBank.length - 4)) + rawBank.slice(-4)
      : null;

    res.json({
      success: true,
      profile: {
        id: agent.id,
        userId: agent.user_id,
        fullName: agent.user_full_name || agent.full_name,
        phone: agent.phone_number,
        email: agent.email,
        vehicleType: agent.vehicle_type,
        vehicleNumber: agent.vehicle_number,
        dlNumber: agent.dl_number,
        aadharNumber: agent.aadhar_number ? `XXXX-XXXX-${String(agent.aadhar_number).slice(-4)}` : null,
        rcNumber: agent.rc_number,
        bankAccountNumber: maskedBank,
        bankIfsc: agent.bank_ifsc,
        bankAccountName: agent.bank_account_name,
        kycStatus: agent.kyc_status || 'pending',
        rejectionReason: agent.rejection_reason,
        isOnline: Boolean(agent.is_online),
        status: agent.status || 'offline',
        currentLat: agent.current_lat != null ? Number(agent.current_lat) : null,
        currentLng: agent.current_lng != null ? Number(agent.current_lng) : null,
        rating: agent.rating != null ? Number(agent.rating) : 5.0,
        cashInHand: Number(agent.cash_in_hand) || 0,
        createdAt: agent.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateDutyStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { isOnline, latitude, longitude } = req.body || {};
    const online = Boolean(isOnline);

    const agent = await queryOne('SELECT * FROM delivery_agents WHERE user_id = $1', [userId]);
    if (!agent) {
      return res.status(404).json({ success: false, error: 'Delivery agent profile not found' });
    }

    const kycStatus = String(agent.kyc_status || '').toLowerCase();
    const APPROVED_STATUSES = ['active', 'approved', 'verified'];
    if (!APPROVED_STATUSES.includes(kycStatus)) {
      return res.status(403).json({
        success: false,
        code: 'RIDER_NOT_APPROVED',
        error: 'Your delivery partner application has not been approved yet.',
      });
    }

    if (online) {
      // 1. Floating cash limit check
      const limit = await platformConfig.get('rider_cash_limit');
      const cashHolding = Number(agent.cash_in_hand || 0);
      if (limit > 0 && cashHolding >= limit) {
        return res.status(409).json({
          success: false,
          code: 'CASH_LIMIT_REACHED',
          error: `You are holding ₹${cashHolding} in cash. Deposit it before going online.`,
          cashInHand: cashHolding,
          limit,
        });
      }

      // 2. Dhanori / Pune pilot zone geofence validation
      if (latitude !== undefined && longitude !== undefined) {
        const lat = Number(latitude);
        const lng = Number(longitude);
        // Pune/Dhanori pilot bounding box: lat 18.40 - 18.75, lng 73.70 - 74.05
        const isInPilotZone = Number.isFinite(lat) && Number.isFinite(lng) &&
          lat >= 18.40 && lat <= 18.75 && lng >= 73.70 && lng <= 74.05;

        if (!isInPilotZone) {
          return res.status(400).json({
            success: false,
            code: 'OUT_OF_SERVICE_AREA',
            error: 'You are outside the Pune/Dhanori pilot delivery zone (serviceable area).',
          });
        }
      }
    }

    const nextStatus = online ? 'available' : 'offline';
    const isOnlineVal = process.env.USE_SQLITE === 'true' ? (online ? 1 : 0) : online;

    if (latitude !== undefined && longitude !== undefined && Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude))) {
      const lat = Number(latitude);
      const lng = Number(longitude);
      await query(
        `UPDATE delivery_agents
            SET is_online = $1, status = $2, current_lat = $3, current_lng = $4,
                coordinate = ${pointSql(lat, lng)}, updated_at = ${NOW}
          WHERE user_id = $5`,
        [isOnlineVal, nextStatus, lat, lng, userId]
      );
    } else {
      await query(
        `UPDATE delivery_agents
            SET is_online = $1, status = $2, updated_at = ${NOW}
          WHERE user_id = $3`,
        [isOnlineVal, nextStatus, userId]
      );
    }

    res.json({
      success: true,
      message: online ? 'You are now online and available for deliveries.' : 'You are now offline.',
      isOnline: online,
      status: nextStatus,
    });
  } catch (error) {
    next(error);
  }
};

const updateLocation = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { latitude, longitude, batteryLevel, orderId } = req.body || {};

    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return res.status(400).json({ success: false, message: 'Valid latitude and longitude are required' });
    }

    const agent = await queryOne('SELECT id, status, is_online FROM delivery_agents WHERE user_id = $1', [userId]);
    if (!agent) {
      return res.status(404).json({ success: false, error: 'Delivery agent profile not found' });
    }

    // The position is broadcast to the order's customer. Without this check
    // any rider could name any order and move its rider on the customer's map.
    if (orderId) {
      const order = await queryOne(
        `SELECT id FROM orders
          WHERE id = $1 AND assigned_agent_id = $2 AND LOWER(order_status) IN ('assigned', 'out_for_delivery')`,
        [orderId, userId]
      );
      if (!order) {
        return res.status(403).json({ success: false, error: 'This order is not an active delivery of yours.' });
      }
    }

    await query(
      `UPDATE delivery_agents
          SET current_lat = $1, current_lng = $2, coordinate = ${pointSql(lat, lng)}, updated_at = ${NOW}
        WHERE user_id = $3`,
      [lat, lng, userId]
    );

    // Record audit trace point in live_tracking (linked to delivery_riders foreign key)
    // A rider without a phone number used to be given an invented one
    // (+919<timestamp>), which then sat in delivery_riders as if real. Without
    // a number the trace row is skipped; the position above is still saved
    // and broadcast.
    const userRow = await queryOne('SELECT phone_number, full_name FROM users WHERE id = $1', [userId]);
    const userPhone = userRow?.phone_number || null;
    const userName = userRow?.full_name || 'Delivery Partner';

    let trackingRiderId = null;
    const legacyRider = userPhone
      ? await queryOne('SELECT id FROM delivery_riders WHERE user_id = $1 OR phone = $2', [userId, userPhone])
      : await queryOne('SELECT id FROM delivery_riders WHERE user_id = $1', [userId]);
    if (legacyRider) {
      trackingRiderId = legacyRider.id;
    } else if (userPhone) {
      trackingRiderId = `RIDER-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      try {
        await query(
          `INSERT INTO delivery_riders (id, name, phone, vehicle_type, vehicle_number, status, user_id)
           VALUES ($1, $2, $3, 'motorcycle', 'N/A', 'available', $4)`,
          [trackingRiderId, userName, userPhone, userId]
        );
      } catch {
        const fallback = await queryOne('SELECT id FROM delivery_riders WHERE user_id = $1 OR phone = $2', [userId, userPhone]);
        if (fallback) trackingRiderId = fallback.id;
      }
    }

    if (trackingRiderId) {
      await query(
        `INSERT INTO live_tracking (rider_id, order_id, latitude, longitude)
         VALUES ($1, $2, $3, $4)`,
        [trackingRiderId, orderId || null, lat, lng]
      ).catch(() => {});
    }

    // Broadcast live coordinates to customer tracking room
    const io = req.app?.get ? req.app.get('io') : null;
    if (io && orderId) {
      io.to(`order_${orderId}`).to(`order:${orderId}`).emit('RIDER_LOCATION_UPDATE', {
        orderId,
        latitude: lat,
        longitude: lng,
        batteryLevel: batteryLevel != null ? Number(batteryLevel) : null,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      latitude: lat,
      longitude: lng,
      batteryLevel: batteryLevel != null ? Number(batteryLevel) : null,
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
      },
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
  rejectJob,
  pickupJob,
  completeJob,
  updateJobStatus,
  getMyJobs,
  autoCreateShopDelivery,
  onboarding,
  getProfile,
  updateDutyStatus,
  updateLocation,
  getAnalytics,
};
