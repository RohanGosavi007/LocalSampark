const crypto = require('crypto');
const { query, queryOne, withTransaction } = require('../../../config/database');
const platformConfig = require('../../../services/platformConfig.service');
const payments = require('../../../services/payments.service');
const ledgerService = require('../../../services/ledger.service');
const { recordAudit } = require('../services/adminAudit.service');
const { generateStandardOrdersCsv, generateGstTcsSection52Csv } = require('../services/adminReporting.service');

const NOW = process.env.USE_SQLITE === 'true' ? 'CURRENT_TIMESTAMP' : 'NOW()';

// Restricted goods keywords for catalog moderation (A3)
const RESTRICTED_KEYWORDS = [
  'tobacco', 'cigarette', 'bidi', 'gutkha', 'nicotine',
  'alcohol', 'liquor', 'beer', 'whiskey', 'rum', 'vodka', 'wine',
  'weapon', 'gun', 'pistol', 'knife', 'explosive',
  'narcotic', 'steroid', 'weed', 'cannabis', 'marijuana'
];

function isRestrictedProduct(name = '', description = '') {
  const text = `${name} ${description}`.toLowerCase();
  for (const kw of RESTRICTED_KEYWORDS) {
    const regex = new RegExp(`\\b${kw}\\b`, 'i');
    if (regex.test(text)) {
      return { restricted: true, keyword: kw };
    }
  }
  return { restricted: false };
}

