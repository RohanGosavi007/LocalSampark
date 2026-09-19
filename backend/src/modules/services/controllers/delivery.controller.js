const crypto = require('crypto');
const { query, queryOne } = require('../../../config/database');
const geo = require('../../../utils/geo');

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
  return {
    id: String(row.id),
    order_id: String(row.id),
    status: String(row.order_status || 'pending').toLowerCase(),
    type: row.fulfillment_method || 'delivery',
    pickup: row.shop_name || null,
    pickup_address: row.shop_address || null,
    dropoff: row.delivery_address || null,
    customer_name: row.customer_name || null,
    customer_phone: row.customer_phone || null,
    // The rider's cut is the delivery fee on the order. It was previously a
    // fixed ₹45 printed by the app.
    earnings: Number(row.delivery_fee) || 0,
    total_amount: Number(row.total_amount) || 0,
    created_at: row.created_at,
  };
}

const JOB_COLUMNS = `
  o.id, o.order_status, o.fulfillment_method, o.delivery_address, o.delivery_fee,
  o.total_amount, o.created_at, o.assigned_agent_id,
  s.name AS shop_name, s.address AS shop_address,
  u.full_name AS customer_name, u.phone_number AS customer_phone`;
const SurgeEngine = require('../../../services/surge.engine');
const RoutingService = require('../services/routing.service');

async function calculateDeliveryFee(req, res, next) {
  try {
    const { pincode = '411015', activeOrders = 10, availableDrivers = 2 } = req.query;
    const surgeData = await SurgeEngine.calculateSurge(pincode, parseInt(activeOrders), parseInt(availableDrivers));
    return res.json({ success: true, deliveryDetails: surgeData });
  } catch (err) {
    next(err);
  }
}

// Haversine
// One implementation for the whole backend; see src/utils/geo.js.
const haversineDistance = geo.distanceKm;

// requestDelivery: P2P courier and on-demand parcel delivery
const requestDelivery = async (req, res, next) => {
  try {
    const {
      pickupAddress,
      deliveryAddress,
      pickupLat,
      pickupLng,
      dropLat,
      dropLng,
      packageDetails = 'Parcel / Courier Document',
      pincode = '411015',
      estimatedDistanceKm = 3.5,
      deliveryFee = 45
    } = req.body;

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    // Find a default logistics shop in local_shops.
    //
    // This read prisma.shop, whose model is @@mapped to `shops` — not the table
    // registration writes to. In production that lookup found nothing and every
    // parcel request failed with "No active logistics channel found in region",
    // however many shops the platform actually had.
    let shop = await queryOne(
      `SELECT * FROM local_shops
        WHERE is_active = 1 AND (delivery_available = 1 OR pickup_available = 1)
        ORDER BY created_at ASC LIMIT 1`
    );
    if (!shop) {
      shop = await queryOne('SELECT * FROM local_shops WHERE is_active = 1 ORDER BY created_at ASC LIMIT 1');
    }

    if (!shop) {
      return res.status(400).json({ success: false, error: 'No active logistics channel found in region' });
    }

    const calculatedSurge = await SurgeEngine.calculateSurge(pincode, 5, 2);
    const finalFeePaise = Math.round((deliveryFee || (calculatedSurge.totalDeliveryFee || 45)) * 100);
    const orderNumber = `LS-P2P-${Date.now().toString().slice(-6)}`;

    // Create Order and DeliveryRoute
    /*
     * Rewritten off Prisma.
     *
     * This wrote `orders` in paise columns — subtotalPaise, deliveryFeePaise,
     * totalAmountPaise — none of which exist; the real column is
     * `total_amount`, in rupees. It also created a nested `deliveryRoute`, a
     * model @@mapped to a `delivery_routes` table no migration creates. So a
     * P2P parcel request could not be stored at all, on either engine.
     *
     * `orders` is the table the merchant queue, the rider job list and the
     * socket rooms all already read, so the job appears everywhere it should.
     */
    const orderId = crypto.randomUUID();
    const totalAmount = (finalFeePaise + 500) / 100;

    await query(
      `INSERT INTO orders
         (id, user_id, shop_id, total_amount, delivery_fee, platform_fee,
          payment_method, payment_status, order_status, status,
          fulfillment_method, delivery_address, delivery_coordinate,
          special_instructions, otp_code, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'COD', 'pending', 'pending', 'pending',
               'DELIVERY', $7, $8, $9, $10, ${NOW})`,
      [
        orderId,
        userId,
        shop.id,
        totalAmount,
        finalFeePaise / 100,
        5,
        deliveryAddress || 'Address',
        `POINT(${dropLng || shop.longitude} ${dropLat || shop.latitude})`,
        `[P2P Parcel] ${packageDetails} | Pickup: ${pickupAddress || 'Address'} -> Drop: ${deliveryAddress || 'Address'}`,
        // The rider must quote this back to close the delivery; completeJob
        // compares it. Six digits from the CSPRNG, not Math.random().
        String(crypto.randomInt(100000, 1000000)),
      ]
    );

    const newOrder = await queryOne('SELECT * FROM orders WHERE id = $1', [orderId]);
    newOrder.orderNumber = orderNumber;

    // Notify online riders via WebSocket
    const io = req.app.get('io');
    if (io) {
      io.emit('new_delivery_job', {
        jobId: newOrder.id,
        orderId: newOrder.id,
        orderNumber: newOrder.orderNumber,
        pincode,
        fee: finalFeePaise / 100
      });
    }

    res.status(201).json({
      success: true,
      message: 'P2P Delivery requested successfully. Finding nearest delivery partner.',
      order: newOrder,
      jobId: newOrder.id
    });
  } catch (error) {
    next(error);
  }
};

