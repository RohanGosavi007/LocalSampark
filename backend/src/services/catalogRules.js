/**
 * Catalogue rules shared by the product page, the cart, checkout and returns
 * (C4), so that what a page promises is what the rest of the system does.
 */

/** Categories whose goods spoil: a 48-hour return window instead of 7 days. */
const PERISHABLE = ['restaurant', 'grocery', 'food', 'bakery', 'meat', 'dairy', 'perishable'];

/**
 * Food businesses, which must show their FSSAI licence number (Food Safety and
 * Standards (Licensing and Registration of Food Businesses) Regulations, 2011;
 * FSSAI's e-commerce guidance requires it on the listing).
 */
const FOOD = [...PERISHABLE, 'sweets', 'sweet shop', 'cafe', 'tiffin', 'catering', 'kirana', 'supermarket', 'fruits', 'vegetables'];

const norm = (category) => String(category || '').trim().toLowerCase();

/** The return window for a shop's category, in hours (services/return.service.js uses this). */
function returnWindowHours(category) {
  return PERISHABLE.includes(norm(category)) ? 48 : 168;
}

function isFoodBusiness(category) {
  const c = norm(category);
  return FOOD.some((f) => c === f || c.includes(f));
}

/** Whole-percent discount from MRP, or 0 when there is none. */
function discountPercent(price, mrp) {
  const p = Number(price);
  const m = Number(mrp);
  if (!Number.isFinite(p) || !Number.isFinite(m) || m <= 0 || p >= m) return 0;
  return Math.round(((m - p) / m) * 100);
}

/** The most of one product (or variant) a single order may hold: the seller's limit, if any. */
function quantityLimit(product) {
  const limit = Number(product && product.max_order_quantity);
  return Number.isInteger(limit) && limit > 0 ? limit : null;
}

module.exports = { PERISHABLE, FOOD, returnWindowHours, isFoodBusiness, discountPercent, quantityLimit };