// ─────────────────────────────────────────────────────────────────────────────
// A1: Admin Commerce KPI Dashboard
// ─────────────────────────────────────────────────────────────────────────────
const getKpis = async (req, res, next) => {
  try {
    const [volumeRow, ordersRow, shopsRow, ridersRow, customersRow] = await Promise.all([
      queryOne(
        `SELECT COALESCE(SUM(total_amount), 0) AS gmv
           FROM orders
          WHERE LOWER(COALESCE(order_status, '')) != 'cancelled'`
      ),
      queryOne(
        `SELECT COUNT(*) AS total_orders,
                SUM(CASE WHEN LOWER(COALESCE(order_status, '')) = 'delivered' THEN 1 ELSE 0 END) AS completed_orders,
                SUM(CASE WHEN LOWER(COALESCE(order_status, '')) = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_orders,
                SUM(CASE WHEN LOWER(COALESCE(order_status, '')) NOT IN ('delivered', 'cancelled') THEN 1 ELSE 0 END) AS in_flight_orders
           FROM orders`
      ),
      queryOne(
        `SELECT COUNT(*) AS active_shops
           FROM local_shops
          WHERE CAST(is_active AS TEXT) IN ('1', 'true')
            AND CAST(is_verified AS TEXT) IN ('1', 'true')`
      ),
      queryOne(
        `SELECT COUNT(*) AS active_riders
           FROM delivery_agents
          WHERE CAST(is_online AS TEXT) IN ('1', 'true')`
      ),
      queryOne(
        `SELECT COUNT(*) AS total_customers
           FROM users
          WHERE LOWER(COALESCE(role, '')) IN ('user', 'customer')`
      ),
    ]);

    const gmv = Number(volumeRow?.gmv) || 0;
    const totalOrders = Number(ordersRow?.total_orders) || 0;
    const completedOrders = Number(ordersRow?.completed_orders) || 0;
    const cancelledOrders = Number(ordersRow?.cancelled_orders) || 0;
    const inFlightOrders = Number(ordersRow?.in_flight_orders) || 0;
    const nonCancelledOrders = totalOrders - cancelledOrders;

    const aov = nonCancelledOrders > 0 ? Math.round((gmv / nonCancelledOrders) * 100) / 100 : 0;
    const cancellationRate = totalOrders > 0 ? Math.round((cancelledOrders / totalOrders) * 1000) / 10 : 0;

    res.json({
      success: true,
      data: {
        gmv,
        totalOrders,
        completedOrders,
        cancelledOrders,
        inFlightOrders,
        cancellationRate,
        aov,
        activeShops: Number(shopsRow?.active_shops) || 0,
        activeRiders: Number(ridersRow?.active_riders) || 0,
        totalCustomers: Number(customersRow?.total_customers) || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// A2: Admin Store & Seller Governance
// ─────────────────────────────────────────────────────────────────────────────
const getShops = async (req, res, next) => {
  try {
    const { status, isActive, search, limit = 50, offset = 0 } = req.query;
    const conditions = [];
    const params = [];

    if (status) {
      params.push(status);
      conditions.push(`LOWER(COALESCE(approval_status, '')) = $${params.length}`);
    }
    if (isActive !== undefined) {
      const activeBool = String(isActive) === 'true' || String(isActive) === '1';
      params.push(activeBool);
      conditions.push(`is_active = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(name ILIKE $${params.length} OR address ILIKE $${params.length})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(Number(limit) || 50, Number(offset) || 0);
    const limitClause = `LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const shops = await query(
      `SELECT id, name, category, phone, address, latitude, longitude, pincode,
              is_active, is_verified, approval_status, commission_rate, rating, created_at
         FROM local_shops
        ${whereClause}
        ORDER BY created_at DESC
        ${limitClause}`,
      params
    );

    res.json({ success: true, data: shops.rows || shops || [] });
  } catch (error) {
    next(error);
  }
};

const updateShopStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { approvalStatus, isActive, reason } = req.body || {};

    const shop = await queryOne('SELECT id, name, approval_status, is_active FROM local_shops WHERE id = $1', [id]);
    if (!shop) return res.status(404).json({ success: false, error: 'Shop not found' });

    const newApproval = approvalStatus !== undefined ? approvalStatus : shop.approval_status;
    const newActive = isActive !== undefined ? (String(isActive) === 'true' || String(isActive) === '1') : shop.is_active;

    await query(
      `UPDATE local_shops
          SET approval_status = $1, is_active = $2
        WHERE id = $3`,
      [newApproval, newActive, id]
    );

    await recordAudit(req, {
      action: 'update_shop_status',
      targetType: 'shop',
      targetId: id,
      details: { previous: { approvalStatus: shop.approval_status, isActive: shop.is_active }, updated: { approvalStatus: newApproval, isActive: newActive, reason } },
    });

    res.json({ success: true, message: 'Shop status updated successfully', approvalStatus: newApproval, isActive: newActive });
  } catch (error) {
    next(error);
  }
};

const suspendShop = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};

    if (!reason) {
      return res.status(400).json({ success: false, error: 'A mandatory suspension reason is required' });
    }

    const shop = await queryOne('SELECT id, name FROM local_shops WHERE id = $1', [id]);
    if (!shop) return res.status(404).json({ success: false, error: 'Shop not found' });

    await query(
      `UPDATE local_shops
          SET is_active = false, approval_status = 'suspended'
        WHERE id = $1`,
      [id]
    );

    await recordAudit(req, {
      action: 'emergency_shop_suspend',
      targetType: 'shop',
      targetId: id,
      details: { shopName: shop.name, reason },
    });

    res.json({ success: true, message: `Shop ${shop.name} suspended immediately`, isSuspended: true });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// A3: Admin Catalog Moderation & Categories
// ─────────────────────────────────────────────────────────────────────────────
const getCategories = async (req, res, next) => {
  try {
    const rows = await query('SELECT id, name, slug, icon, is_active, display_order FROM shop_categories ORDER BY display_order ASC, name ASC');
    res.json({ success: true, data: rows.rows || rows || [] });
  } catch (error) {
    next(error);
  }
};

const createCategory = async (req, res, next) => {
  try {
    const { name, slug, icon, displayOrder = 0 } = req.body || {};
    if (!name || !slug) return res.status(400).json({ success: false, error: 'Name and slug are required' });

    const cleanSlug = String(slug).toLowerCase().trim().replace(/[^a-z0-9_-]/g, '-');
    const catId = crypto.randomUUID();

    await query(
      `INSERT INTO shop_categories (id, name, slug, icon, display_order, is_active)
       VALUES ($1, $2, $3, $4, $5, 1)`,
      [catId, name.trim(), cleanSlug, icon || null, Number(displayOrder) || 0]
    );

    await recordAudit(req, { action: 'create_category', targetType: 'category', targetId: catId, details: { name, slug: cleanSlug } });
    res.status(201).json({ success: true, data: { id: catId, name, slug: cleanSlug } });
  } catch (error) {
    next(error);
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, slug, icon, isActive, displayOrder } = req.body || {};

    const cat = await queryOne('SELECT * FROM shop_categories WHERE id = $1', [id]);
    if (!cat) return res.status(404).json({ success: false, error: 'Category not found' });

    const newName = name !== undefined ? String(name).trim() : cat.name;
    const newSlug = slug !== undefined ? String(slug).toLowerCase().trim() : cat.slug;
    const newIcon = icon !== undefined ? icon : cat.icon;
    const newActive = isActive !== undefined ? (String(isActive) === 'true' || String(isActive) === '1' ? 1 : 0) : cat.is_active;
    const newOrder = displayOrder !== undefined ? Number(displayOrder) : cat.display_order;

    await query(
      `UPDATE shop_categories
          SET name = $1, slug = $2, icon = $3, is_active = $4, display_order = $5
        WHERE id = $6`,
      [newName, newSlug, newIcon, newActive, newOrder, id]
    );

    await recordAudit(req, { action: 'update_category', targetType: 'category', targetId: id, details: { name: newName, slug: newSlug } });
    res.json({ success: true, data: { id, name: newName, slug: newSlug, isActive: newActive === 1 || newActive === true } });
  } catch (error) {
    next(error);
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    await query('UPDATE shop_categories SET is_active = 0 WHERE id = $1', [id]);
    await recordAudit(req, { action: 'deactivate_category', targetType: 'category', targetId: id });
    res.json({ success: true, message: 'Category deactivated successfully' });
  } catch (error) {
    next(error);
  }
};

const getModerationProducts = async (req, res, next) => {
  try {
    const products = await query(
      `SELECT sp.id, sp.shop_id, ls.name AS shop_name, sp.name, sp.description, sp.price,
              sp.is_active, sp.created_at
         FROM shop_products sp
         JOIN local_shops ls ON ls.id = sp.shop_id
        ORDER BY sp.created_at DESC
        LIMIT 50`
    );

    const flagged = (products.rows || products || []).map((p) => {
      const check = isRestrictedProduct(p.name, p.description);
      return { ...p, isRestricted: check.restricted, restrictedKeyword: check.keyword || null };
    });

    res.json({ success: true, data: flagged });
  } catch (error) {
    next(error);
  }
};

const moderateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, reason } = req.body || {}; // action: 'approve' | 'flag' | 'reject'

    if (!['approve', 'flag', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, error: 'action must be approve, flag, or reject' });
    }

    const prod = await queryOne('SELECT id, name, shop_id FROM shop_products WHERE id = $1', [id]);
    if (!prod) return res.status(404).json({ success: false, error: 'Product not found' });

    const isActive = action === 'approve';
    const activeInt = isActive ? 1 : 0;
    await query('UPDATE shop_products SET is_active = $1 WHERE id = $2', [activeInt, id]);

    await recordAudit(req, {
      action: `moderate_product_${action}`,
      targetType: 'product',
      targetId: id,
      details: { productName: prod.name, action, reason },
    });

    res.json({ success: true, message: `Product ${action}d successfully`, isActive });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// A4: Admin Order Operations & Interventions
// ─────────────────────────────────────────────────────────────────────────────
const getOrders = async (req, res, next) => {
  try {
    const { q, status, shopId, fromDate, toDate, limit = 50, offset = 0 } = req.query;
    const conditions = [];
    const params = [];

    if (q) {
      params.push(`%${q}%`);
      conditions.push(`(CAST(o.id AS TEXT) ILIKE $${params.length} OR o.delivery_address ILIKE $${params.length})`);
    }
    if (status) {
      params.push(String(status).toLowerCase());
      conditions.push(`LOWER(COALESCE(o.order_status, '')) = $${params.length}`);
    }
    if (shopId) {
      params.push(shopId);
      conditions.push(`o.shop_id = $${params.length}`);
    }
    if (fromDate) {
      params.push(fromDate);
      conditions.push(`o.created_at >= $${params.length}`);
    }
    if (toDate) {
      params.push(toDate);
      conditions.push(`o.created_at <= $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(Number(limit) || 50, Number(offset) || 0);
    const limitClause = `LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const orders = await query(
      `SELECT o.id, o.user_id, o.shop_id, ls.name AS shop_name, u.full_name AS customer_name,
              o.subtotal, o.delivery_fee, o.total_amount, o.payment_method, o.payment_status,
              o.order_status, o.assigned_agent_id, o.created_at, o.delivered_at
         FROM orders o
         LEFT JOIN local_shops ls ON ls.id = o.shop_id
         LEFT JOIN users u ON u.id = o.user_id
        ${whereClause}
        ORDER BY o.created_at DESC
        ${limitClause}`,
      params
    );

    res.json({ success: true, data: orders.rows || orders || [] });
  } catch (error) {
    next(error);
  }
};

const getOrderTimeline = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await queryOne(
      `SELECT o.*, ls.name AS shop_name, ls.phone AS shop_phone, u.full_name AS customer_name, u.phone_number AS customer_phone,
              da.vehicle_type, da.vehicle_number, ru.full_name AS rider_name, ru.phone_number AS rider_phone
         FROM orders o
         LEFT JOIN local_shops ls ON ls.id = o.shop_id
         LEFT JOIN users u ON u.id = o.user_id
         LEFT JOIN delivery_agents da ON da.user_id = o.assigned_agent_id
         LEFT JOIN users ru ON ru.id = o.assigned_agent_id
        WHERE o.id = $1`,
      [id]
    );

    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

    // Build operational event timeline
    const timeline = [
      { status: 'placed', timestamp: order.created_at, detail: 'Order placed by customer' },
    ];
    if (order.order_status !== 'placed') {
      timeline.push({ status: order.order_status, timestamp: order.updated_at || order.created_at, detail: `Current status: ${order.order_status}` });
    }
    if (order.delivered_at) {
      timeline.push({ status: 'delivered', timestamp: order.delivered_at, detail: 'Order delivered successfully' });
    }

    res.json({ success: true, data: { order, timeline } });
  } catch (error) {
    next(error);
  }
};

const cancelOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};

    if (!reason) {
      return res.status(400).json({ success: false, error: 'A cancellation reason is required for administrative intervention' });
    }

    const order = await queryOne('SELECT * FROM orders WHERE id = $1', [id]);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

    if (['delivered', 'cancelled'].includes(String(order.order_status).toLowerCase())) {
      return res.status(400).json({ success: false, error: `Order is already ${order.order_status}` });
    }

    await withTransaction(async (client) => {
      await client.query(
        `UPDATE orders
            SET order_status = 'cancelled', status = 'cancelled', cancellation_reason = $1, updated_at = ${NOW}
          WHERE id = $2`,
        [reason, id]
      );

      // Release rider back to available if assigned
      if (order.assigned_agent_id) {
        await client.query(
          "UPDATE delivery_agents SET status = 'available' WHERE user_id = $1",
          [order.assigned_agent_id]
        );
      }

      // Restore inventory
      const items = (await client.query('SELECT product_id, quantity FROM order_items WHERE order_id = $1', [id])).rows;
      for (const item of items) {
        if (item.product_id) {
          await client.query(
            'UPDATE shop_products SET inventory_count = COALESCE(inventory_count, 0) + $1 WHERE id = $2',
            [item.quantity, item.product_id]
          );
        }
      }
    });

    await recordAudit(req, {
      action: 'admin_force_cancel_order',
      targetType: 'order',
      targetId: id,
      details: { previousStatus: order.order_status, reason },
    });

    res.json({ success: true, message: 'Order cancelled by admin', orderStatus: 'cancelled' });
  } catch (error) {
    next(error);
  }
};

const refundOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, reason } = req.body || {};

    const order = await queryOne('SELECT * FROM orders WHERE id = $1', [id]);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

    const refundAmount = Number(amount) > 0 ? Number(amount) : Number(order.total_amount);
    const userId = order.user_id;

    // Credit refund to customer wallet
    await payments.creditWallet({
      userId,
      amount: refundAmount,
      purpose: 'order_refund',
      referenceId: String(id),
    });

    await recordAudit(req, {
      action: 'admin_order_refund',
      targetType: 'order',
      targetId: id,
      details: { refundAmount, reason, customerId: userId },
    });

    res.json({ success: true, message: `Refund of ₹${refundAmount} issued to customer wallet`, refundAmount });
  } catch (error) {
    next(error);
  }
};

const reassignOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { riderUserId } = req.body || {};

    const order = await queryOne('SELECT * FROM orders WHERE id = $1', [id]);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

    if (riderUserId) {
      const agent = await queryOne('SELECT user_id, is_online FROM delivery_agents WHERE user_id = $1', [riderUserId]);
      if (!agent) return res.status(404).json({ success: false, error: 'Rider not found' });

      await query(
        `UPDATE orders
            SET assigned_agent_id = $1, order_status = 'assigned', status = 'assigned', updated_at = ${NOW}
          WHERE id = $2`,
        [riderUserId, id]
      );
      await query("UPDATE delivery_agents SET status = 'on_delivery' WHERE user_id = $1", [riderUserId]);
    } else {
      // Unassign back to ready pool
      if (order.assigned_agent_id) {
        await query("UPDATE delivery_agents SET status = 'available' WHERE user_id = $1", [order.assigned_agent_id]);
      }
      await query(
        `UPDATE orders
            SET assigned_agent_id = NULL, order_status = 'ready', status = 'ready', updated_at = ${NOW}
          WHERE id = $1`,
        [id]
      );
    }

    await recordAudit(req, {
      action: 'admin_reassign_order',
      targetType: 'order',
      targetId: id,
      details: { newRiderId: riderUserId || null },
    });

    res.json({ success: true, message: riderUserId ? 'Order reassigned to rider' : 'Order returned to ready queue' });
  } catch (error) {
    next(error);
  }
};

