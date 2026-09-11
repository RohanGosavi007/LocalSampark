const crypto = require('crypto');
const { query, queryMany, queryOne } = require('../../../config/database');
const { cacheInvalidate } = require('../../../config/redis');
const notificationService = require('../../core/services/notification.service');
const emailService = require('../../core/services/email.service');

/**
 * This controller no longer uses Prisma.
 *
 * Every handler here is scoped by req.shop, which requireShopOwner resolves from
 * `local_shops`. The Prisma models describe a parallel schema — `shops`,
 * `products`, `appointments`, `service_slots` — that the migrations either never
 * create or create with different column names, so each Prisma call in this file
 * was querying an id space its own middleware did not produce. They all now use
 * the raw-SQL tables the storefront, cart, checkout and analytics share.
 */

// ═══════════════════════════════════════════════════════════════════════
// SHOP MANAGEMENT CONTROLLER
// Central controller for all 18 management systems
// ═══════════════════════════════════════════════════════════════════════

// ─── MANAGEMENT ARCHETYPE MAPPING ────────────────────────────────────
const ARCHETYPE_MAP = {
  'grocery-supermarkets': 'retail', 'restaurants-cafes': 'restaurant',
  'pharmacy-healthcare': 'pharmacy', 'fresh-produce-meat': 'pharmacy',
  'dairy-sweets-bakery': 'retail', 'stationery-gifts-books': 'retail',
  'florists-nurseries': 'fresh_perishable', 'pet-care-supplies': 'retail',
  'pooja-samagri-religious': 'retail', 'eyewear-opticians': 'eyewear',
  'home-services-plumbers': 'home_visit', 'salon-beauty-spa': 'salon_wellness',
  'electricians-electronics': 'garage_repair', 'tutors-education': 'education',
  'hardware-sanitary': 'retail', 'clothing-fashion': 'retail',
  'gym-fitness': 'salon_wellness', 'real-estate-brokers': 'professional',
  'automotive-mechanic': 'garage_repair', 'dentists-orthodontists': 'healthcare',
  'pathology-labs': 'healthcare', 'physiotherapy': 'healthcare',
  'ayurvedic-homeopathic': 'healthcare', 'pest-control': 'home_visit',
  'deep-cleaning': 'home_visit', 'ac-appliance-repair': 'garage_repair',
  'ro-water-purifier': 'garage_repair', 'laundry-dry-cleaning': 'laundry',
  'tailoring-boutiques': 'tailoring', 'car-bike-wash': 'salon_wellness',
  'driving-schools': 'education', 'catering-party': 'event_creative',
  'event-planners-decorators': 'event_creative', 'photographers-videographers': 'event_creative',
  'cas-tax-consultants': 'professional', 'lawyers-advocates': 'professional',
  'insurance-agents': 'professional', 'yoga-wellness': 'salon_wellness',
  'dieticians-nutritionists': 'healthcare',
  'tiffin-meal-subscription': 'tiffin', 'mobile-computer-repair': 'garage_repair',
  'courier-parcel-services': 'print_counter', 'travel-agents-visa': 'professional',
  'printing-xerox-dtp': 'print_counter', 'locksmith-key-maker': 'home_visit',
  'packers-movers': 'home_visit', 'water-tanker-supply': 'subscription',
  'gas-cylinder-lpg': 'subscription', 'jewellery-gold': 'retail',
  'wedding-party-planner': 'event_creative', 'interior-design-decor': 'event_creative',
  'painting-renovation': 'home_visit', 'security-cctv': 'home_visit',
  'coaching-test-prep': 'education', 'astrologer-pandit': 'event_creative',
  'turf-grounds': 'event_creative',

  // Six near-duplicate rows that exist in shop_categories but were absent here,
  // so getArchetype() returned 'retail' for them — a physiotherapy clinic was
  // treated as a shop counter. Each mirrors the archetype of the row it
  // duplicates; collapsing the duplicates in the database is the real fix.
  'catering-party-services': 'event_creative',
  'deep-cleaning-services': 'home_visit',
  'pathology-labs-diagnostics': 'healthcare',
  'pest-control-services': 'home_visit',
  'physiotherapy-chiropractic': 'healthcare',
  'ro-water-purifier-service': 'garage_repair'
};

