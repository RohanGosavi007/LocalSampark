/**
 * Placing an order with a shop: one implementation, one table.
 *
 * There were three ways to order from a shop, writing to three tables. Only
 * one of those tables — `orders` — is read by the merchant's order queue, the
 * rider's job list and the customer's tracking screen. An order placed from
 * the shop page went into `shop_orders`, which none of them look at: the
 * customer was charged and the shop never saw the order.
 *
 * Everything that orders goods from a shop now comes through placeOrder():
 * POST /checkout, POST /shops/:id/orders and the multi-shop cart. It
 *
 *   - prices every line from the catalogue (the shop's products, or its
 *     universal catalogue), never from the request;
 *   - works out delivery, small-order and platform fees from the platform's
 *     pricing settings and the distance to the customer
 *     (deliveryPricing.service.js);
 *   - takes payment the way the customer chose: nothing now for cash, a wallet
 *     debit in the same transaction as the order, or a Razorpay payment opened
 *     for exactly the order's total;
 *   - writes the order, its lines and the stock they take together.
 */

const crypto = require('crypto');
const { queryOne, withTransaction } = require('../config/database');
const { pointSql } = require('../utils/sqlPoint');
const payments = require('./payments.service');
const pricing = require('./deliveryPricing.service');
const commission = require('./commission.service');
const couponService = require('./coupon.service');
const slots = require('./deliverySlots.service');
const catalogRules = require('./catalogRules');

const MAX_LINES = 100;
const MAX_QUANTITY = 999;