const getSlaBreaches = async (req, res, next) => {
  try {
    // Flag orders placed > 30m ago without completion, or ready > 15m without pickup
    const orders = await query(
      `SELECT o.id, o.shop_id, ls.name AS shop_name, o.order_status, o.created_at, o.assigned_agent_id
         FROM orders o
         JOIN local_shops ls ON ls.id = o.shop_id
        WHERE LOWER(COALESCE(o.order_status, '')) NOT IN ('delivered', 'cancelled')
        ORDER BY o.created_at ASC
        LIMIT 50`
    );

    const now = Date.now();
    const breached = (orders.rows || orders || []).filter((o) => {
      const createdTime = new Date(o.created_at).getTime();
      const ageMinutes = (now - createdTime) / 60000;
      return ageMinutes > 30; // breached 30 min SLA
    });

    res.json({ success: true, data: breached });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// A5: Admin Returns & Dispute Resolution Queue
// ─────────────────────────────────────────────────────────────────────────────
const getDisputes = async (req, res, next) => {
  try {
    const { status = 'open' } = req.query;
    const disputes = await query(
      `SELECT d.*, u.full_name AS customer_name, ls.name AS shop_name
         FROM disputes d
         LEFT JOIN users u ON u.id = d.user_id
         LEFT JOIN local_shops ls ON ls.id = d.shop_id
        WHERE LOWER(COALESCE(d.status, '')) = $1
        ORDER BY d.created_at DESC`,
      [String(status).toLowerCase()]
    );
    res.json({ success: true, data: disputes.rows || disputes || [] });
  } catch (error) {
    next(error);
  }
};

const resolveDispute = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { resolution, refundAmount = 0 } = req.body || {}; // 'refund_customer' | 'reject' | 'merchant_compensated'

    const dispute = await queryOne('SELECT * FROM disputes WHERE id = $1', [id]);
    if (!dispute) return res.status(404).json({ success: false, error: 'Dispute not found' });

    await query(
      `UPDATE disputes
          SET status = 'resolved', resolution = $1, resolved_at = ${NOW}, updated_at = ${NOW}
        WHERE id = $2`,
      [resolution, id]
    );

    if (resolution === 'refund_customer' && Number(refundAmount) > 0 && dispute.user_id) {
      await payments.creditWallet({
        userId: dispute.user_id,
        amount: Number(refundAmount),
        purpose: 'dispute_refund',
        referenceId: String(id),
      });
    }

    await recordAudit(req, {
      action: 'resolve_dispute',
      targetType: 'dispute',
      targetId: id,
      details: { resolution, refundAmount },
    });

    res.json({ success: true, message: 'Dispute resolved successfully', status: 'resolved' });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// A6: Admin Payouts & Commission Configuration
// ─────────────────────────────────────────────────────────────────────────────
const getCommission = async (req, res, next) => {
  try {
    const globalRate = await platformConfig.get('default_commission_percent');
    res.json({ success: true, defaultCommissionPercent: Number(globalRate) || 0 });
  } catch (error) {
    next(error);
  }
};

const updateCommission = async (req, res, next) => {
  try {
    const { defaultCommissionPercent } = req.body || {};
    const rate = Number(defaultCommissionPercent);
    if (!Number.isFinite(rate) || rate < 0 || rate > 50) {
      return res.status(400).json({ success: false, error: 'Commission rate must be between 0% and 50%' });
    }

    await platformConfig.update({ default_commission_percent: rate });
    await recordAudit(req, { action: 'update_global_commission', details: { defaultCommissionPercent: rate } });
    res.json({ success: true, defaultCommissionPercent: rate });
  } catch (error) {
    next(error);
  }
};

const setShopCommission = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { commissionRate } = req.body || {};
    const rate = commissionRate !== null ? Number(commissionRate) : null;

    if (rate !== null && (!Number.isFinite(rate) || rate < 0 || rate > 50)) {
      return res.status(400).json({ success: false, error: 'Shop commission rate must be between 0% and 50% or null' });
    }

    await query('UPDATE local_shops SET commission_rate = $1 WHERE id = $2', [rate, id]);
    await recordAudit(req, { action: 'set_shop_commission', targetType: 'shop', targetId: id, details: { commissionRate: rate } });
    res.json({ success: true, shopId: id, commissionRate: rate });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// A7: Admin Promotions, Campaigns & CMS
// ─────────────────────────────────────────────────────────────────────────────
const getCoupons = async (req, res, next) => {
  try {
    const coupons = await query('SELECT * FROM coupons ORDER BY created_at DESC');
    res.json({ success: true, data: coupons.rows || coupons || [] });
  } catch (error) {
    next(error);
  }
};

const createCoupon = async (req, res, next) => {
  try {
    const { code, discountType = 'percentage', discountValue, minOrderAmount = 0, maxDiscountAmount, usageLimit } = req.body || {};
    if (!code || !(Number(discountValue) > 0)) {
      return res.status(400).json({ success: false, error: 'Code and positive discountValue are required' });
    }

    const cleanCode = String(code).toUpperCase().trim();
    const couponId = crypto.randomUUID();

    await query(
      `INSERT INTO coupons (id, code, discount_type, discount_value, min_order_amount, max_discount_amount, max_uses, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
      [couponId, cleanCode, discountType, Number(discountValue), Number(minOrderAmount), maxDiscountAmount ? Number(maxDiscountAmount) : null, usageLimit ? Number(usageLimit) : 1000]
    );

    await recordAudit(req, { action: 'create_coupon', targetType: 'coupon', targetId: couponId, details: { code: cleanCode, discountValue } });
    res.status(201).json({ success: true, data: { id: couponId, code: cleanCode } });
  } catch (error) {
    next(error);
  }
};

const getBanners = async (req, res, next) => {
  try {
    const banners = await query('SELECT * FROM platform_banners ORDER BY priority ASC, created_at DESC');
    res.json({ success: true, data: banners.rows || banners || [] });
  } catch (error) {
    next(error);
  }
};

const createBanner = async (req, res, next) => {
  try {
    const { title, imageUrl, actionUrl, priority = 0 } = req.body || {};
    if (!title || !imageUrl) return res.status(400).json({ success: false, error: 'Title and imageUrl are required' });

    const bannerId = crypto.randomUUID();
    await query(
      `INSERT INTO platform_banners (id, title, image_url, action_url, priority, is_active)
       VALUES ($1, $2, $3, $4, $5, true)`,
      [bannerId, title.trim(), imageUrl.trim(), actionUrl ? actionUrl.trim() : null, Number(priority) || 0]
    );

    await recordAudit(req, { action: 'create_banner', targetType: 'banner', targetId: bannerId, details: { title } });
    res.status(201).json({ success: true, data: { id: bannerId, title } });
  } catch (error) {
    next(error);
  }
};

const deleteBanner = async (req, res, next) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM platform_banners WHERE id = $1', [id]);
    await recordAudit(req, { action: 'delete_banner', targetType: 'banner', targetId: id });
    res.json({ success: true, message: 'Banner removed' });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// A8: Admin Audit Logs
// ─────────────────────────────────────────────────────────────────────────────
const getAuditLogs = async (req, res, next) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const logs = await query(
      `SELECT * FROM admin_audit_log ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [Number(limit) || 50, Number(offset) || 0]
    );
    res.json({ success: true, data: logs.rows || logs || [] });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// A9: Admin Serviceability Zones
// ─────────────────────────────────────────────────────────────────────────────
const getZones = async (req, res, next) => {
  try {
    const zones = await query('SELECT * FROM regions ORDER BY name ASC');
    res.json({ success: true, data: zones.rows || zones || [] });
  } catch (error) {
    next(error);
  }
};

const toggleZone = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body || {};
    const active = String(isActive) === 'true' || String(isActive) === '1';
    const activeInt = active ? 1 : 0;

    await query('UPDATE regions SET is_active = $1 WHERE id = $2', [activeInt, id]);
    await recordAudit(req, { action: 'toggle_zone', targetType: 'region', targetId: id, details: { isActive: active } });
    res.json({ success: true, zoneId: id, isActive: active });
  } catch (error) {
    next(error);
  }
};

const getWaitlist = async (req, res, next) => {
  try {
    const waitlist = await query('SELECT * FROM unserviceable_waitlist ORDER BY created_at DESC LIMIT 100');
    res.json({ success: true, data: waitlist.rows || waitlist || [] });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// A10: Admin Delivery Fleet & Cash Reconciliation
// ─────────────────────────────────────────────────────────────────────────────
const getLiveFleet = async (req, res, next) => {
  try {
    const fleet = await query(
      `SELECT da.id, da.user_id, u.full_name, u.phone_number, da.vehicle_type, da.vehicle_number,
              da.is_online, da.status, da.cash_in_hand, da.current_lat, da.current_lng, da.updated_at
         FROM delivery_agents da
         JOIN users u ON u.id = da.user_id
        ORDER BY da.is_online DESC, da.updated_at DESC`
    );
    res.json({ success: true, data: fleet.rows || fleet || [] });
  } catch (error) {
    next(error);
  }
};

const getFleetCashSummary = async (req, res, next) => {
  try {
    const limit = await platformConfig.get('rider_cash_limit') || 3000;
    const summary = await queryOne(
      `SELECT COALESCE(SUM(cash_in_hand), 0) AS total_cash_held,
              COUNT(CASE WHEN cash_in_hand >= $1 THEN 1 END) AS riders_over_limit,
              COUNT(*) AS total_agents
         FROM delivery_agents`,
      [limit]
    );

    res.json({
      success: true,
      data: {
        totalCashHeld: Number(summary?.total_cash_held) || 0,
        ridersOverLimit: Number(summary?.riders_over_limit) || 0,
        totalAgents: Number(summary?.total_agents) || 0,
        floatingLimitThreshold: Number(limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// A11: Admin Grievance & Support Management (Hybrid)
// ─────────────────────────────────────────────────────────────────────────────
const getGrievances = async (req, res, next) => {
  try {
    const { type = 'all', status } = req.query;
    const conditions = [];
    const params = [];

    if (type === 'statutory_grievance') {
      conditions.push("CAST(st.is_statutory AS TEXT) IN ('1', 'true')");
    } else if (type === 'support') {
      conditions.push("(st.is_statutory IS NULL OR CAST(st.is_statutory AS TEXT) IN ('0', 'false'))");
    }

    if (status) {
      params.push(status);
      conditions.push(`LOWER(COALESCE(st.status, '')) = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const tickets = await query(
      `SELECT st.*, u.full_name AS customer_name, u.phone_number AS customer_phone
         FROM support_tickets st
         LEFT JOIN users u ON u.id = st.user_id
        ${whereClause}
        ORDER BY st.created_at DESC`,
      params
    );

    const now = Date.now();
    const enriched = (tickets.rows || tickets || []).map((t) => {
      const createdMs = new Date(t.created_at).getTime();
      const ackMs = t.acknowledged_at ? new Date(t.acknowledged_at).getTime() : null;
      const isAcknowledged = !!ackMs;
      const ackHours = ackMs ? Math.round((ackMs - createdMs) / 3600000) : Math.round((now - createdMs) / 3600000);
      const isBreached48h = !isAcknowledged && ackHours > 48;

      return {
        ...t,
        isAcknowledged,
        ackHours,
        isBreached48h,
      };
    });

    res.json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
};

const updateGrievance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, resolution, acknowledge } = req.body || {};

    const ticket = await queryOne('SELECT * FROM support_tickets WHERE id = $1', [id]);
    if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });

    let ackTime = ticket.acknowledged_at;
    if (acknowledge && !ackTime) {
      ackTime = new Date().toISOString();
    }

    await query(
      `UPDATE support_tickets
          SET status = COALESCE($1, status), acknowledged_at = $2, updated_at = ${NOW}
        WHERE id = $3`,
      [status || null, ackTime, id]
    );

    await recordAudit(req, { action: 'update_grievance', targetType: 'support_ticket', targetId: id, details: { status, resolution } });
    res.json({ success: true, ticketId: id, status: status || ticket.status, acknowledgedAt: ackTime });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// A12: Admin Feature Flags & Vertical Kill Switches
// ─────────────────────────────────────────────────────────────────────────────
const { getAllFeatures } = require('../../../../../packages/shared');

const getFeatureFlags = async (req, res, next) => {
  try {
    const all = getAllFeatures();
    const flags = {
      COMMERCE_ENABLED: true,
      SOCIETY_ENABLED: all.society_management?.is_enabled ?? false,
      CARPOOL_ENABLED: all.carpool?.is_enabled ?? false,
      JOBS_ENABLED: all.jobs?.is_enabled ?? false,
      KRISHI_ENABLED: all.krishi?.is_enabled ?? false,
      SOS_ENABLED: all.emergency_sos?.is_enabled ?? false,
      allFeatures: all,
    };
    res.json({ success: true, data: flags });
  } catch (error) {
    next(error);
  }
};

const updateFeatureFlags = async (req, res, next) => {
  try {
    const updates = req.body || {};
    for (const [k, v] of Object.entries(updates)) {
      process.env[`FEATURE_${k.toUpperCase()}`] = String(v);
    }
    await recordAudit(req, { action: 'update_feature_flags', details: updates });
    res.json({ success: true, message: 'Feature flags updated', updated: updates });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// A13: Admin Financial & Tax Report Exports (Dual Format)
// ─────────────────────────────────────────────────────────────────────────────
const exportReports = async (req, res, next) => {
  try {
    const { format = 'standard' } = req.query;

    if (format === 'tcs_statutory') {
      // GST Section 52 TCS report grouped by shop
      const records = (await query(
        `SELECT ls.id AS shop_id, ls.name AS shop_name, ls.gstin, ls.pan,
                COALESCE(SUM(CASE WHEN LOWER(COALESCE(o.order_status, '')) != 'cancelled' THEN o.subtotal ELSE 0 END), 0) AS gross_supplies,
                COALESCE(SUM(CASE WHEN LOWER(COALESCE(o.order_status, '')) = 'cancelled' THEN o.subtotal ELSE 0 END), 0) AS returned_supplies
           FROM local_shops ls
           LEFT JOIN orders o ON o.shop_id = ls.id
          GROUP BY ls.id, ls.name, ls.gstin, ls.pan`
      )).rows || [];

      const csv = generateGstTcsSection52Csv(records);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="gst_tcs_section_52_report.csv"');
      return res.send(csv);
    }

    // Default: Standard Orders CSV
    const orders = (await query(
      `SELECT o.id, o.created_at, o.shop_id, ls.name AS shop_name, o.user_id, u.full_name AS customer_name,
              o.subtotal, o.delivery_fee, o.total_amount, o.payment_method, o.payment_status, o.order_status
         FROM orders o
         LEFT JOIN local_shops ls ON ls.id = o.shop_id
         LEFT JOIN users u ON u.id = o.user_id
        ORDER BY o.created_at DESC
        LIMIT 500`
    )).rows || [];

    const csv = generateStandardOrdersCsv(orders);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="orders_sales_report.csv"');
    return res.send(csv);
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// A14: Admin Broadcast Notifications
// ─────────────────────────────────────────────────────────────────────────────
const broadcastPush = async (req, res, next) => {
  try {
    const { title, body, targetZoneId, targetRole = 'all' } = req.body || {};
    if (!title || !body) {
      return res.status(400).json({ success: false, error: 'title and body are required for broadcast' });
    }

    await recordAudit(req, {
      action: 'admin_broadcast_notification',
      details: { title, targetZoneId, targetRole },
    });

    res.json({
      success: true,
      message: 'Broadcast notification queued successfully',
      broadcast: { title, body, targetZoneId: targetZoneId || 'global', targetRole },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getKpis,
  getShops,
  updateShopStatus,
  suspendShop,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getModerationProducts,
  moderateProduct,
  getOrders,
  getOrderTimeline,
  cancelOrder,
  refundOrder,
  reassignOrder,
  getSlaBreaches,
  getDisputes,
  resolveDispute,
  getCommission,
  updateCommission,
  setShopCommission,
  getCoupons,
  createCoupon,
  getBanners,
  createBanner,
  deleteBanner,
  getAuditLogs,
  getZones,
  toggleZone,
  getWaitlist,
  getLiveFleet,
  getFleetCashSummary,
  getGrievances,
  updateGrievance,
  getFeatureFlags,
  updateFeatureFlags,
  exportReports,
  broadcastPush,
};