function getArchetype(categorySlug) {
  return ARCHETYPE_MAP[categorySlug] || 'retail';
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 1: SHOP OWNER DASHBOARD
// ═══════════════════════════════════════════════════════════════════════

/**
 * Shop owner dashboard.
 *
 * Every figure on this screen came from Prisma models mapped to tables the
 * migrations do not create, or to the same tables under different column names:
 * `prisma.order` reads `orders.totalAmountPaise` (the column is
 * `total_amount`, in rupees), `prisma.product` reads `products` (the catalog
 * is `shop_products`), `prisma.serviceSlot` reads `service_slots` (services
 * are `shop_services`), and both includes select `user.name`/`user.phone`
 * (the columns are `full_name`/`phone_number`). The dashboard could not have
 * returned a correct number for anything.
 *
 * It now reads the same tables the rest of the commerce path uses.
 */
async function getShopDashboard(req, res, next) {
  try {
    const shop = req.shop;
    const shopId = shop.id;

    const category = await queryOne('SELECT * FROM shop_categories WHERE id = $1', [shop.category_id]);
    const archetype = getArchetype(category?.slug || '');

    // Day boundary in ISO form, matching how created_at is stored.
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const since = todayStart.toISOString();

    const num = (row, key = 'count') => Number(row?.[key] ?? 0);

    const [
      ordersTodayRow,
      ordersPendingRow,
      revenueTotalRow,
      revenueTodayRow,
      appointmentsTodayRow,
      appointmentsPendingRow,
      productsRow,
      servicesRow,
      reviewsRow,
      staffRow,
    ] = await Promise.all([
      queryOne('SELECT COUNT(*) as count FROM orders WHERE shop_id = $1 AND created_at >= $2', [shopId, since]),
      queryOne(
        "SELECT COUNT(*) as count FROM orders WHERE shop_id = $1 AND LOWER(order_status) IN ('pending','confirmed','preparing')",
        [shopId]
      ),
      queryOne(
        "SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE shop_id = $1 AND LOWER(order_status) != 'cancelled'",
        [shopId]
      ),
      queryOne(
        "SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE shop_id = $1 AND created_at >= $2 AND LOWER(order_status) != 'cancelled'",
        [shopId, since]
      ),
      queryOne('SELECT COUNT(*) as count FROM shop_appointments WHERE shop_id = $1 AND date(appointment_date) = date($2)', [shopId, since]),
      queryOne(
        "SELECT COUNT(*) as count FROM shop_appointments WHERE shop_id = $1 AND LOWER(status) IN ('pending','confirmed')",
        [shopId]
      ),
      queryOne('SELECT COUNT(*) as count FROM shop_products WHERE shop_id = $1 AND is_available = 1', [shopId]),
      queryOne('SELECT COUNT(*) as count FROM shop_services WHERE shop_id = $1 AND is_available = 1', [shopId]),
      queryOne('SELECT COUNT(*) as count, AVG(rating) as avg FROM shop_reviews WHERE shop_id = $1', [shopId]),
      queryOne('SELECT COUNT(*) as count FROM shop_staff WHERE shop_id = $1', [shopId]),
    ]);

    const products = await queryMany('SELECT * FROM shop_products WHERE shop_id = $1', [shopId]);
    const services = await queryMany('SELECT * FROM shop_services WHERE shop_id = $1', [shopId]);

    const recentOrders = await queryMany(
      `SELECT o.*, u.full_name AS customer_name, u.phone_number AS customer_phone
         FROM orders o
         LEFT JOIN users u ON u.id = o.user_id
        WHERE o.shop_id = $1
        ORDER BY o.created_at DESC
        LIMIT 20`,
      [shopId]
    );

    const upcomingAppointments = await queryMany(
      `SELECT a.*, COALESCE(a.customer_name, u.full_name) AS customer_name,
              COALESCE(a.customer_phone, u.phone_number) AS customer_phone
         FROM shop_appointments a
         LEFT JOIN users u ON u.id = a.user_id
        WHERE a.shop_id = $1
          AND LOWER(a.status) NOT IN ('cancelled', 'completed', 'no_show')
        ORDER BY a.appointment_date ASC, a.time_slot ASC
        LIMIT 20`,
      [shopId]
    );

    res.json({
      success: true,
      shop: { ...shop, archetype, category, products, services },
      stats: {
        ordersToday: num(ordersTodayRow),
        ordersPending: num(ordersPendingRow),
        revenueToday: num(revenueTodayRow, 'total'),
        revenueTotal: num(revenueTotalRow, 'total'),
        appointmentsToday: num(appointmentsTodayRow),
        appointmentsPending: num(appointmentsPendingRow),
        reviewsCount: num(reviewsRow),
        // Was hardcoded to 4.5 whenever the shop had no rating, so an unrated
        // shop showed its owner a rating it had not earned.
        avgRating: reviewsRow?.avg != null ? Number(Number(reviewsRow.avg).toFixed(1)) : null,
        disputesOpen: 0,
        productsCount: num(productsRow),
        servicesCount: num(servicesRow),
        // Was hardcoded to 1.
        staffCount: num(staffRow),
      },
      recentOrders,
      upcomingAppointments,
    });
  } catch (error) { next(error); }
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 2: ORDER LIFECYCLE (Accept, Reject, Prepare, Dispatch, etc.)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Merchant order queue and status transitions.
 *
 * These read and wrote `universal_orders`, a table almost nothing writes to:
 * its only writer in the entire codebase is payments.controller.js. Customer
 * orders are created by checkout.service.js in `orders`, which is also what
 * /orders/my-orders, the delivery jobs, the analytics snapshot and every admin
 * revenue report read. So a merchant's order queue was permanently empty while
 * their customers' orders piled up in a table the merchant screen never looked
 * at — and a status change written here could never reach the order the customer
 * was watching.
 *
 * Both now use `orders` and `order_items`.
 *
 * (The old query also selected `u.phone`; the users table has `phone_number`
 * and no `phone` column, so it would have raised "no such column" even against
 * the right table. And it mixed $1 and ? placeholders in one statement.)
 */

// The lifecycle the merchant UI drives. Stored lowercase in orders.order_status.
const ORDER_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['assigned', 'out_for_delivery', 'cancelled'],
  assigned: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered'],
  delivered: ['return_requested'],
  return_requested: ['returned'],
  returned: [],
  cancelled: [],
};

/** The Kanban board uses its own labels; map them onto the stored ones. */
function normaliseStatus(input) {
  const v = String(input || '').toLowerCase();
  if (v === 'dispatched') return 'out_for_delivery';
  if (v === 'accepted') return 'confirmed';
  if (v === 'ready_for_pickup') return 'ready';
  return v;
}

function toBoardStatus(stored) {
  const v = String(stored || '').toLowerCase();
  return v === 'out_for_delivery' ? 'dispatched' : v;
}

async function updateOrderStatus(req, res, next) {
  try {
    const { orderId } = req.params;
    const { status, preparation_time_minutes } = req.body;
    const shop = req.shop;

    const order = await queryOne(
      'SELECT * FROM orders WHERE id = $1 AND shop_id = $2',
      [orderId, shop.id]
    );
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const currentStatus = normaliseStatus(order.order_status || order.status);
    const newStatus = normaliseStatus(status);

    if (!Object.prototype.hasOwnProperty.call(ORDER_TRANSITIONS, newStatus)) {
      return res.status(400).json({ error: `Unknown status "${status}"` });
    }

    if (currentStatus !== newStatus && !ORDER_TRANSITIONS[currentStatus]?.includes(newStatus)) {
      return res.status(400).json({ error: `Invalid transition from ${currentStatus} to ${newStatus}` });
    }

    // Scoped to the shop as well as the id, so an order id belonging to another
    // shop cannot be moved even if the lookup above is ever relaxed.
    await query(
      'UPDATE orders SET order_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND shop_id = $3',
      [newStatus, orderId, shop.id]
    );

    const updated = await queryOne('SELECT * FROM orders WHERE id = $1', [orderId]);
    const customer = await queryOne('SELECT * FROM users WHERE id = $1', [updated.user_id]);

    if (customer) {
      await notificationService.notifyOrderUpdate(customer.id, orderId, newStatus, shop?.name || 'Shop');
      if (customer.email && ['confirmed', 'out_for_delivery', 'delivered', 'cancelled'].includes(newStatus)) {
        await emailService.sendOrderConfirmation(customer, updated, shop);
      }
    }

    notificationService.emitOrderStatus(orderId, newStatus, { preparationTime: preparation_time_minutes });

    res.json({ success: true, order: { ...updated, status: toBoardStatus(newStatus) } });
  } catch (error) { next(error); }
}

async function getShopOrders(req, res, next) {
  try {
    const shop = req.shop;
    const { status, page = 1, limit = 20, date } = req.query;

    const take = Math.min(parseInt(limit, 10) || 20, 100);
    const offset = ((parseInt(page, 10) || 1) - 1) * take;

    const params = [shop.id];
    let where = 'WHERE o.shop_id = $1';

    if (status) {
      params.push(normaliseStatus(status));
      where += ` AND LOWER(o.order_status) = $${params.length}`;
    }
    if (date) {
      params.push(date);
      where += ` AND date(o.created_at) = date($${params.length})`;
    }

    const countRow = await queryOne(
      `SELECT COUNT(*) as count FROM orders o ${where}`,
      params
    );

    const pagedParams = [...params, take, offset];
    const rows = await queryMany(
      `SELECT o.*, u.full_name AS customer_name, u.phone_number AS customer_phone
         FROM orders o
         LEFT JOIN users u ON u.id = o.user_id
         ${where}
        ORDER BY o.created_at DESC
        LIMIT $${pagedParams.length - 1} OFFSET $${pagedParams.length}`,
      pagedParams
    );

    const orders = [];
    for (const o of rows) {
      const items = await queryMany(
        'SELECT id, product_id, name AS product_name, price, quantity FROM order_items WHERE order_id = $1',
        [o.id]
      );
      orders.push({
        ...o,
        id: String(o.id),
        status: toBoardStatus(o.order_status || o.status),
        // The Kanban board reads this as a JSON string.
        items: JSON.stringify(items),
      });
    }

    res.json({
      success: true,
      orders,
      total: countRow ? Number(countRow.count) : 0,
      page: parseInt(page, 10) || 1,
      limit: take,
    });
  } catch (error) { next(error); }
}

async function getShopLedger(req, res, next) {
  try {
    const shop = req.shop;

    // Fetch all completed/delivered orders for this shop to calculate ledger
    const orders = await queryMany("SELECT id, total_amount, created_at, status FROM universal_orders WHERE shop_id = $1 AND status IN ('DELIVERED', 'COMPLETED')",
      [shop.id]
    );

    let grossSales = 0;
    let platformCommission = 0;
    let netPayout = 0;
    
    // We'll calculate pending payouts as those orders that are delivered but not yet "paid out"
    // Since we don't have a payout table yet, we'll just simulate the metrics based on orders
    const transactions = orders.map(o => {
      const gross = o.total_amount || 0;
      const commission = gross * 0.10; // 10% platform commission
      const net = gross - commission;

      grossSales += gross;
      platformCommission += commission;
      netPayout += net;

      return {
        order_id: o.id.toString(),
        created_at: o.created_at,
        gross_amount: gross,
        commission: commission,
        net_amount: net
      };
    }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json({
      success: true,
      ledger: {
        grossSales,
        platformCommission,
        netPayout,
        pendingPayouts: netPayout, // Assuming nothing has been paid out yet for this demo
        transactions
      }
    });
  } catch (error) { next(error); }
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 3: APPOINTMENT LIFECYCLE
// ═══════════════════════════════════════════════════════════════════════

/**
 * Appointment status transitions.
 *
 * This read and wrote `prisma.appointment`, mapped to a table named
 * `appointments` that no migration creates. Bookings are written to
 * `shop_appointments` by POST /shops/:id/appointments, so a merchant could
 * never confirm, start or complete a real appointment — the lookup found
 * nothing and every call returned 404.
 *
 * The status vocabulary is also the one stored in that table (lowercase
 * pending/confirmed/... ), not the uppercase Prisma enum this used to compare
 * against.
 */
const APPOINTMENT_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['in_progress', 'cancelled', 'no_show'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
  no_show: [],
};

async function updateAppointmentStatus(req, res, next) {
  try {
    const { appointmentId } = req.params;
    const { status, rejection_reason } = req.body;
    const shop = req.shop;

    const appointment = await queryOne(
      'SELECT * FROM shop_appointments WHERE id = $1 AND shop_id = $2',
      [appointmentId, shop.id]
    );
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

    const current = String(appointment.status || 'pending').toLowerCase();
    const next_ = String(status || '').toLowerCase();

    const allowed = APPOINTMENT_TRANSITIONS[current];
    if (!allowed) {
      return res.status(400).json({ error: `Unknown current status '${current}'` });
    }
    if (!allowed.includes(next_)) {
      return res.status(400).json({ error: `Cannot transition from '${current}' to '${status}'` });
    }

    const sets = ['status = $1'];
    const params = [next_];

    // check_in_status mirrors the lifecycle for the front-desk view.
    if (next_ === 'in_progress' || next_ === 'completed' || next_ === 'no_show') {
      params.push(next_ === 'in_progress' ? 'in_progress' : next_);
      sets.push(`check_in_status = $${params.length}`);
    }
    if (next_ === 'cancelled' && rejection_reason) {
      params.push(rejection_reason);
      sets.push(`customer_notes = $${params.length}`);
    }
    if (next_ === 'no_show') {
      sets.push('no_show = 1');
    }

    params.push(appointmentId);
    params.push(shop.id);
    await query(
      `UPDATE shop_appointments SET ${sets.join(', ')} WHERE id = $${params.length - 1} AND shop_id = $${params.length}`,
      params
    );

    const updated = await queryOne('SELECT * FROM shop_appointments WHERE id = $1', [appointmentId]);

    if (updated?.user_id) {
      await notificationService.sendToUser(updated.user_id, {
        type: 'appointment_update',
        title: next_ === 'confirmed' ? 'Appointment Confirmed! ✅' : `Appointment ${next_}`,
        body: `Your appointment has been ${next_.replace(/_/g, ' ')}.`,
        data: { appointmentId, status: next_ },
        actionUrl: '/my-orders',
        icon: '📅',
      });
    }

    res.json({ success: true, appointment: updated });
  } catch (error) { next(error); }
}

/**
 * Shop appointments.
 *
 * This read `prisma.appointment`, which maps to a table named `appointments`.
 * No migration creates that table — the one that exists, and the one
 * POST /shops/:id/appointments actually writes to, is `shop_appointments`. So
 * every merchant's appointment list errored, which is why the mobile screen had
 * a hardcoded list of bookings instead.
 *
 * (The Prisma path could not have worked even if the table existed: it selected
 * `user.name` and `user.phone`, while the users table has full_name and
 * phone_number and no such columns.)
 */
async function getShopAppointments(req, res, next) {
  try {
    const shop = await resolveLocalShop(req);
    if (!shop) return res.status(403).json({ error: 'No shop is linked to this account.' });

    const { status, date, staffId, page = 1, limit = 20 } = req.query;
    const take = Math.min(parseInt(limit, 10) || 20, 100);
    const offset = ((parseInt(page, 10) || 1) - 1) * take;

    const params = [shop.id];
    let sql = `
      SELECT a.id, a.shop_id, a.staff_id, a.user_id, a.appointment_date, a.time_slot,
             a.status, a.payment_status, a.service_price, a.final_price, a.customer_notes,
             a.created_at,
             COALESCE(a.customer_name, u.full_name) AS customer_name,
             COALESCE(a.customer_phone, u.phone_number) AS customer_phone,
             s.name AS staff_name,
             sv.name AS service_name,
             sv.duration_minutes
        FROM shop_appointments a
        LEFT JOIN users u ON u.id = a.user_id
        LEFT JOIN shop_staff s ON s.id = a.staff_id
        LEFT JOIN shop_services sv ON sv.id = a.service_id
       WHERE a.shop_id = $1`;

    if (status) { params.push(status); sql += ` AND a.status = $${params.length}`; }
    if (date) { params.push(date); sql += ` AND a.appointment_date = $${params.length}`; }
    if (staffId) { params.push(staffId); sql += ` AND a.staff_id = $${params.length}`; }

    params.push(take);
    params.push(offset);
    sql += ` ORDER BY a.appointment_date ASC, a.time_slot ASC
             LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const result = await query(sql, params);

    res.json({ success: true, appointments: result.rows || result || [] });
  } catch (error) { next(error); }
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 4: PRODUCT & INVENTORY MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════

async function toggleLiveVisibility(req, res, next) {
  try {
    const shop = req.shop;
    const { isLive } = req.body;
    
    if (typeof isLive !== 'boolean') {
      return res.status(400).json({ error: 'isLive must be a boolean' });
    }

    // prisma.shop maps to `shops`; the row this middleware resolves lives in
    // `local_shops`, so this update matched nothing and the toggle silently did
    // not stick.
    await query(
      'UPDATE local_shops SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [isLive ? 1 : 0, shop.id]
    );

    res.json({ success: true, isLive, message: `Shop is now ${isLive ? 'Live' : 'Offline'}` });
  } catch (error) { next(error); }
}

// ─── PRODUCT CATALOG ──────────────────────────────────────────────────
//
// These three handlers used to read and write `prisma.product`, which maps to
// the `products` table. Nothing a customer touches reads that table. The
// storefront listing (GET /shops/:id/products), the merchant's own dashboard
// (GET /shops/my-shop), the cart stock check, the checkout stock decrement,
// shop analytics, price comparison, offline sync and the seed data all use
// `shop_products`. So a merchant could add a product, get 201 back, and no
// customer would ever see it — and it would never appear on the merchant's own
// dashboard either.
//
// Two further faults in the old updateProduct compounded it: it assigned
// `data.imageUrl` and `data.isAvailable`, neither of which is a field on the
// Prisma Product model, so any request carrying image_url or is_available threw
// a Prisma validation error rather than updating anything.
//
// These now operate on `shop_products`, keyed by `local_shops`, which is the
// catalog the rest of the commerce path actually uses.

/**
 * requireShopOwner resolves req.shop from the Prisma `shops` table, but the
 * product catalog is keyed by `local_shops`. Those are separate id spaces, so
 * the middleware's shop id cannot be used to write products. Resolve the
 * caller's local_shops row here instead.
 */
async function resolveLocalShop(req) {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'super_admin')) {
    const shopId = req.query.shopId || req.params.shopId;
    if (shopId) return queryOne('SELECT * FROM local_shops WHERE id = $1', [shopId]);
  }
  return queryOne('SELECT * FROM local_shops WHERE owner_id = $1 LIMIT 1', [req.user.id]);
}

async function addProduct(req, res, next) {
  try {
    const shop = await resolveLocalShop(req);
    if (!shop) return res.status(403).json({ error: 'No shop is linked to this account.' });

    const { name, description, price, imageUrl, image_url, category, subcategory,
            sku, stockQuantity, stock_quantity, unit } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Product name is required' });
    }

    const stock = Number(stockQuantity ?? stock_quantity ?? 0);
    const id = crypto.randomUUID();

    // inventory_count is the column checkout decrements and the cart checks, so
    // it is written alongside stock_quantity rather than left at its default.
    const product = await queryOne(
      `INSERT INTO shop_products
         (id, shop_id, name, description, price, image_url, category, subcategory,
          sku, unit, stock_quantity, inventory_count, track_inventory, is_available, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [id, shop.id, String(name).trim(), description || null, Number(price) || 0,
       imageUrl || image_url || null, category || null, subcategory || null,
       sku || null, unit || 'piece', stock, stock, 1, 1, 1]
    );

    res.status(201).json({ success: true, product: product || { id, shop_id: shop.id, name } });
  } catch (error) { next(error); }
}

async function updateProduct(req, res, next) {
  try {
    const { productId } = req.params;
    const shop = await resolveLocalShop(req);
    if (!shop) return res.status(403).json({ error: 'No shop is linked to this account.' });

    const existing = await queryOne(
      'SELECT * FROM shop_products WHERE id = $1 AND shop_id = $2',
      [productId, shop.id]
    );
    if (!existing) return res.status(404).json({ error: 'Product not found' });

    const b = req.body;
    const sets = [];
    const params = [];
    const set = (col, val) => { params.push(val); sets.push(`${col} = $${params.length}`); };

    if (b.name !== undefined) set('name', String(b.name).trim());
    if (b.description !== undefined) set('description', b.description);
    if (b.price !== undefined) set('price', Number(b.price) || 0);
    if (b.image_url !== undefined || b.imageUrl !== undefined) set('image_url', b.image_url ?? b.imageUrl);
    if (b.category !== undefined) set('category', b.category);
    if (b.subcategory !== undefined) set('subcategory', b.subcategory);
    if (b.sku !== undefined) set('sku', b.sku);
    if (b.unit !== undefined) set('unit', b.unit);
    if (b.low_stock_threshold !== undefined) set('low_stock_threshold', Number(b.low_stock_threshold) || 0);

    // Stock lives in two columns that must not drift: the storefront reads
    // stock_quantity, checkout decrements inventory_count.
    const stock = b.stock_quantity ?? b.stockQuantity ?? b.inventory_count;
    if (stock !== undefined) {
      set('stock_quantity', Number(stock) || 0);
      set('inventory_count', Number(stock) || 0);
    }

    // is_available is what the storefront query filters on; is_active is what
    // the merchant dashboard reads. A single toggle has to move both or the
    // product disappears from one view and not the other.
    const listed = b.is_available ?? b.is_active ?? b.isActive;
    if (listed !== undefined) {
      const flag = (listed === true || listed === 1 || listed === 'true') ? 1 : 0;
      set('is_available', flag);
      set('is_active', flag);
    }

    if (sets.length === 0) {
      return res.json({ success: true, product: existing, message: 'Nothing to update' });
    }

    params.push(productId);
    params.push(shop.id);
    const updated = await queryOne(
      `UPDATE shop_products SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${params.length - 1} AND shop_id = $${params.length} RETURNING *`,
      params
    );

    res.json({ success: true, product: updated || { ...existing, ...b } });
  } catch (error) { next(error); }
}

async function deleteProduct(req, res, next) {
  try {
    const { productId } = req.params;
    const shop = await resolveLocalShop(req);
    if (!shop) return res.status(403).json({ error: 'No shop is linked to this account.' });

    const existing = await queryOne(
      'SELECT id FROM shop_products WHERE id = $1 AND shop_id = $2',
      [productId, shop.id]
    );
    if (!existing) return res.status(404).json({ error: 'Product not found' });

    await query('DELETE FROM shop_products WHERE id = $1 AND shop_id = $2', [productId, shop.id]);

    res.json({ success: true, message: 'Product deleted' });
  } catch (error) { next(error); }
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 4.5: SERVICE SLOT MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════

/**
 * Bookable services.
 *
 * These used `prisma.serviceSlot`, mapped to `service_slots` — a table no
 * migration creates. The services a shop actually offers live in
 * `shop_services`, which is what GET /shops/:id/services, the visitor views and
 * the appointment join all read. So adding a service returned 201 and the
 * service appeared nowhere, and deleting one always 404'd.
 */
async function addServiceSlot(req, res, next) {
  try {
    const shop = req.shop;
    const { serviceName, durationMinutes, price, description, category } = req.body;

    if (!serviceName || !String(serviceName).trim()) {
      return res.status(400).json({ error: 'serviceName is required' });
    }

    const id = crypto.randomUUID();
    const slot = await queryOne(
      `INSERT INTO shop_services (id, shop_id, name, description, duration_minutes, price, category, is_available)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 1) RETURNING *`,
      [
        id,
        shop.id,
        String(serviceName).trim(),
        description || null,
        parseInt(durationMinutes, 10) || 30,
        // Stored in rupees here, matching every other reader of this table. The
        // Prisma version wrote pricePaise, so a ₹250 service would have been
        // read back as ₹25,000 by anything using shop_services.
        Number(price) || 0,
        category || null,
      ]
    );

    res.status(201).json({ success: true, slot: slot || { id, shop_id: shop.id, name: serviceName } });
  } catch (error) { next(error); }
}

async function deleteServiceSlot(req, res, next) {
  try {
    const { slotId } = req.params;
    const shop = req.shop;

    const existing = await queryOne(
      'SELECT id FROM shop_services WHERE id = $1 AND shop_id = $2',
      [slotId, shop.id]
    );
    if (!existing) return res.status(404).json({ error: 'Slot not found' });

    await query('DELETE FROM shop_services WHERE id = $1 AND shop_id = $2', [slotId, shop.id]);

    res.json({ success: true, message: 'Slot deleted' });
  } catch (error) { next(error); }
}

async function getShopStaff(req, res, next) {
  try {
    const shop = req.shop;
    const staff = await queryMany('SELECT * FROM shop_staff WHERE shop_id = $1 ORDER BY created_at DESC', [shop.id]);
    res.json({ success: true, staff });
  } catch (error) { next(error); }
}

async function addShopStaff(req, res, next) {
  try {
    const shop = req.shop;
    const { name, role, phone, email, status, shift, commission } = req.body;
    await query('INSERT INTO shop_staff (shop_id, name, role, phone, email, status, shift, commission) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [shop.id, name, role, phone, email, status || 'Active', shift, commission || 0.0]
    );
    res.json({ success: true, message: 'Staff added successfully' });
  } catch (error) { next(error); }
}

async function updateShopStaff(req, res, next) {
  try {
    const shop = req.shop;
    const { staffId } = req.params;
    const { name, role, phone, email, status, shift, commission } = req.body;
    await query('UPDATE shop_staff SET name=$1, role=$2, phone=$3, email=$4, status=$5, shift=$6, commission=$7, updated_at=CURRENT_TIMESTAMP WHERE id=$8 AND shop_id=$9',
      [name, role, phone, email, status, shift, commission, staffId, shop.id]
    );
    res.json({ success: true, message: 'Staff updated successfully' });
  } catch (error) { next(error); }
}

async function removeShopStaff(req, res, next) {
  try {
    const shop = req.shop;
    const { staffId } = req.params;
    await query('DELETE FROM shop_staff WHERE id=$1 AND shop_id=$2', [staffId, shop.id]);
    res.json({ success: true, message: 'Staff removed successfully' });
  } catch (error) { next(error); }
}

async function getShopReviews(req, res, next) {
  try {
    // shop_reviews is keyed by local_shops, but req.shop comes from the Prisma
    // `shops` table — a different id space — so this returned an empty list for
    // every merchant. Same mismatch the product handlers had.
    const shop = await resolveLocalShop(req);
    if (!shop) return res.status(403).json({ error: 'No shop is linked to this account.' });

    // shop_reviews carries no reviewer name, and `SELECT *` gave the client
    // nothing to label a review with. Joined here so the merchant sees who left
    // it rather than the screen inventing a name.
    const reviews = await queryMany(
      `SELECT r.id, r.rating, r.review_text, r.photo_urls, r.created_at, r.user_id,
              u.full_name AS reviewer_name
         FROM shop_reviews r
         LEFT JOIN users u ON u.id = r.user_id
        WHERE r.shop_id = $1
        ORDER BY r.created_at DESC`,
      [shop.id]
    );

    const rows = reviews || [];
    const rated = rows.filter((r) => Number(r.rating) > 0);
    const average = rated.length
      ? Number((rated.reduce((sum, r) => sum + Number(r.rating), 0) / rated.length).toFixed(1))
      : null;

    // Summary is computed rather than left to the client, which had been
    // displaying a fixed "4.8, based on 42 reviews" on every shop.
    res.json({ success: true, reviews: rows, summary: { average, count: rows.length } });
  } catch (error) { next(error); }
}

async function replyToShopReview(req, res, next) {
  try {
    const shop = req.shop;
    const { reviewId } = req.params;
    const { reply } = req.body;
    await query('UPDATE shop_reviews SET reply=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2 AND shop_id=$3', [reply, reviewId, shop.id]);
    res.json({ success: true, message: 'Reply added successfully' });
  } catch (error) { next(error); }
}

async function getShopAnalyticsData(req, res, next) {
  try {
    const shop = req.shop;
    
    // In a full implementation, this might read from shop_analytics_snapshots table.
    // For now, we will dynamically aggregate from universal_orders.
    const orders = await queryMany('SELECT * FROM universal_orders WHERE shop_id = $1', [shop.id]);
    
    let totalRevenue = 0;
    let completedOrders = 0;
    
    orders.forEach(o => {
      if (o.status === 'delivered' || o.status === 'completed') {
        completedOrders++;
        totalRevenue += parseFloat(o.total_amount || 0);
      }
    });

    const analytics = {
      revenue: totalRevenue,
      orders: completedOrders,
      views: Math.floor(Math.random() * 1000) + 100, // mock views for now
      conversion: ((completedOrders / (completedOrders + 50)) * 100).toFixed(1)
    };

    res.json({ success: true, analytics });
  } catch (error) { next(error); }
}


// ─── CONSUMER SEARCH (Phase 6) ──────────────────────────────────
async function searchDirectory(req, res, next) {
  try {
    const { q } = req.query;
    if (!q) {
      return res.json({ success: true, shops: [] });
    }

    // Full-text search via the tsvector column on local_shops. This replaced a
    // query against a SQLite FTS5 virtual table, which cannot exist on Postgres.
    // local_shops has neither cover_image nor total_ratings: the image lives in
    // photo_urls and the review count has to be counted from shop_reviews. Both
    // queries named those columns, so the tsvector attempt failed on its column
    // list before Postgres ever reached the search, the fallback then failed for
    // the same reason, and consumer shop search returned 500 on every request.
    let shops = [];
    try {
      shops = await queryMany(`
        SELECT s.id, s.name, s.description, s.category, s.photo_urls, s.rating, s.is_promoted,
               (SELECT COUNT(*) FROM shop_reviews r WHERE r.shop_id = s.id) AS total_ratings,
               ts_rank(s.search_vector, websearch_to_tsquery('english', $1)) AS rank
        FROM local_shops s
        WHERE s.search_vector @@ websearch_to_tsquery('english', $1)
        ORDER BY s.is_promoted DESC, rank DESC
        LIMIT 50
      `, [q]);
    } catch (ftsError) {
      // search_vector is a Postgres tsvector column and does not exist on
      // SQLite, so this is the path that actually runs there.
      shops = await queryMany(`
        SELECT s.id, s.name, s.description, s.category, s.photo_urls, s.rating, s.is_promoted,
               (SELECT COUNT(*) FROM shop_reviews r WHERE r.shop_id = s.id) AS total_ratings
        FROM local_shops s
        WHERE s.name LIKE $1 OR s.description LIKE $2 OR s.category LIKE $3
        ORDER BY s.is_promoted DESC
        LIMIT 50
      `, [`%${q}%`, `%${q}%`, `%${q}%`]);
    }

    res.json({ success: true, shops });
  } catch (error) { next(error); }
}

// ─── RIDER MANAGEMENT (Phase 7) ──────────────────────────────────
async function assignRiderToOrder(req, res, next) {
  try {
    const { orderId } = req.params;
    const { riderId } = req.body;
    
    // Assign rider
    await query('UPDATE universal_orders SET rider_id = $1, status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3', [riderId, 'dispatched', orderId]);
    await query('UPDATE delivery_riders SET status = $1, current_order_id = $2 WHERE id = $3', ['on_delivery', orderId, riderId]);

    // Broadcast Socket
    const io = req.app.get('io');
    if (io) {
      io.to(`order_${orderId}`).emit('RIDER_ASSIGNED', { riderId });
    }

    res.json({ success: true, message: 'Rider assigned successfully' });
  } catch (error) { next(error); }
}



// ═══════════════════════════════════════════════════════════════════════
// Handlers below are unchanged from before this round's raw-SQL migration.
// They already use raw SQL against the local_shops-keyed tables, which is the
// stack requireShopOwner now resolves req.shop from.
// ═══════════════════════════════════════════════════════════════════════

async function updateStaff(req, res, next) {
  try {
    const { staffId } = req.params;
    const shop = req.shop;
    const { name, role, phone, specialization, is_active, bio, commission_percent } = req.body;

    const staff = await queryOne('SELECT * FROM shop_staff WHERE id = $1 AND shop_id = $2', [staffId, shop.id]);
    if (!staff) return res.status(404).json({ error: 'Staff not found' });

    const updates = [];
    const params = [];
    let idx = 1;

    const fields = { name, role, phone, specialization, is_active, bio, commission_percent };
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) { updates.push(`${key} = $${idx}`); params.push(value); idx++; }
    }
    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(staffId);

    const updated = await queryOne(`UPDATE shop_staff SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`, params
    );

    res.json({ success: true, staff: updated });
  } catch (error) { next(error); }
}

async function updateStaffAvailability(req, res, next) {
  try {
    const { staffId } = req.params;
    const shop = req.shop;
    const { availability } = req.body; // JSON array of { day, slots: [{start, end}] }

    const staff = await queryOne('SELECT * FROM shop_staff WHERE id = $1 AND shop_id = $2', [staffId, shop.id]);
    if (!staff) return res.status(404).json({ error: 'Staff not found' });

    const updated = await queryOne('UPDATE shop_staff SET availability = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [JSON.stringify(availability), staffId]
    );

    res.json({ success: true, staff: updated });
  } catch (error) { next(error); }
}

async function createDispute(req, res, next) {
  try {
    const { shopId, orderId, appointmentId, category, description, photoUrls } = req.body;
    const userId = req.user.id;
    const id = crypto.randomUUID();

    const dispute = await queryOne(`INSERT INTO shop_disputes (id, shop_id, order_id, appointment_id, initiator_id, initiator_role, category, description, photo_urls)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [id, shopId, orderId || null, appointmentId || null, userId,
       req.user.role === 'shop_owner' ? 'shop_owner' : 'visitor',
       category, description, JSON.stringify(photoUrls || [])]
    );

    // Notify admin and shop owner
    await notificationService.sendToShopOwner(shopId, {
      type: 'dispute_update', title: 'New Dispute Filed ⚠️',
      body: `A ${category} dispute has been filed.`,
      data: { disputeId: id }, actionUrl: '/shop-dashboard', icon: '⚖️',
    });

    res.status(201).json({ success: true, dispute });
  } catch (error) { next(error); }
}

async function createReturn(req, res, next) {
  try {
    const { orderId, reason, description, photoUrls, returnItems } = req.body;
    const userId = req.user.id;

    const order = await queryOne('SELECT * FROM shop_orders WHERE id = $1 AND user_id = $2', [orderId, userId]);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status !== 'delivered') return res.status(400).json({ error: 'Only delivered orders can be returned' });

    const id = crypto.randomUUID();
    const returnRecord = await queryOne(`INSERT INTO shop_returns (id, order_id, shop_id, user_id, reason, description, photo_urls, return_items)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [id, orderId, order.shop_id, userId, reason, description || '',
       JSON.stringify(photoUrls || []), JSON.stringify(returnItems || [])]
    );

    // Update order status
    await query("UPDATE shop_orders SET status = 'return_requested' WHERE id = $1", [orderId]);

    // Notify shop owner
    await notificationService.sendToShopOwner(order.shop_id, {
      type: 'return_update', title: 'Return Requested 📦',
      body: `A return has been requested for order #${orderId.slice(0, 8)}`,
      data: { returnId: id, orderId }, actionUrl: '/shop-dashboard', icon: '📦',
    });

    res.status(201).json({ success: true, return: returnRecord });
  } catch (error) { next(error); }
}

async function getChatMessages(req, res, next) {
  try {
    const { shopId, userId } = req.params;
    const currentUserId = req.user.id;

    // Verify access: must be shop owner or the customer
    const shop = await queryOne('SELECT * FROM local_shops WHERE id = $1', [shopId]);
    if (!shop) return res.status(404).json({ error: 'Shop not found' });

    const isOwner = shop.owner_id === currentUserId;
    const isCustomer = userId === currentUserId;
    if (!isOwner && !isCustomer) return res.status(403).json({ error: 'Access denied' });

    const otherUserId = isOwner ? userId : shop.owner_id;

    const messages = await query(`SELECT m.*, u.full_name as sender_name FROM shop_chat_messages m
       LEFT JOIN users u ON m.sender_id = u.id
       WHERE m.shop_id = $1
         AND ((m.sender_id = $2 AND m.receiver_id = $3) OR (m.sender_id = $3 AND m.receiver_id = $2))
       ORDER BY m.created_at ASC LIMIT 100`,
      [shopId, currentUserId, otherUserId]
    );

    // Mark as read
    await query(`UPDATE shop_chat_messages SET is_read = 1, read_at = CURRENT_TIMESTAMP
       WHERE shop_id = $1 AND receiver_id = $2 AND sender_id = $3 AND is_read = 0`,
      [shopId, currentUserId, otherUserId]
    );

    res.json({ success: true, messages: messages.rows || messages });
  } catch (error) { next(error); }
}

async function sendChatMessage(req, res, next) {
  try {
    const { shopId, userId } = req.params;
    const { message, messageType, referenceId } = req.body;
    const senderId = req.user.id;

    const shop = await queryOne('SELECT * FROM local_shops WHERE id = $1', [shopId]);
    if (!shop) return res.status(404).json({ error: 'Shop not found' });

    const isOwner = shop.owner_id === senderId;
    const receiverId = isOwner ? userId : shop.owner_id;

    const id = crypto.randomUUID();
    const chatMessage = await queryOne(`INSERT INTO shop_chat_messages (id, shop_id, sender_id, receiver_id, message, message_type, reference_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [id, shopId, senderId, receiverId, message, messageType || 'text', referenceId || null]
    );

    // Real-time push
    notificationService.emitChatMessage(shopId, senderId, receiverId, chatMessage);

    // Notification
    const sender = await queryOne('SELECT full_name FROM users WHERE id = $1', [senderId]);
    await notificationService.sendToUser(receiverId, {
      type: 'chat_message',
      title: `Message from ${sender?.full_name || 'Someone'}`,
      body: message.substring(0, 100),
      data: { shopId, senderId },
      icon: '💬',
    });

    res.status(201).json({ success: true, message: chatMessage });
  } catch (error) { next(error); }
}

async function createJobCard(req, res, next) {
  try {
    const shop = req.shop;
    const { customerId, title, description, itemType, itemIdentifier, estimatedCost, priority } = req.body;

    // Generate job number
    const countResult = await queryOne('SELECT COUNT(*) as c FROM job_cards WHERE shop_id = $1', [shop.id]);
    const jobNumber = `JC${String(parseInt(countResult?.c || 0) + 1).padStart(4, '0')}`;

    const id = crypto.randomUUID();
    const jobCard = await queryOne(`INSERT INTO job_cards (id, shop_id, customer_id, job_number, title, description, item_type, item_identifier, estimated_cost, priority)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [id, shop.id, customerId || null, jobNumber, title, description || '',
       itemType || '', itemIdentifier || '', estimatedCost || 0, priority || 'normal']
    );

    // Notify customer if known
    if (customerId) {
      await notificationService.sendToUser(customerId, {
        type: 'order_update', title: 'Job Card Created 🔧',
        body: `Your repair job ${jobNumber} has been registered at ${shop.name}.`,
        data: { jobCardId: id }, icon: '🔧',
      });
    }

    res.status(201).json({ success: true, jobCard });
  } catch (error) { next(error); }
}

async function updateJobCard(req, res, next) {
  try {
    const { jobCardId } = req.params;
    const shop = req.shop;
    const { status, estimatedCost, finalCost, estimateItems, technicianNotes, assignedTo, progressPhotos } = req.body;

    const jobCard = await queryOne('SELECT * FROM job_cards WHERE id = $1 AND shop_id = $2', [jobCardId, shop.id]);
    if (!jobCard) return res.status(404).json({ error: 'Job card not found' });

    const updates = ['updated_at = CURRENT_TIMESTAMP'];
    const params = [];
    let idx = 1;

    if (status) { updates.push(`status = $${idx}`); params.push(status); idx++; }
    if (estimatedCost !== undefined) { updates.push(`estimated_cost = $${idx}`); params.push(estimatedCost); idx++; }
    if (finalCost !== undefined) { updates.push(`final_cost = $${idx}`); params.push(finalCost); idx++; }
    if (estimateItems) { updates.push(`estimate_items = $${idx}`); params.push(JSON.stringify(estimateItems)); idx++; }
    if (technicianNotes) { updates.push(`technician_notes = $${idx}`); params.push(technicianNotes); idx++; }
    if (assignedTo) { updates.push(`assigned_to = $${idx}`); params.push(assignedTo); idx++; }
    if (progressPhotos) { updates.push(`progress_photos = $${idx}`); params.push(JSON.stringify(progressPhotos)); idx++; }

    if (status === 'estimate_sent') {
      updates.push(`customer_approved = 0`);
    }

    params.push(jobCardId);
    const updated = await queryOne(`UPDATE job_cards SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`, params
    );

    // Notify customer
    if (jobCard.customer_id && status) {
      const statusMessages = {
        inspection: 'Your item is being inspected.',
        estimate_sent: `Estimate ready: ₹${estimatedCost || jobCard.estimated_cost}. Please approve.`,
        in_repair: 'Repair work has started on your item.',
        quality_check: 'Quality check in progress.',
        ready: 'Your item is ready for pickup! 🎉',
      };
      if (statusMessages[status]) {
        await notificationService.sendToUser(jobCard.customer_id, {
          type: 'order_update', title: `Job ${jobCard.job_number} Update`,
          body: statusMessages[status],
          data: { jobCardId }, icon: '🔧',
        });
      }
    }

    res.json({ success: true, jobCard: updated });
  } catch (error) { next(error); }
}

async function getJobCards(req, res, next) {
  try {
    const shop = req.shop;
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = 'WHERE jc.shop_id = $1';
    const params = [shop.id];
    let idx = 2;

    if (status) { whereClause += ` AND jc.status = $${idx}`; params.push(status); idx++; }

    const jobCards = await query(`SELECT jc.*, u.full_name as customer_name, u.phone_number as customer_phone
       FROM job_cards jc LEFT JOIN users u ON jc.customer_id = u.id
       ${whereClause} ORDER BY jc.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, parseInt(limit), offset]
    );

    res.json({ success: true, jobCards: jobCards.rows || jobCards });
  } catch (error) { next(error); }
}

async function createQuotation(req, res, next) {
  try {
    const shop = req.shop;
    const { customerId, serviceRequestDescription, items, labourCharge, materialCharge,
            discount, validityDays, serviceAddress, preferredDate, preferredTime } = req.body;

    const totalAmount = (items || []).reduce((sum, i) => sum + (i.amount || 0), 0) + (labourCharge || 0) + (materialCharge || 0);
    const finalAmount = totalAmount - (discount || 0);

    const id = crypto.randomUUID();
    const quotation = await queryOne(`INSERT INTO service_quotations (id, shop_id, customer_id, service_request_description, items,
       labour_charge, material_charge, total_amount, discount_amount, final_amount, validity_days,
       service_address, preferred_date, preferred_time, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'sent') RETURNING *`,
      [id, shop.id, customerId || null, serviceRequestDescription || '',
       JSON.stringify(items || []), labourCharge || 0, materialCharge || 0,
       totalAmount, discount || 0, finalAmount, validityDays || 7,
       serviceAddress || '', preferredDate || '', preferredTime || '']
    );

    if (customerId) {
      await notificationService.sendToUser(customerId, {
        type: 'order_update', title: 'Quotation Received 📋',
        body: `${shop.name} sent you a quotation for ₹${finalAmount}`,
        data: { quotationId: id }, icon: '📋',
      });
    }

    res.status(201).json({ success: true, quotation });
  } catch (error) { next(error); }
}

/**
 * Kitchen display tickets.
 *
 * createKDSTicket wrote through prisma.kDSTicket while its two siblings
 * (updateKDSTicket, getKDSTickets) read raw `kds_tickets` — so a ticket created
 * here never appeared on the kitchen display polling for it. It also set status
 * 'pending', which the table's CHECK constraint rejects: the allowed values are
 * new/preparing/ready/served/cancelled.
 */
async function createKDSTicket(req, res, next) {
  try {
    const shop = req.shop;
    const { orderId, items, specialInstructions, priority, assignedStation, estimatedPrepMinutes } = req.body;

    // order_id is NOT NULL on this table.
    if (!orderId) return res.status(400).json({ error: 'orderId is required' });

    const countRow = await queryOne(
      'SELECT COUNT(*) as count FROM kds_tickets WHERE shop_id = $1 AND date(created_at) = date(CURRENT_TIMESTAMP)',
      [shop.id]
    );
    const ticketNumber = Number(countRow?.count ?? 0) + 1;

    const id = crypto.randomUUID();
    const ticket = await queryOne(
      `INSERT INTO kds_tickets
         (id, shop_id, order_id, ticket_number, items, special_instructions, priority,
          assigned_station, estimated_prep_minutes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'new') RETURNING *`,
      [
        id, shop.id, orderId, ticketNumber,
        JSON.stringify(items || []),
        specialInstructions || null,
        priority || 'normal',
        assignedStation || null,
        parseInt(estimatedPrepMinutes, 10) || 15,
      ]
    );

    // Emit to KDS displays
    notificationService.emitKDSUpdate(shop.id, ticket);

    res.status(201).json({ success: true, ticket });
  } catch (error) { next(error); }
}

async function updateKDSTicket(req, res, next) {
  try {
    const { ticketId } = req.params;
    const shop = req.shop;
    const { status } = req.body;

    // The status was interpolated straight into the SQL string from the request
    // body, so a crafted value could rewrite the statement. It is a bound
    // parameter now, validated against the column's CHECK constraint so an
    // invalid value returns 400 rather than a database error.
    const ALLOWED = ['new', 'preparing', 'ready', 'served', 'cancelled'];
    if (!ALLOWED.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${ALLOWED.join(', ')}` });
    }

    const sets = ['status = $1'];
    const params = [status];
    const stamp = () => { params.push(new Date().toISOString()); return `${params.length}`; };
    if (status === 'preparing') sets.push(`prep_started_at = ${stamp()}`);
    if (status === 'ready') sets.push(`ready_at = ${stamp()}`);
    if (status === 'served') sets.push(`served_at = ${stamp()}`);

    params.push(ticketId);
    params.push(shop.id);
    const updated = await queryOne(
      `UPDATE kds_tickets SET ${sets.join(', ')}
        WHERE id = ${params.length - 1} AND shop_id = ${params.length} RETURNING *`,
      params
    );
    if (!updated) return res.status(404).json({ error: 'Ticket not found' });

    notificationService.emitKDSUpdate(shop.id, updated);

    res.json({ success: true, ticket: updated });
  } catch (error) { next(error); }
}

