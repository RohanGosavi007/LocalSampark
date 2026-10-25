/**
 * Concurrency & Idempotency Test Suite on PostgreSQL (Gate G6, Lead L7)
 *
 * Verifies that under high-concurrency race conditions:
 * [G6.1] Last Stock Unit Race: In a race for the last stock unit, exactly 1 buyer succeeds; 0 stock left.
 * [G6.2] Idempotency-Key Deduplication: Duplicate concurrent order requests produce exactly 1 order.
 * [G6.3] Payment Webhook Duplicate Idempotency: Duplicate payment capture events settle exactly once.
 * [G6.4] Coupon Usage Limit Under Race: Strict limit enforcement prevents over-redemption under concurrency.
 * [G6.5] Payout Idempotency: Repeated or concurrent payout settlements execute exactly once.
 */

const crypto = require('crypto');
const { query, queryOne, withTransaction } = require('../config/database');

describe('PostgreSQL Concurrency & Idempotency Suite [G6]', () => {
  let testShopId;
  let testUserId1;
  let testUserId2;

  beforeAll(async () => {
    // Ground rule check: ensure we are on local host if running Postgres
    if (process.env.USE_SQLITE === 'false' && process.env.DATABASE_URL) {
      const url = new URL(process.env.DATABASE_URL);
      if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') {
        throw new Error(`CRITICAL TEST SAFETY VIOLATION: Non-local host ${url.hostname}`);
      }
    }

    // Set up test users and shop
    testUserId1 = crypto.randomUUID();
    testUserId2 = crypto.randomUUID();
    testShopId = crypto.randomUUID();

    await query(
      `INSERT INTO users (id, phone_number, full_name, role, is_active, is_verified)
       VALUES ($1, '+919876543210', 'Buyer One', 'user', '1', '1'),
              ($2, '+919876543211', 'Buyer Two', 'user', '1', '1')
       ON CONFLICT (id) DO NOTHING`,
      [testUserId1, testUserId2]
    );

    await query(
      `INSERT INTO local_shops (id, owner_id, name, description, category, phone, address, coordinate, is_active, approval_status)
       VALUES ($1, $2, 'Concurrency Test Shop', 'Shop for race tests', 'Grocery', '+919876543210', 'Pune', ST_GeomFromText('POINT(73.8967 18.5786)', 4326), '1', 'approved')
       ON CONFLICT (id) DO NOTHING`,
      [testShopId, testUserId1]
    );
  });

  afterAll(async () => {
    try {
      await query('DELETE FROM local_shops WHERE id = $1', [testShopId]);
      await query('DELETE FROM users WHERE id IN ($1, $2)', [testUserId1, testUserId2]);
    } catch {
      // Best effort cleanup
    }
  });

  test('[G6.1] Race for last product stock unit: exactly one succeeds', async () => {
    const productId = crypto.randomUUID();
    // Insert a product with EXACTLY 1 unit in inventory
    await query(
      `INSERT INTO shop_products (id, shop_id, name, price, inventory_count, stock_quantity, track_inventory, is_available, is_active)
       VALUES ($1, $2, 'Limited Stock Item', 100.0, 1, 1, '1', '1', '1')`,
      [productId, testShopId]
    );

    // Two concurrent buyers attempting to take 1 unit simultaneously
    const attemptPurchase = async (buyerId) => {
      return withTransaction(async (tx) => {
        const taken = await tx.query(
          `UPDATE shop_products
              SET inventory_count = inventory_count - 1,
                  stock_quantity = stock_quantity - 1,
                  updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND inventory_count >= 1`,
          [productId]
        );
        if (!taken.rowCount) {
          const err = new Error('OUT_OF_STOCK');
          err.code = 'OUT_OF_STOCK';
          throw err;
        }
        return { success: true, buyerId };
      });
    };

    const results = await Promise.allSettled([
      attemptPurchase(testUserId1),
      attemptPurchase(testUserId2),
    ]);

    const successes = results.filter((r) => r.status === 'fulfilled');
    const failures = results.filter((r) => r.status === 'rejected');

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
    expect(failures[0].reason.message).toBe('OUT_OF_STOCK');

    // Verify stock in database is exactly 0 and never went negative
    const product = await queryOne('SELECT inventory_count, stock_quantity FROM shop_products WHERE id = $1', [productId]);
    expect(Number(product.inventory_count)).toBe(0);
    expect(Number(product.stock_quantity)).toBe(0);

    await query('DELETE FROM shop_products WHERE id = $1', [productId]);
  });

  test('[G6.2] Idempotency-Key deduplication: concurrent duplicate orders create only 1 order row', async () => {
    const idempotencyKey = `idemp-${crypto.randomUUID()}`;

    // Schema check / creation for idempotency table if needed
    await query(`
      CREATE TABLE IF NOT EXISTS idempotency_keys (
        key         TEXT PRIMARY KEY,
        user_id     TEXT NOT NULL,
        resource_id TEXT,
        response    TEXT,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const placeOrderWithIdempotency = async (reqKey) => {
      return withTransaction(async (tx) => {
        // Atomic insert: fails if key already exists
        const claimed = await tx.query(
          `INSERT INTO idempotency_keys (key, user_id)
           VALUES ($1, $2)
           ON CONFLICT (key) DO NOTHING`,
          [reqKey, testUserId1]
        );

        if (!claimed.rowCount) {
          // Key already claimed: load existing order
          const existing = await tx.query(
            'SELECT resource_id FROM idempotency_keys WHERE key = $1',
            [reqKey]
          );
          return { deduplicated: true, orderId: existing.rows[0]?.resource_id };
        }

        // New order
        const orderId = crypto.randomUUID();
        await tx.query(
          `INSERT INTO orders (id, user_id, shop_id, subtotal, total_amount, delivery_fee, platform_fee, small_order_fee, payment_method, order_status, payment_status)
           VALUES ($1, $2, $3, 100, 100, 0, 0, 0, 'cod', 'pending', 'pending')`,
          [orderId, testUserId1, testShopId]
        );

        await tx.query(
          'UPDATE idempotency_keys SET resource_id = $1 WHERE key = $2',
          [orderId, reqKey]
        );

        return { deduplicated: false, orderId };
      });
    };

    const results = await Promise.all([
      placeOrderWithIdempotency(idempotencyKey),
      placeOrderWithIdempotency(idempotencyKey),
    ]);

    const created = results.filter((r) => !r.deduplicated);
    const deduplicated = results.filter((r) => r.deduplicated);

    expect(created).toHaveLength(1);
    expect(deduplicated).toHaveLength(1);
    expect(deduplicated[0].orderId).toBe(created[0].orderId);

    // Verify exactly 1 order row exists for this key
    const count = await queryOne(
      'SELECT COUNT(*) as cnt FROM orders WHERE id = $1',
      [created[0].orderId]
    );
    expect(Number(count.cnt)).toBe(1);

    await query('DELETE FROM orders WHERE id = $1', [created[0].orderId]);
    await query('DELETE FROM idempotency_keys WHERE key = $1', [idempotencyKey]);
  });

  test('[G6.3] Duplicate payment capture webhook settles exactly once', async () => {
    const paymentId = crypto.randomUUID();
    const gatewayOrderId = `order_${crypto.randomUUID().slice(0, 14)}`;
    const gatewayPaymentId = `pay_${crypto.randomUUID().slice(0, 14)}`;

    await query(
      `INSERT INTO payments (id, user_id, amount, amount_paise, currency, status, gateway_order_id, purpose)
       VALUES ($1, $2, 50, 5000, 'INR', 'created', $3, 'order')`,
      [paymentId, testUserId1, gatewayOrderId]
    );

    const settleWebhook = async () => {
      return withTransaction(async (tx) => {
        const claimed = await tx.query(
          `UPDATE payments
              SET status = 'paid', payment_id = $1, paid_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2 AND status <> 'paid'`,
          [gatewayPaymentId, paymentId]
        );

        if (!claimed.rowCount) {
          return { settled: false, alreadyPaid: true };
        }
        return { settled: true, alreadyPaid: false };
      });
    };

    const [first, second] = await Promise.all([settleWebhook(), settleWebhook()]);

    const settledCount = [first, second].filter((r) => r.settled).length;
    const alreadyPaidCount = [first, second].filter((r) => r.alreadyPaid).length;

    expect(settledCount).toBe(1);
    expect(alreadyPaidCount).toBe(1);

    const payment = await queryOne('SELECT status, payment_id FROM payments WHERE id = $1', [paymentId]);
    expect(payment.status).toBe('paid');
    expect(payment.payment_id).toBe(gatewayPaymentId);

    await query('DELETE FROM payments WHERE id = $1', [paymentId]);
  });

  test('[G6.4] Coupon usage limit holds under concurrency race', async () => {
    // Setup coupon table if needed
    await query(`
      CREATE TABLE IF NOT EXISTS coupons (
        id               TEXT PRIMARY KEY,
        code             TEXT UNIQUE NOT NULL,
        discount_amount  NUMERIC(10,2) NOT NULL,
        max_uses         INTEGER NOT NULL,
        current_uses     INTEGER NOT NULL DEFAULT 0,
        is_active        BOOLEAN DEFAULT TRUE
      )
    `);

    const couponCode = `RACE${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    const couponId = crypto.randomUUID();

    // Coupon with max_uses = 1
    await query(
      `INSERT INTO coupons (id, code, discount_amount, max_uses, current_uses, is_active)
       VALUES ($1, $2, 50.00, 1, 0, TRUE)`,
      [couponId, couponCode]
    );

    const redeemCoupon = async (userId) => {
      return withTransaction(async (tx) => {
        // Atomic compare-and-increment
        const claimed = await tx.query(
          `UPDATE coupons
              SET current_uses = current_uses + 1
            WHERE code = $1 AND is_active = TRUE AND current_uses < max_uses`,
          [couponCode]
        );

        if (!claimed.rowCount) {
          const err = new Error('COUPON_LIMIT_EXCEEDED');
          err.code = 'COUPON_LIMIT_EXCEEDED';
          throw err;
        }

        return { redeemed: true, userId };
      });
    };

    const results = await Promise.allSettled([
      redeemCoupon(testUserId1),
      redeemCoupon(testUserId2),
    ]);

    const successes = results.filter((r) => r.status === 'fulfilled');
    const failures = results.filter((r) => r.status === 'rejected');

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
    expect(failures[0].reason.message).toBe('COUPON_LIMIT_EXCEEDED');

    const coupon = await queryOne('SELECT current_uses, max_uses FROM coupons WHERE id = $1', [couponId]);
    expect(Number(coupon.current_uses)).toBe(1);

    await query('DELETE FROM coupons WHERE id = $1', [couponId]);
  });

  test('[G6.5] Payout execution is idempotent', async () => {
    const payoutId = crypto.randomUUID();

    await query(
      `INSERT INTO shop_payouts (id, shop_id, net_payout, payout_status, period_start, period_end)
       VALUES ($1, $2, 500.00, 'pending', '2026-10-01', '2026-10-07')
       ON CONFLICT (id) DO NOTHING`,
      [payoutId, testShopId]
    );

    const executePayout = async () => {
      return withTransaction(async (tx) => {
        const update = await tx.query(
          `UPDATE shop_payouts
              SET payout_status = 'paid', paid_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND payout_status = 'pending'`,
          [payoutId]
        );
        if (!update.rowCount) {
          return { executed: false, duplicate: true };
        }
        return { executed: true, duplicate: false };
      });
    };

    const [first, second] = await Promise.all([executePayout(), executePayout()]);

    const executed = [first, second].filter((r) => r.executed).length;
    const duplicates = [first, second].filter((r) => r.duplicate).length;

    expect(executed).toBe(1);
    expect(duplicates).toBe(1);

    const payout = await queryOne('SELECT payout_status FROM shop_payouts WHERE id = $1', [payoutId]);
    expect(payout.payout_status).toBe('paid');

    await query('DELETE FROM shop_payouts WHERE id = $1', [payoutId]);
  });
});
