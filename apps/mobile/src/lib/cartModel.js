/**
 * The cart's rules, free of React and the browser so they can be tested with
 * node --test (C6).  store/cartStore.js applies them. Kept identical to apps/web/src/lib/cartModel.js;
 * apps/mobile/__tests__/cartModelParity.test.js fails if the two drift.
 *
 * Decision D6: one cart may hold items from several shops. Checkout places one
 * order per shop, paid with one payment. The cart used to throw away every
 * item from shop A, after a confirm() box, the moment something from shop B
 * was added.
 */

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const optionsKey = (o) => JSON.stringify(o || {});

/** Same product with the same options is one line. */
export const sameLine = (a, b) => String(a.id) === String(b.id) && optionsKey(a.options) === optionsKey(b.options);

/** Adds a product to the items, merging into an existing line. Returns new items. */
export function addLine(items, product, quantity = 1, options = {}) {
  const qty = Math.max(1, Math.floor(num(quantity)) || 1);
  const line = { ...product, options: options || {} };
  const i = items.findIndex((x) => sameLine(x, line));
  if (i === -1) return [...items, { ...line, quantity: qty }];
  const next = [...items];
  next[i] = { ...next[i], quantity: next[i].quantity + qty };
  return next;
}

/** Items grouped by shop, in the order shops were first added, with subtotals. */
export function groupByShop(items) {
  const groups = new Map();
  for (const item of items || []) {
    const key = String(item.shop_id ?? 'unknown');
    if (!groups.has(key)) groups.set(key, { shopId: item.shop_id ?? null, shopName: item.shop_name || 'Shop', items: [], subtotal: 0 });
    const g = groups.get(key);
    g.items.push(item);
    g.subtotal = Math.round((g.subtotal + num(item.price) * num(item.quantity)) * 100) / 100;
  }
  return [...groups.values()];
}

/** The server cart line (GET /cart) as a local cart item. */
export function fromServerLine(line) {
  const p = line.product || {};
  const shop = p.shop || {};
  return {
    id: p.id,
    name: p.name,
    price: num(line.price ?? p.price),
    quantity: num(line.quantity) || 1,
    options: line.customOptions || {},
    image_url: p.imageUrl || null,
    shop_id: shop.id ?? null,
    shop_name: shop.name || 'Shop',
    shop_category: shop.category || null,
    availableStock: num(line.availableStock ?? p.availableStock),
    isOutOfStock: Boolean(line.isOutOfStock ?? p.isOutOfStock),
    cartLineId: line.id,
  };
}

/**
 * Brings the local cart in line with the server's (C6: stock and price are
 * revalidated against the catalogue). The server cart is the truth; what
 * changed is reported so the customer is told rather than surprised at
 * checkout.
 */
export function reconcile(localItems, serverCart) {
  const serverItems = ((serverCart && serverCart.cartItems) || []).map(fromServerLine);
  const changes = [];
  for (const s of serverItems) {
    const before = (localItems || []).find((l) => sameLine(l, s));
    if (before && num(before.price) !== s.price) {
      changes.push({ type: 'price', name: s.name, from: num(before.price), to: s.price });
    }
    if (s.isOutOfStock) {
      changes.push({ type: 'stock', name: s.name, available: s.availableStock });
    }
  }
  for (const l of localItems || []) {
    if (!serverItems.some((s) => sameLine(s, l))) changes.push({ type: 'removed', name: l.name });
  }
  return { items: serverItems, changes };
}

/** A readable sentence for each change, for a notice above the cart. */
export function describeChange(c) {
  if (c.type === 'price') return `${c.name}: price is now ₹${c.to} (was ₹${c.from}).`;
  if (c.type === 'stock') return c.available > 0 ? `${c.name}: only ${c.available} left.` : `${c.name} is out of stock.`;
  return `${c.name} is no longer in your cart.`;
}

/**
 * How the cart is checked out (D6):
 *   one shop    POST /checkout, any payment the shop accepts, online included;
 *   several     POST /shops/cart/batch-checkout, one order per shop, paid once
 *               from the wallet or in cash (one gateway payment settles one
 *               order, so online payment is not offered for a multi-shop cart).
 */
export function checkoutPlan(items) {
  const shops = groupByShop(items);
  if (shops.length <= 1) {
    return { mode: 'single', shops, shopId: shops[0] ? shops[0].shopId : null, payments: ['RAZORPAY', 'WALLET', 'COD'] };
  }
  return { mode: 'batch', shops, shopId: null, payments: ['WALLET', 'COD'] };
}

/** The request lines for batch checkout and its quote. */
export const batchLines = (items) => (items || []).map((i) => ({
  shop_id: i.shop_id,
  product_id: i.id,
  quantity: num(i.quantity) || 1,
  ...(i.options && i.options.variantId ? { variantId: i.options.variantId } : {}),
}));

/** The request lines for a single shop's checkout and quote; a chosen variant goes with its line (C4). */
export const orderLines = (items) => (items || []).map((i) => ({
  productId: i.id,
  quantity: num(i.quantity) || 1,
  ...(i.options && i.options.variantId ? { variantId: i.options.variantId } : {}),
}));

/** Which items cannot be checked out as they are. */
export function blockers(items) {
  return (items || []).filter((i) => i.isOutOfStock).map((i) => i.name);
}