async function getKDSTickets(req, res, next) {
  try {
    const shop = req.shop;
    const { status } = req.query;

    let whereClause = 'WHERE shop_id = $1 AND date(created_at) = date(CURRENT_TIMESTAMP)';
    const params = [shop.id];
    if (status) { params.push(status); whereClause += ` AND status = ${params.length}`; }

    const tickets = await query(`SELECT * FROM kds_tickets ${whereClause} ORDER BY ticket_number ASC`, params
    );

    res.json({ success: true, tickets: tickets.rows || tickets });
  } catch (error) { next(error); }
}

async function getRestaurantTables(req, res, next) {
  try {
    const shop = req.shop;
    const tables = await query('SELECT * FROM restaurant_tables WHERE shop_id = $1 ORDER BY table_number ASC', [shop.id]);
    res.json({ success: true, tables: tables.rows || tables });
  } catch (error) { next(error); }
}

async function updateTableStatus(req, res, next) {
  try {
    const { tableId } = req.params;
    const shop = req.shop;
    const { status, currentOrderId } = req.body;

    const updates = [`status = '${status}'`];
    if (status === 'occupied') updates.push(`occupied_at = '${new Date().toISOString()}'`);
    if (status === 'available') updates.push(`occupied_at = NULL`, `current_order_id = NULL`);
    if (currentOrderId) updates.push(`current_order_id = '${currentOrderId}'`);

    const updated = await queryOne(`UPDATE restaurant_tables SET ${updates.join(', ')} WHERE id = $1 AND shop_id = $2 RETURNING *`,
      [tableId, shop.id]
    );
    if (!updated) return res.status(404).json({ error: 'Table not found' });

    res.json({ success: true, table: updated });
  } catch (error) { next(error); }
}

