/**
 * Recently viewed products (C12), kept on this device: the newest first, one
 * entry per product, at most MAX. React-free; the store is passed in (the
 * browser's localStorage in the app, a stand-in in tests).
 */
export const KEY = 'localsampark_recently_viewed';
export const MAX = 20;

export function readRecent(store) {
  try {
    const list = JSON.parse((store && store.getItem(KEY)) || '[]');
    return Array.isArray(list) ? list.filter((p) => p && p.productId && p.shopId) : [];
  } catch {
    return [];
  }
}

/** Records a product as just viewed; returns the new list. */
export function recordView(store, product, now = Date.now()) {
  if (!product || !product.productId || !product.shopId) return readRecent(store);
  const entry = {
    productId: String(product.productId),
    shopId: String(product.shopId),
    name: String(product.name || ''),
    price: Number(product.price) || 0,
    image: product.image || null,
    shopName: product.shopName || null,
    viewedAt: now,
  };
  const list = [entry, ...readRecent(store).filter((p) => p.productId !== entry.productId)].slice(0, MAX);
  try { store.setItem(KEY, JSON.stringify(list)); } catch { /* storage full or blocked */ }
  return list;
}

export function clearRecent(store) {
  try { store.removeItem(KEY); } catch { /* blocked */ }
  return [];
}
