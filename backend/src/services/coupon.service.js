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

const money = (v) => Math.round((Number(v) || 0) * 100) / 100;
const TYPES = ['fixed', 'percentage', 'free_delivery'];
const truthy = (v) => v === 1 || v === true || v === 'true' || v === '1';

/** An active coupon by code, or a CouponError. Checks only the coupon itself. */
async function findUsable(code) {
  if (!code || typeof code !== 'string' || !code.trim()) {
    throw new CouponError(400, 'INVALID_CODE', 'Coupon code is required');
  }
  const coupon = await queryOne('SELECT * FROM coupons WHERE UPPER(code) = $1 AND is_active = true', [code.trim().toUpperCase()]);
  if (!coupon) throw new CouponError(404, 'COUPON_NOT_FOUND', 'Invalid or expired coupon code');

  const now = new Date();
  if (coupon.start_date && new Date(coupon.start_date) > now) {
    throw new CouponError(400, 'COUPON_NOT_STARTED', 'This coupon is not active yet');
  }
  if (coupon.end_date && new Date(coupon.end_date) < now) {
    throw new CouponError(400, 'COUPON_EXPIRED', 'This coupon has expired');
  }
  if (coupon.max_uses !== null && coupon.max_uses !== undefined && Number(coupon.current_uses) >= Number(coupon.max_uses)) {
    throw new CouponError(400, 'COUPON_EXHAUSTED', 'This coupon has reached its maximum total uses');
  }
  return coupon;
}

/** First-order and per-user rules, for a signed-in customer. */
async function checkCustomer(coupon, userId) {
  if (!userId) return;
  if (truthy(coupon.first_order_only)) {
    const prior = await queryOne("SELECT COUNT(*) as count FROM orders WHERE user_id = $1 AND order_status != 'cancelled'", [userId]);
    if (Number(prior?.count || 0) > 0) {
      throw new CouponError(400, 'FIRST_ORDER_ONLY', 'This coupon is valid only on your first order');
    }
  }
  const perUserLimit = Number(coupon.per_user_limit) || 1;
  const redemptions = await queryOne('SELECT COUNT(*) as count FROM coupon_redemptions WHERE coupon_id = $1 AND user_id = $2', [coupon.id, userId]);
  if (Number(redemptions?.count || 0) >= perUserLimit) {
    throw new CouponError(400, 'USER_LIMIT_REACHED', 'You have already used this coupon the maximum allowed times');
  }
}

/** What the coupon takes off `base` (the items it applies to). */
function amountOff(coupon, base) {
  const type = String(coupon.discount_type || 'fixed').toLowerCase();
  const value = Number(coupon.discount_value) || 0;
  if (type === 'fixed') return money(Math.min(value, base));
  if (type === 'percentage') {
    let off = (base * value) / 100;
    const cap = coupon.max_discount_amount !== null && coupon.max_discount_amount !== undefined ? Number(coupon.max_discount_amount) : null;
    if (cap !== null && cap > 0 && off > cap) off = cap;
    return money(Math.min(off, base));
  }
  return 0; // free_delivery: the delivery charge is waived instead
}

function present(coupon, discount, deliveryWaived) {
  const type = String(coupon.discount_type || 'fixed').toLowerCase();
  return {
    id: coupon.id,
    code: coupon.code,
    type,
    discount,
    deliveryWaived,
    discount_value: Number(coupon.discount_value) || 0,
    message: coupon.description || (type === 'free_delivery' ? 'Free delivery applied!' : `₹${discount} discount applied!`),
  };
}

/**
 * C7: what a coupon takes off a cart of one shop's order or several (Decision
 * D6). `parts` is [{ shopId, subtotal, deliveryFee }], one per shop.
 *
 *   shop coupon      applies to that shop's items only, and needs that shop in
 *                    the cart; its minimum order is judged on those items;
 *   platform coupon  applies to the whole cart, split between the shops'
 *                    orders in proportion to their items, so each order's
 *                    total is what is owed for it;
 *   free delivery    waives the delivery charge of the orders it applies to.
 *
 * Resolves to { coupon, discount, deliveryWaived, shares } where shares maps
 * each shop id to { discount, deliveryWaived }. Throws CouponError.
 */