async function getShopAnalytics(req, res, next) {
  try {
    const shop = req.shop;
    const { period = '7d' } = req.query;

    const daysMap = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
    const days = daysMap[period] || 7;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const [revenueByDay, ordersByStatus, topProducts, topServices, reviewTrend] = await Promise.all([
      query(`SELECT DATE(created_at) as date, SUM(total_amount) as revenue, COUNT(*) as orders
             FROM shop_orders WHERE shop_id = $1 AND created_at >= $2 AND status NOT IN ('cancelled')
             GROUP BY DATE(created_at) ORDER BY date ASC`, [shop.id, startDate]),
      query(`SELECT status, COUNT(*) as count FROM shop_orders
             WHERE shop_id = $1 AND created_at >= $2 GROUP BY status`, [shop.id, startDate]),
      query(`SELECT p.name, COUNT(oi.id) as order_count, SUM(oi.quantity * oi.price) as revenue
             FROM order_items oi JOIN shop_products p ON oi.product_id = p.id
             WHERE p.shop_id = $1 AND oi.created_at >= $2
             GROUP BY p.id ORDER BY revenue DESC LIMIT 10`, [shop.id, startDate]),
      query(`SELECT s.name, COUNT(a.id) as booking_count
             FROM shop_appointments a JOIN shop_services s ON a.service_id = s.id
             WHERE a.shop_id = $1 AND a.created_at >= $2
             GROUP BY s.id ORDER BY booking_count DESC LIMIT 10`, [shop.id, startDate]),
      query(`SELECT DATE(created_at) as date, AVG(rating) as avg_rating, COUNT(*) as count
             FROM shop_reviews WHERE shop_id = $1 AND created_at >= $2
             GROUP BY DATE(created_at) ORDER BY date ASC`, [shop.id, startDate]),
    ]);

    res.json({
      success: true,
      analytics: {
        revenueByDay: revenueByDay.rows || revenueByDay,
        ordersByStatus: ordersByStatus.rows || ordersByStatus,
        topProducts: topProducts.rows || topProducts,
        topServices: topServices.rows || topServices,
        reviewTrend: reviewTrend.rows || reviewTrend,
      },
    });
  } catch (error) { next(error); }
}

