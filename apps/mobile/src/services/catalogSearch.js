/**
 * C5 in the app: searching the catalogue (GET /shops/search/catalog) and
 * suggestions while typing (GET /shops/search/suggest). Kept apart from the
 * screen so it can be tested with the API stubbed.
 *
 * The search screen used to look for shops alone, after three letters, so no
 * product could be found by name and a typo found nothing.
 */
import * as apiLib from '../lib/api';

export const SORTS = [
  { id: 'relevance', label: 'Best match' },
  { id: 'price_asc', label: 'Price ↑' },
  { id: 'price_desc', label: 'Price ↓' },
];

const price = (v) => {
  if (v === null || v === undefined || String(v).trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

/** The API path for a search; null if there is nothing to search yet. */
export function catalogPath({ q, category = null, minPrice = null, maxPrice = null, sort = 'relevance', offset = 0, limit = 20 } = {}) {
  const text = String(q || '').trim();
  if (text.length < 2) return null;
  const p = [`q=${encodeURIComponent(text)}`];
  if (category) p.push(`category=${encodeURIComponent(category)}`);
  if (price(minPrice) !== null) p.push(`minPrice=${price(minPrice)}`);
  if (price(maxPrice) !== null) p.push(`maxPrice=${price(maxPrice)}`);
  if (sort && sort !== 'relevance' && SORTS.some((s) => s.id === sort)) p.push(`sort=${sort}`);
  if (limit) p.push(`limit=${limit}`);
  if (offset) p.push(`offset=${offset}`);
  return `/shops/search/catalog?${p.join('&')}`;
}

/** Where a suggestion or result opens in the app. */
export function routeFor(item) {
  if (!item) return null;
  if (item.type === 'shop') return `/modules/shops/${item.id}`;
  const shopId = item.shopId || (item.shop && item.shop.id);
  return shopId ? `/product/${shopId}/${item.id}` : null;
}

export async function searchCatalog(params, { api = apiLib } = {}) {
  const path = catalogPath(params);
  if (!path) return null;
  const data = await api.apiGet(path);
  return {
    products: Array.isArray(data && data.products) ? data.products : [],
    shops: Array.isArray(data && data.shops) ? data.shops : [],
    total: Number(data && data.total) || 0,
    facets: (data && data.facets) || { categories: [], price: null },
  };
}

export async function suggest(q, { api = apiLib } = {}) {
  const text = String(q || '').trim();
  if (text.length < 2) return [];
  const data = await api.apiGet(`/shops/search/suggest?q=${encodeURIComponent(text)}`);
  return Array.isArray(data && data.suggestions) ? data.suggestions : [];
}

/** "₹45" / "₹45.50" */
export const rupees = (v) => `₹${Number(v) % 1 === 0 ? Number(v) : Number(v).toFixed(2)}`;