async function priceCart({ code, userId = null, parts }) {
  const coupon = await findUsable(code);
  const eligible = coupon.shop_id ? parts.filter((p) => String(p.shopId) === String(coupon.shop_id)) : parts;
  if (eligible.length === 0) {
    throw new CouponError(400, 'SHOP_MISMATCH', parts.length > 1 ? 'This coupon is not valid for the shops in your cart' : 'This coupon is not valid for this shop');
  }
  const base = money(eligible.reduce((sum, p) => sum + (Number(p.subtotal) || 0), 0));
  const minOrder = Number(coupon.min_order_amount) || 0;
  if (base < minOrder) {
    throw new CouponError(400, 'MIN_ORDER_NOT_MET', `Minimum order value for this coupon is ₹${minOrder}`);
  }
  await checkCustomer(coupon, userId);

  const type = String(coupon.discount_type || 'fixed').toLowerCase();
  const discount = amountOff(coupon, base);
  const shares = new Map(parts.map((p) => [String(p.shopId), { discount: 0, deliveryWaived: 0 }]));
  // The discount split in proportion to each order's items; the last eligible
  // order takes what rounding leaves, so the shares add up exactly.
  let left = discount;
  eligible.forEach((p, i) => {
    const share = shares.get(String(p.shopId));
    const part = i === eligible.length - 1 ? left : money(base > 0 ? (discount * (Number(p.subtotal) || 0)) / base : 0);
    share.discount = money(Math.min(part, left));
    left = money(left - share.discount);
    if (type === 'free_delivery') share.deliveryWaived = money(Number(p.deliveryFee) || 0);
  });
  const deliveryWaived = money([...shares.values()].reduce((sum, sh) => sum + sh.deliveryWaived, 0));
  return { coupon: present(coupon, discount, deliveryWaived), discount, deliveryWaived, shares };
}

/**
 * Validate a coupon code against one cart value (POST /orders/validate-coupon).
 * The checkout itself prices coupons with priceCart.
 */
async function validateCoupon({ code, cartTotal, userId = null, shopId = null }) {
  const coupon = await findUsable(code);
  // Asked without a shop, a shop's coupon is judged on the amount alone.
  const parts = [{ shopId: shopId || coupon.shop_id || 'cart', subtotal: Number(cartTotal) || 0, deliveryFee: 0 }];
  const priced = await priceCart({ code, userId, parts });
  return { valid: true, coupon: priced.coupon };
}

/**
 * Redeems a coupon inside the order's transaction, once per checkout.
 *
 * The total-uses guard is the UPDATE itself. It also takes the coupon's row
 * lock until the transaction ends, so two checkouts with the same coupon are
 * redeemed one after the other, and the per-customer count read after it
 * sees the other's redemption: two orders placed at once by one customer
 * could otherwise both pass the check made when they were priced.
 */