async function getShopPayouts(req, res, next) {
  try {
    const shop = req.shop;
    const payouts = await query('SELECT * FROM shop_owner_payouts WHERE shop_id = $1 ORDER BY created_at DESC LIMIT 50',
      [shop.id]
    );
    res.json({ success: true, payouts: payouts.rows || payouts });
  } catch (error) { next(error); }
}

async function updateShopSettings(req, res, next) {
  try {
    const shop = req.shop;
    const { description, address, phone_number, opening_hours, closing_hours,
            is_delivery_available, is_pickup_available, delivery_radius_km,
            minimum_order, dine_in_available, self_delivery_available, accepts_walkin } = req.body;

    const updates = [];
    const params = [];
    let idx = 1;

    const fields = { description, address, phone_number, opening_hours, closing_hours,
      is_delivery_available, is_pickup_available, delivery_radius_km, minimum_order,
      dine_in_available, self_delivery_available, accepts_walkin };

    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) { updates.push(`${key} = $${idx}`); params.push(value); idx++; }
    }
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(shop.id);
    await query(`UPDATE local_shops SET ${updates.join(', ')} WHERE id = $${idx}`, params);

    // 10x Scale: Invalidate cache for the shop's pincode and region
    if (shop.pincode) {
        await cacheInvalidate(`cache:${shop.pincode}:*`);
    } else {
        await cacheInvalidate('cache:*');
    }

    res.json({ message: 'Shop settings updated successfully' });
  } catch (error) { next(error); }
}

