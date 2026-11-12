/**
 * C5: the search page's state, kept in the URL (q, category, minPrice,
 * maxPrice, sort) so a search can be shared and the back button works. Free
 * of React so it can be tested with node --test.
 */

export const SORTS = [
  { id: 'relevance', label: 'Best match' },
  { id: 'price_asc', label: 'Price: low to high' },
  { id: 'price_desc', label: 'Price: high to low' },
];

const price = (v) => {
  if (v === null || v === undefined || String(v).trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

/** The search a URL describes. `params` is a URLSearchParams (or has .get). */
export function readSearch(params) {
  const get = (k) => (params && typeof params.get === 'function' ? params.get(k) : null);
  const sort = get('sort');
  return {
    q: String(get('q') || '').trim(),
    category: get('category') || null,
    minPrice: price(get('minPrice')),
    maxPrice: price(get('maxPrice')),
    sort: SORTS.some((s) => s.id === sort) ? sort : 'relevance',
  };
}

/** The query string for a search: for the page URL and for the API alike. */
export function searchQuery(search, extra = {}) {
  const out = new URLSearchParams();
  const all = { ...search, ...extra };
  if (all.q) out.set('q', all.q);
  if (all.category) out.set('category', all.category);
  if (all.minPrice !== null && all.minPrice !== undefined) out.set('minPrice', String(all.minPrice));
  if (all.maxPrice !== null && all.maxPrice !== undefined) out.set('maxPrice', String(all.maxPrice));
  if (all.sort && all.sort !== 'relevance') out.set('sort', all.sort);
  if (all.limit) out.set('limit', String(all.limit));
  if (all.offset) out.set('offset', String(all.offset));
  return out.toString();
}

/** A new search with one thing changed; changing anything returns to page one. */
export function withChange(search, change) {
  return { ...search, ...change };
}

/** Where a suggestion leads. */
export function suggestionHref(s) {
  if (!s) return null;
  if (s.type === 'shop') return `/shops/${encodeURIComponent(s.id)}`;
  if (s.type === 'product' && s.shopId) return `/shops/${encodeURIComponent(s.shopId)}/products/${encodeURIComponent(s.id)}`;
  return null;
}

/** Where a product result leads. */
export const productHref = (p) => `/shops/${encodeURIComponent(p.shop.id)}/products/${encodeURIComponent(p.id)}`;

/** "₹45" / "₹45.50" */
export const rupees = (v) => `₹${Number(v) % 1 === 0 ? Number(v) : Number(v).toFixed(2)}`;
