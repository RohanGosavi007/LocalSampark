const crypto = require('crypto');
const { query, queryOne } = require('../config/database');

class CouponError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'CouponError';
    this.status = status;
    this.code = code;
  }
}

/**
 * Validate a coupon code against cart value and user eligibility.
 */
async function validateCoupon({ code, cartTotal, userId = null, shopId = null }) {
  if (!code || typeof code !== 'string') {
    throw new CouponError(400, 'INVALID_CODE', 'Coupon code is required');
  }
  const cleanCode = code.trim().toUpperCase();
  const total = Number(cartTotal) || 0;

  const coupon = await queryOne(
    `SELECT * FROM coupons 
      WHERE UPPER(code) = $1 
        AND is_active = true`,
    [cleanCode]
  );

  if (!coupon) {
    throw new CouponError(404, 'COUPON_NOT_FOUND', 'Invalid or expired coupon code');
  }

  // Check validity dates
  const now = new Date();
  if (coupon.start_date && new Date(coupon.start_date) > now) {
    throw new CouponError(400, 'COUPON_NOT_STARTED', 'This coupon is not active yet');
  }
  if (coupon.end_date && new Date(coupon.end_date) < now) {
    throw new CouponError(400, 'COUPON_EXPIRED', 'This coupon has expired');
  }

  // Check total uses limit
  if (coupon.max_uses && Number(coupon.current_uses) >= Number(coupon.max_uses)) {
    throw new CouponError(400, 'COUPON_EXHAUSTED', 'This coupon has reached its maximum total uses');
  }

  // Check shop scope
  if (coupon.shop_id && shopId && String(coupon.shop_id) !== String(shopId)) {
    throw new CouponError(400, 'SHOP_MISMATCH', 'This coupon is not valid for this shop');
  }

  // Check minimum order value
  const minOrder = Number(coupon.min_order_amount) || 0;
  if (total < minOrder) {
    throw new CouponError(400, 'MIN_ORDER_NOT_MET', `Minimum order value for this coupon is ₹${minOrder}`);
  }

  // Check first-order-only requirement
  const isFirstOrderOnly = coupon.first_order_only === 1 || coupon.first_order_only === true || coupon.first_order_only === 'true';
  if (isFirstOrderOnly && userId) {
    const prior = await queryOne(
      `SELECT COUNT(*) as count FROM orders 
        WHERE user_id = $1 AND order_status != 'cancelled'`,
      [userId]
    );
    const count = Number(prior?.count || 0);
    if (count > 0) {
      throw new CouponError(400, 'FIRST_ORDER_ONLY', 'This coupon is valid only on your first order');
    }
  }

  // Check per-user limit
  const perUserLimit = Number(coupon.per_user_limit) || 1;
  if (userId) {
    const redemptions = await queryOne(
      `SELECT COUNT(*) as count FROM coupon_redemptions 
        WHERE coupon_id = $1 AND user_id = $2`,
      [coupon.id, userId]
    );
    const used = Number(redemptions?.count || 0);
    if (used >= perUserLimit) {
      throw new CouponError(400, 'USER_LIMIT_REACHED', 'You have already used this coupon the maximum allowed times');
    }
  }

  // Calculate discount
  let discount = 0;
  const discountType = (coupon.discount_type || 'fixed').toLowerCase();
  const discountVal = Number(coupon.discount_value) || 0;
  const maxDiscount = coupon.max_discount_amount ? Number(coupon.max_discount_amount) : null;

  if (discountType === 'fixed') {
    discount = Math.min(discountVal, total);
  } else if (discountType === 'percentage') {
    discount = (total * discountVal) / 100;
    if (maxDiscount && discount > maxDiscount) {
      discount = maxDiscount;
    }
  } else if (discountType === 'free_delivery') {
    // Handled at checkout delivery fee offset
    discount = 0;
  }

  return {
    valid: true,
    coupon: {
      id: coupon.id,
      code: coupon.code,
      type: discountType,
      discount: Math.round(discount * 100) / 100,
      discount_value: discountVal,
      message: coupon.description || (discountType === 'free_delivery' ? 'Free delivery applied!' : `₹${discount} discount applied!`)
    }
  };
}

/**
 * Atomically redeem a coupon during order placement inside a database transaction.
 */