const getJobs = async (req, res, next) => {
  try {
    const { pincode } = req.query;

    // A job is available once the shop has marked the order ready and no rider
    // has taken it.
    const params = [];
    let where = `WHERE LOWER(o.order_status) = 'ready' AND o.assigned_agent_id IS NULL`;
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

    // Conditional update rather than read-then-write: two riders tapping Accept
    // at the same moment cannot both win.
    const claimed = await query(
      `UPDATE orders
          SET assigned_agent_id = $1, order_status = 'assigned', updated_at = ${NOW}
        WHERE id = $2 AND assigned_agent_id IS NULL AND LOWER(order_status) = 'ready'`,
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
      'SELECT id, user_id, shop_id, assigned_agent_id, order_status, otp_code, delivery_fee FROM orders WHERE id = $1',
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

    await query(
      `UPDATE orders
          SET order_status = 'delivered', delivered_at = ${NOW}, updated_at = ${NOW}
        WHERE id = $1 AND assigned_agent_id = $2`,
      [jobId, userId]
    );

    // Credit the rider the delivery fee. The mobile screen used to announce
    // "Earnings (₹45) added to your wallet" with nothing behind it.
    const earnings = Number(order.delivery_fee) || 0;
    if (earnings > 0) {
      let wallet = await queryOne('SELECT id FROM wallets WHERE user_id = $1 LIMIT 1', [userId]);
      if (!wallet) {
        const walletId = crypto.randomUUID();
        await query('INSERT INTO wallets (id, user_id, balance) VALUES ($1, $2, 0)', [walletId, userId]);
        wallet = { id: walletId };
      }
      await query(
        `UPDATE wallets SET balance = balance + $1, updated_at = ${NOW} WHERE id = $2`,
        [earnings, wallet.id]
      );
      await query(
        `INSERT INTO wallet_transactions (id, wallet_id, amount, transaction_type, purpose, status)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [crypto.randomUUID(), wallet.id, earnings, 'credit', 'delivery_earnings', 'completed']
      );
    }

    res.json({
      success: true,
      message: 'Delivery completed successfully!',
      data: { orderId: jobId, earnings },
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

        await query('UPDATE users SET role = $1 WHERE id = $2', ['delivery_agent', userId]);

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
                `SELECT COUNT(*) as deliveries, COALESCE(SUM(delivery_fee), 0) as earnings
                   FROM orders
                  WHERE assigned_agent_id = $1 AND LOWER(order_status) = 'delivered'`,
                [userId]
            ),
            queryOne(
                `SELECT COUNT(*) as deliveries, COALESCE(SUM(delivery_fee), 0) as earnings
                   FROM orders
                  WHERE assigned_agent_id = $1 AND LOWER(order_status) = 'delivered'
                    AND delivered_at >= $2`,
                [userId, since]
            ),
            query(
                `SELECT wt.id, wt.amount, wt.transaction_type, wt.purpose, wt.created_at
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
  calculateDeliveryFee,
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
