/**
 * The product screen (C4) and the wishlist (C12) in the app. React-free so the
 * rules can be tested; app/product and app/wishlist render them.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiGet, apiPost, apiDelete } from '../lib/api';

const enc = encodeURIComponent;

/** GET /shops/:shopId/products/:productId (the same page the web shows). */
export async function loadProduct(shopId, productId, api = { apiGet }) {
  const res = await api.apiGet(`/shops/${enc(shopId)}/products/${enc(productId)}`);
  if (!res || !res.product) throw new Error('This product is not available.');
  return res.product;
}

/** What the screen offers for the chosen variant (or the product without one). */
export function offer(product, variant) {
  const v = variant || null;
  return {
    price: v ? v.price : product.price,
    discountPercent: v ? v.discountPercent : product.discountPercent,
    inStock: v ? v.inStock : product.inStock,
    maxQuantity: v ? v.maxQuantity : product.maxQuantity,
    mustChoose: product.variants.length > 0 && !v,
  };
}

/** The cart line for a product (and variant): the variant travels in the options. */
export function cartLine(product, variant) {
  return {
    product: {
      id: product.id,
      name: variant ? `${product.name} (${variant.value})` : product.name,
      price: variant ? variant.price : product.price,
      image_url: product.images[0] || null,
      shop_id: product.shopId,
      shop_name: product.seller.name,
      shop_category: product.seller.category,
    },
    options: variant ? { variantId: variant.id, [variant.name]: variant.value } : {},
  };
}

export const clampQuantity = (qty, max) => {
  const q = Math.max(1, Math.floor(Number(qty) || 1));
  return max === null || max === undefined ? q : Math.max(1, Math.min(q, max));
};

// ── wishlist (server, the customer's on every device) ───────────────────────

export async function listWishlist(api = { apiGet }) {
  const res = await api.apiGet('/wishlist');
  return (res && res.items) || [];
}

export const saveProduct = (productId, api = { apiPost }) => api.apiPost(`/wishlist/${enc(productId)}`, {});
export const unsaveProduct = (productId, api = { apiDelete }) => api.apiDelete(`/wishlist/${enc(productId)}`);
export const moveToCart = (productId, api = { apiPost }) => api.apiPost(`/wishlist/${enc(productId)}/move-to-cart`, {});

// ── recently viewed (this phone) ────────────────────────────────────────────

export const RECENT_KEY = 'localsampark_recently_viewed';
export const RECENT_MAX = 20;

export async function readRecent(store = AsyncStorage) {
  try {
    const list = JSON.parse((await store.getItem(RECENT_KEY)) || '[]');
    return Array.isArray(list) ? list.filter((p) => p && p.productId && p.shopId) : [];
  } catch {
    return [];
  }
}

export async function recordView(product, store = AsyncStorage, now = Date.now()) {
  if (!product || !product.id || !product.shopId) return readRecent(store);
  const entry = {
    productId: String(product.id),
    shopId: String(product.shopId),
    name: String(product.name || ''),
    price: Number(product.price) || 0,
    image: (product.images && product.images[0]) || null,
    shopName: (product.seller && product.seller.name) || null,
    viewedAt: now,
  };
  const list = [entry, ...(await readRecent(store)).filter((p) => p.productId !== entry.productId)].slice(0, RECENT_MAX);
  try { await store.setItem(RECENT_KEY, JSON.stringify(list)); } catch { /* storage unavailable */ }
  return list;
}

export async function clearRecent(store = AsyncStorage) {
  try { await store.removeItem(RECENT_KEY); } catch { /* storage unavailable */ }
  return [];
}