async function redeemCoupon({ couponId, userId, orderId, discountApplied, client }) {
  if (!couponId || !userId) return null;
  const db = client || { query };

  // Atomic increment with race condition prevention
  const updateResult = await db.query(
    `UPDATE coupons 
        SET current_uses = current_uses + 1, 
            updated_at = CURRENT_TIMESTAMP 
      WHERE id = $1 
        AND current_uses < max_uses`,
    [couponId]
  );

  const rowCount = updateResult.rowCount ?? updateResult.changes ?? 0;
  if (rowCount === 0) {
    throw new CouponError(409, 'COUPON_LIMIT_EXCEEDED', 'Coupon was claimed by another customer');
  }

  const redemptionId = crypto.randomUUID();
  await db.query(
    `INSERT INTO coupon_redemptions (id, coupon_id, user_id, order_id, discount_applied) 
     VALUES ($1, $2, $3, $4, $5)`,
    [redemptionId, couponId, userId, orderId || null, Number(discountApplied) || 0]
  );

  return { success: true, redemptionId };
}

/**
 * List all coupons with filters (for admin and shops)
 */
async function listCoupons({ shopId = null, activeOnly = false } = {}) {
  let sql = 'SELECT * FROM coupons WHERE 1=1';
  const params = [];

  if (shopId) {
    params.push(shopId);
    sql += ` AND (shop_id = $${params.length} OR shop_id IS NULL)`;
  }
  if (activeOnly) {
    sql += ' AND is_active = true';
  }
  sql += ' ORDER BY created_at DESC';

  const res = await query(sql, params);
  return res.rows || res;
}

/**
 * Create a new coupon (Admin/Seller)
 */
async function createCoupon(data) {
  const id = crypto.randomUUID();
  const code = (data.code || '').trim().toUpperCase();
  if (!code) throw new CouponError(400, 'INVALID_DATA', 'Coupon code is required');

  const existing = await queryOne('SELECT id FROM coupons WHERE UPPER(code) = $1', [code]);
  if (existing) throw new CouponError(409, 'DUPLICATE_CODE', 'A coupon with this code already exists');

  const discountType = data.discount_type || 'fixed';
  const discountValue = Number(data.discount_value) || 0;
  const minOrder = Number(data.min_order_amount) || 0;
  const maxDiscount = data.max_discount_amount ? Number(data.max_discount_amount) : null;
  const maxUses = Number(data.max_uses) || 1000;
  const perUserLimit = Number(data.per_user_limit) || 1;
  const firstOrderOnly = Boolean(data.first_order_only);
  const shopId = data.shop_id || null;
  const description = data.description || '';
  const isActive = data.is_active !== undefined ? Boolean(data.is_active) : true;

  await query(
    `INSERT INTO coupons 
       (id, code, discount_type, discount_value, min_order_amount, max_discount_amount, 
        max_uses, per_user_limit, first_order_only, shop_id, description, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [id, code, discountType, discountValue, minOrder, maxDiscount, maxUses, perUserLimit, firstOrderOnly, shopId, description, isActive]
  );

  return queryOne('SELECT * FROM coupons WHERE id = $1', [id]);
}

/**
 * Update an existing coupon
 */
async function updateCoupon(id, data) {
  const existing = await queryOne('SELECT * FROM coupons WHERE id = $1', [id]);
  if (!existing) throw new CouponError(404, 'NOT_FOUND', 'Coupon not found');

  const discountType = data.discount_type ?? existing.discount_type;
  const discountValue = data.discount_value !== undefined ? Number(data.discount_value) : existing.discount_value;
  const minOrder = data.min_order_amount !== undefined ? Number(data.min_order_amount) : existing.min_order_amount;
  const maxDiscount = data.max_discount_amount !== undefined ? data.max_discount_amount : existing.max_discount_amount;
  const maxUses = data.max_uses !== undefined ? Number(data.max_uses) : existing.max_uses;
  const perUserLimit = data.per_user_limit !== undefined ? Number(data.per_user_limit) : existing.per_user_limit;
  const firstOrderOnly = data.first_order_only !== undefined ? Boolean(data.first_order_only) : existing.first_order_only;
  const description = data.description !== undefined ? data.description : existing.description;
  const isActive = data.is_active !== undefined ? Boolean(data.is_active) : existing.is_active;

  await query(
    `UPDATE coupons 
        SET discount_type = $1, discount_value = $2, min_order_amount = $3, 
            max_discount_amount = $4, max_uses = $5, per_user_limit = $6, 
            first_order_only = $7, description = $8, is_active = $9, updated_at = CURRENT_TIMESTAMP
      WHERE id = $10`,
    [discountType, discountValue, minOrder, maxDiscount, maxUses, perUserLimit, firstOrderOnly, description, isActive, id]
  );

  return queryOne('SELECT * FROM coupons WHERE id = $1', [id]);
}

/**
 * Delete a coupon
 */
async function deleteCoupon(id) {
  await query('DELETE FROM coupons WHERE id = $1', [id]);
  return { success: true };
}

module.exports = {
  CouponError,
  validateCoupon,
  redeemCoupon,
  listCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon
};