async function redeemCoupon({ couponId, userId, orderId, discountApplied, client }) {
  if (!couponId || !userId) return null;
  const db = client || { query };
  const rowsOf = (r) => (r && r.rows) || r || [];

  const updateResult = await db.query(
    `UPDATE coupons
        SET current_uses = current_uses + 1,
            updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
        AND (max_uses IS NULL OR current_uses < max_uses)`,
    [couponId]
  );
  const rowCount = updateResult.rowCount ?? updateResult.changes ?? 0;
  if (rowCount === 0) {
    throw new CouponError(409, 'COUPON_LIMIT_EXCEEDED', 'This coupon has just run out. Please remove it and try again.');
  }

  const coupon = rowsOf(await db.query('SELECT per_user_limit FROM coupons WHERE id = $1', [couponId]))[0] || {};
  const used = rowsOf(await db.query('SELECT COUNT(*) AS count FROM coupon_redemptions WHERE coupon_id = $1 AND user_id = $2', [couponId, userId]))[0];
  if (Number(used?.count || 0) >= (Number(coupon.per_user_limit) || 1)) {
    throw new CouponError(409, 'USER_LIMIT_REACHED', 'You have already used this coupon the maximum allowed times');
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
 * Terms that cannot be honoured are refused when the coupon is made, not
 * discovered at a customer's checkout: a 150% coupon, a negative amount, a
 * window that ends before it starts.
 */
function checkTerms({ discountType, discountValue, minOrder, maxDiscount, maxUses, perUserLimit, startDate, endDate }) {
  const bad = (message) => { throw new CouponError(400, 'INVALID_DATA', message); };
  if (!TYPES.includes(discountType)) bad(`Coupon type must be one of: ${TYPES.join(', ')}`);
  if (discountType === 'fixed' && !(discountValue > 0)) bad('A flat discount must be more than ₹0');
  if (discountType === 'percentage' && !(discountValue > 0 && discountValue <= 100)) bad('A percentage discount must be between 1 and 100');
  if (minOrder < 0) bad('The minimum order cannot be negative');
  if (maxDiscount !== null && maxDiscount !== undefined && !(maxDiscount > 0)) bad('The maximum discount must be more than ₹0');
  if (!(maxUses >= 1)) bad('The total number of uses must be at least 1');
  if (!(perUserLimit >= 1)) bad('Uses per customer must be at least 1');
  if (startDate && Number.isNaN(Date.parse(startDate))) bad('The start date is not a date');
  if (endDate && Number.isNaN(Date.parse(endDate))) bad('The end date is not a date');
  if (startDate && endDate && Date.parse(endDate) <= Date.parse(startDate)) bad('The coupon must end after it starts');
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

  const discountType = String(data.discount_type || 'fixed').toLowerCase();
  const discountValue = Number(data.discount_value) || 0;
  const minOrder = Number(data.min_order_amount) || 0;
  const maxDiscount = data.max_discount_amount ? Number(data.max_discount_amount) : null;
  const maxUses = Number(data.max_uses) || 1000;
  const perUserLimit = Number(data.per_user_limit) || 1;
  checkTerms({ discountType, discountValue, minOrder, maxDiscount, maxUses, perUserLimit, startDate: data.start_date, endDate: data.end_date });
  const firstOrderOnly = Boolean(data.first_order_only);
  const shopId = data.shop_id || null;
  const description = data.description || '';
  const isActive = data.is_active !== undefined ? Boolean(data.is_active) : true;

  await query(
    `INSERT INTO coupons
       (id, code, discount_type, discount_value, min_order_amount, max_discount_amount,
        max_uses, per_user_limit, first_order_only, shop_id, description, is_active, start_date, end_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
    [id, code, discountType, discountValue, minOrder, maxDiscount, maxUses, perUserLimit, firstOrderOnly, shopId, description, isActive,
     data.start_date || null, data.end_date || null]
  );

  return queryOne('SELECT * FROM coupons WHERE id = $1', [id]);
}

/**
 * Update an existing coupon
 */
async function updateCoupon(id, data) {
  const existing = await queryOne('SELECT * FROM coupons WHERE id = $1', [id]);
  if (!existing) throw new CouponError(404, 'NOT_FOUND', 'Coupon not found');

  const discountType = String(data.discount_type ?? existing.discount_type).toLowerCase();
  const discountValue = data.discount_value !== undefined ? Number(data.discount_value) : existing.discount_value;
  const minOrder = data.min_order_amount !== undefined ? Number(data.min_order_amount) : existing.min_order_amount;
  const maxDiscount = data.max_discount_amount !== undefined ? data.max_discount_amount : existing.max_discount_amount;
  const maxUses = data.max_uses !== undefined ? Number(data.max_uses) : existing.max_uses;
  const perUserLimit = data.per_user_limit !== undefined ? Number(data.per_user_limit) : existing.per_user_limit;
  const firstOrderOnly = data.first_order_only !== undefined ? Boolean(data.first_order_only) : existing.first_order_only;
  const description = data.description !== undefined ? data.description : existing.description;
  const isActive = data.is_active !== undefined ? Boolean(data.is_active) : existing.is_active;
  checkTerms({ discountType, discountValue: Number(discountValue), minOrder: Number(minOrder), maxDiscount: maxDiscount === null ? null : Number(maxDiscount), maxUses: Number(maxUses), perUserLimit: Number(perUserLimit), startDate: data.start_date ?? existing.start_date, endDate: data.end_date ?? existing.end_date });

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
  priceCart,
  redeemCoupon,
  listCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon
};