class OrderError extends Error {
  constructor(status, code, message, details = {}) {
    super(message);
    this.name = 'OrderError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const truthy = (value) => value === 1 || value === true || value === '1' || value === 'true';
const money = (value) => Math.round((Number(value) || 0) * 100) / 100;

/** Whether the request asks for collection rather than delivery, in any client's spelling. */
function isPickup(body) {
  const mode = String(
    body.deliveryMode ?? body.delivery_mode ?? body.fulfillmentMethod ?? body.fulfillment_method ?? body.deliveryType ?? 'delivery'
  ).toLowerCase();
  return mode === 'pickup' || mode === 'self_pickup';
}

/**
 * Prices a cart from the catalogue. Returns { shop, lines, subtotal }.
 * A line is looked up among the shop's products first, then in its universal
 * catalogue; anything found in neither cannot be ordered.
 */
async function priceItems(shopId, items) {
  if (!shopId || !Array.isArray(items) || items.length === 0) {
    throw new OrderError(400, 'INVALID_CART', 'shopId and items array are required');
  }
  if (items.length > MAX_LINES) throw new OrderError(400, 'INVALID_CART', `An order can hold at most ${MAX_LINES} lines`);

  const shop = await queryOne('SELECT * FROM local_shops WHERE CAST(id AS TEXT) = $1', [String(shopId)]);
  if (!shop) throw new OrderError(404, 'SHOP_NOT_FOUND', 'Shop not found');

  let subtotal = 0;
  const lines = [];

  for (const item of items) {
    const quantity = Number(item && item.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      throw new OrderError(400, 'INVALID_QUANTITY', 'Each item needs a quantity of at least 1');
    }
    const productId = item.productId ?? item.product_id ?? item.id;
    if (productId === undefined || productId === null || productId === '') {
      throw new OrderError(400, 'INVALID_CART', 'Each item needs a product id');
    }

    const product = await queryOne(
      'SELECT * FROM shop_products WHERE CAST(id AS TEXT) = $1 AND CAST(shop_id AS TEXT) = $2',
      [String(productId), String(shop.id)]
    );

    if (product) {
      if (product.is_available === 0 || product.is_available === false || product.is_available === '0') {
        throw new OrderError(400, 'ITEM_UNAVAILABLE', `${product.name} is not available right now.`);
      }
      const tracked = Number(product.track_inventory) === 1 || product.track_inventory === true;
      // C4: the seller's per-order limit.
      const limit = catalogRules.quantityLimit(product);
      if (limit && quantity > limit) {
        throw new OrderError(400, 'QUANTITY_LIMIT', `${product.name}: at most ${limit} per order.`, { productId: product.id, limit });
      }
      // C4: a variant has its own price (base + modifier) and its own stock.
      // Checkout used to charge the base price whatever variant was chosen.
      const variantId = item.variantId ?? item.variant_id ?? (item.options && item.options.variantId) ?? null;
      if (variantId) {
        const variant = await queryOne(
          'SELECT * FROM product_variants WHERE CAST(id AS TEXT) = $1 AND CAST(product_id AS TEXT) = $2',
          [String(variantId), String(product.id)]
        );
        if (!variant) throw new OrderError(400, 'ITEM_UNAVAILABLE', `That option of ${product.name} is not available.`, { productId: product.id });
        const vStock = Number(variant.inventory_count ?? 0);
        if (tracked && vStock < quantity) {
          throw new OrderError(400, 'OUT_OF_STOCK', `Insufficient stock for ${product.name} (${variant.variant_value}). Available: ${vStock}`);
        }
        const vPrice = money((Number(product.price) || 0) + (Number(variant.price_modifier) || 0));
        // A variant whose modifier takes the price below zero (written before the
        // variant routes validated it) must not become a negative line total.
        if (vPrice < 0) throw new OrderError(400, 'ITEM_UNAVAILABLE', `That option of ${product.name} is not available.`, { productId: product.id });
        subtotal += vPrice * quantity;
        lines.push({
          productId: product.id, variantId: variant.id, name: `${product.name} (${variant.variant_value})`,
          price: vPrice, quantity, tracked,
        });
        continue;
      }
      const onHand = Number(product.inventory_count ?? 0);
      if (tracked && onHand < quantity) {
        throw new OrderError(400, 'OUT_OF_STOCK', `Insufficient stock for ${product.name}. Available: ${onHand}`);
      }
      const price = Number(product.price) || 0;
      subtotal += price * quantity;
      lines.push({ productId: product.id, name: product.name, price, quantity, tracked });
      continue;
    }

    // The shop page lists the universal catalogue next to the products, and
    // both go into the same cart.
    const catalogued = await queryOne(
      `SELECT id, title, price FROM universal_catalog_items
        WHERE CAST(id AS TEXT) = $1 AND CAST(shop_id AS TEXT) = $2 AND is_active = '1'`,
      [String(productId), String(shop.id)]
    );
    if (!catalogued) {
      throw new OrderError(400, 'ITEM_UNAVAILABLE', `Invalid product ID: ${productId}`, { productId });
    }
    const price = Number(catalogued.price) || 0;
    subtotal += price * quantity;
    // order_items.product_id references shop_products; a catalogue line has none.
    lines.push({ productId: null, name: catalogued.title, price, quantity, tracked: false });
  }

  return { shop, lines, subtotal: money(subtotal) };
}

/**
 * Where the order is going: a point sent with the request, or a saved address
 * of the caller's. Returns { point, address } — either may be null.
 */
async function resolveDrop(user, body) {
  const direct = pricing.readPoint(body.deliveryCoordinate ?? body.delivery_coordinate ?? body.coordinate)
    || pricing.readPoint({ lat: body.deliveryLat ?? body.latitude, lng: body.deliveryLng ?? body.longitude });
  const typed = body.deliveryAddress ?? body.delivery_address ?? body.address ?? null;

  const addressId = body.addressId ?? body.address_id;
  if (addressId && user && user.id) {
    const saved = await queryOne('SELECT * FROM user_addresses WHERE id = $1 AND user_id = $2', [addressId, user.id]);
    if (!saved) throw new OrderError(404, 'ADDRESS_NOT_FOUND', 'That saved address was not found.');
    const text = [saved.street_address, saved.apartment_suite, saved.city, saved.postal_code].filter(Boolean).join(', ');
    return { point: direct || pricing.readPoint({ lat: saved.latitude, lng: saved.longitude }), address: typed || text };
  }

  return { point: direct, address: typeof typed === 'string' ? typed.trim() : null };
}

function toOrderError(error) {
  if (error instanceof pricing.PricingError) return new OrderError(error.status, error.code, error.message, error.details);
  if (error instanceof slots.SlotError) return new OrderError(error.status, error.code, error.message);
  return error;
}

/** The coupon code a checkout body carries, by any of its spellings. */
function couponCodeOf(body = {}) {
  const code = body.couponCode ?? body.coupon_code ?? body.coupon;
  return typeof code === 'string' && code.trim() ? code.trim() : null;
}

/** The body without its coupon (a multi-shop cart prices the coupon once, for the cart). */
function withoutCoupon(body = {}) {
  const { couponCode: _a, coupon_code: _b, coupon: _c, ...rest } = body;
  return rest;
}

/** What a cart will cost, without ordering it. */
async function quoteOrder({ user = null, shopId, items, body = {} }) {
  const { shop, lines, subtotal } = await priceItems(shopId, items);
  const pickup = isPickup(body);
  const drop = pickup ? { point: null, address: null } : await resolveDrop(user, body);

  let bill;
  try {
    // A SamparkPlus member's free-delivery threshold applies to what they are charged
    // here, so the quote and the order they place agree.
    const member = user && user.id ? await require('./membership.service').isMember(user.id) : false;
    bill = await pricing.quote({ shop, subtotal, pickup, drop: drop.point, member });

    // C7: a coupon. One that does not apply leaves the bill as it is and says
    // why (bill.couponError), so the checkout can show the bill and the reason
    // side by side; placing the order with it is refused (placeOrder).
    const couponCode = couponCodeOf(body);
    if (couponCode) {
      try {
        const priced = await couponService.priceCart({
          code: couponCode,
          userId: user ? user.id : null,
          parts: [{ shopId: shop.id, subtotal, deliveryFee: bill.deliveryFee }],
        });
        const share = priced.shares.get(String(shop.id));
        if (share.deliveryWaived > 0) bill.deliveryFee = 0;
        bill.discount = money(Math.min(share.discount, bill.subtotal));
        bill.total = Math.max(0, money(bill.subtotal + bill.deliveryFee + bill.platformFee + bill.smallOrderFee - bill.discount));
        bill.coupon = priced.coupon;
      } catch (cErr) {
        if (!(cErr instanceof couponService.CouponError)) throw cErr;
        bill.couponError = { code: cErr.code, message: cErr.message };
      }
    }
  } catch (error) {
    throw toOrderError(error);
  }
  // C8: ASAP, or one of these one-hour windows.
  return { shop, lines, bill, pickup, drop, slots: slots.slotsFor(shop) };
}

/**
 * Places the order. `method` is 'cod', 'wallet' or 'razorpay'
 * (payments.paymentMethod has already normalised it).
 *
 * For a cart spanning several shops the caller places one order per shop
 * inside its own transaction and settles the money once for all of them:
 *
 *   client       run inside this transaction instead of opening one
 *   prepaid      the caller has taken (or is taking) the money; do not debit
  *   fees         { deliveryFee, platformFee, smallOrderFee, discount } for this
 *                order's share of charges — and of any discount — that are
 *                made once per cart
 *
 * Returns { order, items, bill, shop, paymentData, paymentError }.
 */
async function placeOrder({ user, shopId, items, body = {}, method, batchId = null, client = null, prepaid = false, fees = null }) {
  if (!user || !user.id) throw new OrderError(401, 'UNAUTHENTICATED', 'Authentication required to place an order.');
  if (!method) throw new OrderError(400, 'INVALID_PAYMENT_METHOD', 'paymentMethod must be cod, razorpay or wallet');
  // Decision D10: the consumer wallet is off at launch; it cannot pay for an
  // order the customer cannot see the balance of.
  if (method === 'wallet' && !require('./refundPayouts.service').walletEnabled()) {
    throw new OrderError(400, 'WALLET_UNAVAILABLE', 'Paying from the wallet is not available. Please choose cash on delivery or pay online.');
  }

  // Said before the order exists. Finding out after would leave the customer
  // with an order they have no way to pay for.
  if (method === 'razorpay' && !payments.onlinePaymentAvailable()) {
    throw new OrderError(503, 'PAYMENTS_UNAVAILABLE', 'Online payment is not available right now. Please choose another payment method.');
  }

  const { shop, lines, bill, pickup, drop } = await quoteOrder({ user, shopId, items, body });
  if (bill.couponError) {
    throw new OrderError(400, bill.couponError.code, bill.couponError.message);
  }

  if (fees) {
    for (const key of ['deliveryFee', 'platformFee', 'smallOrderFee']) {
      if (fees[key] !== undefined && fees[key] !== null) bill[key] = money(fees[key]);
    }
        // A discount the platform gives (loyalty coins). It comes off what the
    // customer pays, not off what the shop is credited for its items.
    bill.discount = Math.min(money(fees.discount), money(bill.subtotal + bill.deliveryFee + bill.platformFee + bill.smallOrderFee));
    bill.total = money(bill.subtotal + bill.deliveryFee + bill.platformFee + bill.smallOrderFee - bill.discount);
  }

  if (!pickup && !drop.address) {
    throw new OrderError(400, 'ADDRESS_REQUIRED', 'A delivery address is required.');
  }
  if (method === 'cod' && !bill.cod.available) {
    throw new OrderError(400, 'COD_NOT_AVAILABLE',
      bill.cod.maxOrderValue
        ? `Cash on delivery is available for orders up to ₹${bill.cod.maxOrderValue}. Please pay online or from your wallet.`
        : 'Cash on delivery is not available. Please pay online or from your wallet.');
  }

  // ASAP (null), or a slot the shop offers; anything else is refused before
  // anything is written.
  let scheduledFor = null;
  try {
    scheduledFor = slots.chosenSlot(shop, body.deliverySlot ?? body.delivery_slot ?? body.scheduledFor ?? null);
  } catch (error) {
    throw toOrderError(error);
  }

  const orderId = crypto.randomUUID();
  // The handover code the rider (or the shop, at the counter) asks for.
  const otpCode = String(crypto.randomInt(1000, 10000));
  const instructions = body.specialInstructions ?? body.special_instructions;
  // The commission this order will be settled at. Fixed now, so that changing
  // a shop's rate later does not re-price orders already delivered.
    const terms = await commission.termsFor(shop, bill.subtotal);
  const commissionPercent = terms.percent;
    const paidNow = method === 'wallet' || prepaid || bill.total === 0;

  // The payment, the order, its lines and the stock they take are one
  // transaction: either the customer has an order and has paid for it, or
  // nothing happened.
  const write = async (tx) => {
        if (method === 'wallet' && !prepaid && bill.total > 0) {
      await payments.debitWallet({ userId: user.id, amount: bill.total, purpose: 'order_payment', referenceId: orderId, client: tx });
    }

    await tx.query(
      `INSERT INTO orders
         (id, user_id, shop_id, batch_id, subtotal, total_amount, delivery_fee, platform_fee, small_order_fee,
          payment_method, payment_status, order_status, delivery_address, delivery_coordinate, delivery_lat,
                    delivery_lng, delivery_distance_km, surge_multiplier, rider_payout, otp_code, fulfillment_method,
          special_instructions, commission_percent, discount, scheduled_for)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending', $12,
               ${pointSql(drop.point && drop.point.lat, drop.point && drop.point.lng)}, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)`,
      [
        orderId, user.id, shop.id, batchId, bill.subtotal, bill.total, bill.deliveryFee, bill.platformFee, bill.smallOrderFee,
        method, paidNow ? 'paid' : 'pending',
        pickup ? null : drop.address,
        drop.point ? drop.point.lat : null,
        drop.point ? drop.point.lng : null,
        bill.distanceKm, bill.surgeMultiplier, bill.riderPayout, otpCode,
        pickup ? 'pickup' : 'delivery',
                instructions ? String(instructions).slice(0, 500) : null,
        commissionPercent,
        bill.discount || 0,
        scheduledFor,
      ]
    );

        // The terms this order will be settled on. The merchant's earnings screen
    // and the payout calculation both read this row, so they show one number.
    await tx.query(
      `INSERT INTO shop_commissions
         (id, shop_id, order_id, order_type, gross_amount, commission_percent, commission_amount,
          convenience_fee, total_platform_earning, net_to_shop)
       VALUES ($1, $2, $3, 'product_order', $4, $5, $6, $7, $8, $9)`,
      [crypto.randomUUID(), shop.id, orderId, bill.subtotal, terms.percent, terms.commissionAmount,
        terms.convenienceFee, terms.platformEarning, terms.netToShop]
    );

    for (const line of lines) {
      await tx.query(
        'INSERT INTO order_items (id, order_id, product_id, name, price, quantity) VALUES ($1, $2, $3, $4, $5, $6)',
        [crypto.randomUUID(), orderId, line.productId, line.name, line.price, line.quantity]
      );
      if (line.tracked && line.variantId) {
        // The variant's own stock, taken the same guarded way as below.
        const takenVariant = await tx.query(
          'UPDATE product_variants SET inventory_count = inventory_count - $1 WHERE id = $2 AND inventory_count >= $1',
          [line.quantity, line.variantId]
        );
        if (!takenVariant.rowCount) throw new OrderError(409, 'OUT_OF_STOCK', `${line.name} has just gone out of stock.`);
      } else if (line.tracked) {
        // The stock check in priceItems was a read; this is the one that
        // counts. Two customers checking out the last unit both pass the read,
        // and only one of them may take it.
        const taken = await tx.query(
          'UPDATE shop_products SET inventory_count = inventory_count - $1, stock_quantity = stock_quantity - $1 WHERE id = $2 AND inventory_count >= $1',
          [line.quantity, line.productId]
        );
        if (!taken.rowCount) throw new OrderError(409, 'OUT_OF_STOCK', `${line.name} has just gone out of stock.`);
      }
    }

    if (bill.coupon && bill.coupon.id) {
      try {
        await couponService.redeemCoupon({
          couponId: bill.coupon.id,
          userId: user.id,
          orderId,
          // What the coupon saved: money off, or the delivery charge waived.
          discountApplied: money((bill.discount || 0) + (bill.coupon.deliveryWaived || 0)),
          client: tx
        });
      } catch (cErr) {
        if (cErr instanceof couponService.CouponError) {
          throw new OrderError(cErr.status, cErr.code, cErr.message);
        }
        throw cErr;
      }
    }
  };

  try {
    if (client) await write(client); else await withTransaction(write);
  } catch (error) {
    if (error instanceof payments.PaymentError) {
      throw new OrderError(error.status, error.code,
        error.code === 'INSUFFICIENT_BALANCE' ? 'Insufficient wallet balance for this order.' : error.message);
    }
    throw error;
  }

  // Inside a caller's transaction the rows are read through it: they are not
  // visible to another connection until it commits.
  const reader = client || { query: (text, params) => require('../config/database').query(text, params) };
  const order = (await reader.query('SELECT * FROM orders WHERE id = $1', [orderId])).rows[0];
  const orderItems = (await reader.query('SELECT * FROM order_items WHERE order_id = $1', [orderId])).rows;

  // The order exists and is unpaid. paymentData is what the client hands to
  // Razorpay Checkout; the payment row behind it fixes the order and the
  // amount. If the gateway cannot be reached the order still stands — the
  // client can ask again with POST /payments/razorpay/order.
  let paymentData = null;
  let paymentError = null;
  if (method === 'razorpay') {
    try {
      paymentData = await payments.createPayment({ user, purpose: 'order', referenceId: orderId });
    } catch (err) {
      console.error(`[orders] could not start payment for order ${orderId}: ${err.message}`);
      paymentError = 'Online payment could not be started. You can retry payment from your order.';
    }
  }

  return { order, items: orderItems, bill, shop, paymentData, paymentError };
}

module.exports = { OrderError, isPickup, priceItems, resolveDrop, quoteOrder, placeOrder, truthy, couponCodeOf, withoutCoupon };