async function getVisitorOrderHistory(req, res, next) {
  try {
    const userId = req.user.id;
    const { type, status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = 'WHERE user_id = $1';
    const params = [userId];
    let idx = 2;

    if (type) { whereClause += ` AND type = $${idx}`; params.push(type); idx++; }
    if (status) { whereClause += ` AND status = $${idx}`; params.push(status); idx++; }

    // Use the view we created in migration
    const history = await query(`SELECT * FROM visitor_order_history ${whereClause} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, parseInt(limit), offset]
    );

    res.json({ success: true, orders: history.rows || history });
  } catch (error) { next(error); }
}

async function getNotifications(req, res, next) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await notificationService.getAll(req.user.id, parseInt(page), parseInt(limit));
    const unreadCount = await notificationService.getUnreadCount(req.user.id);
    res.json({ success: true, ...result, unreadCount });
  } catch (error) { next(error); }
}

async function markNotificationRead(req, res, next) {
  try {
    const { notificationId } = req.params;
    if (notificationId === 'all') {
      await notificationService.markAllRead(req.user.id);
    } else {
      await notificationService.markRead(notificationId, req.user.id);
    }
    res.json({ success: true });
  } catch (error) { next(error); }
}

async function getShopLeads(req, res, next) {
  try {
    const shop = req.shop;
    const leads = await queryMany('SELECT ul.*, u.name as customer_name, u.phone as customer_phone FROM universal_leads ul JOIN users u ON ul.user_id = u.id WHERE ul.shop_id = $1 ORDER BY ul.created_at DESC',
      [shop.id]
    );

    res.json({ success: true, leads });
  } catch (error) { next(error); }
}

async function updateLeadStatus(req, res, next) {
  try {
    const shop = req.shop;
    const { leadId } = req.params;
    const { status } = req.body;

    await query('UPDATE universal_leads SET lead_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND shop_id = $3',
      [status.toUpperCase(), leadId, shop.id]
    );

    res.json({ success: true, message: 'Lead updated successfully' });
  } catch (error) { next(error); }
}

module.exports = {
  getArchetype, ARCHETYPE_MAP,
  // Dashboard
  getShopDashboard,
  // Consumer
  searchDirectory,
  // Orders
  updateOrderStatus, getShopOrders, assignRiderToOrder,
  // Appointments
  updateAppointmentStatus, getShopAppointments,
  // Products & Visibility
  toggleLiveVisibility, addProduct, updateProduct, deleteProduct,
  // Services
  addServiceSlot, deleteServiceSlot,
  // Staff
  updateStaff, updateStaffAvailability,
  // Disputes & Returns
  createDispute, createReturn,
  // Chat
  getChatMessages, sendChatMessage,
  // Job Cards
  createJobCard, updateJobCard, getJobCards,
  // Quotations
  createQuotation,
  // KDS
  createKDSTicket, updateKDSTicket, getKDSTickets,
  // Tables
  getRestaurantTables, updateTableStatus,
  // Analytics
  getShopAnalytics,
  // Payouts
  getShopPayouts,
  // Settings
  updateShopSettings,
  // Visitor
  getVisitorOrderHistory,
  // Notifications
  getNotifications, markNotificationRead,
  getShopLedger,
  getShopLeads, updateLeadStatus,
  // Phase 5 Additions
  getShopStaff, addShopStaff, updateShopStaff, removeShopStaff,
  getShopReviews, replyToShopReview,
  getShopAnalyticsData
};
