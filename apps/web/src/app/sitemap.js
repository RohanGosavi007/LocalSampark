import { API_BASE } from '../lib/apiUrl.js';
import { SITE_URL } from '../lib/seo.js';

/**
 * sitemap.xml (P7): the public pages, then every active shop.
 *
 * Shops were never listed: this read `data.shops` from GET /shops, which
 * answers `{ data: [...] }`, so the dynamic part was always empty. They were
 * also addressed as /shop/:id, a redirect, rather than the page itself.
 */
// Rendered per request. Built statically, the sitemap held whatever the API
// returned at build time, which is often nothing (the build cannot always
// reach it), and kept that for an hour.
export const dynamic = 'force-dynamic';

const STATIC_ROUTES = [
  ['', 1.0, 'daily'],
  ['/shops', 0.9, 'daily'],
  ['/marketplace', 0.9, 'daily'],
  ['/search', 0.8, 'daily'],
  ['/services', 0.7, 'weekly'],
  ['/about', 0.6, 'monthly'],
  ['/support', 0.5, 'monthly'],
  ['/privacy', 0.5, 'monthly'],
  ['/terms', 0.5, 'monthly'],
  ['/refunds', 0.5, 'monthly'],
  ['/legal/grievance', 0.6, 'monthly'],
  ['/account-deletion', 0.6, 'monthly'],
];

async function fetchShops() {
  const shops = [];
  let cursor = null;
  // Paged so a growing catalogue is not cut off at the first page; bounded so
  // a misbehaving API cannot hold the build.
  for (let page = 0; page < 20; page++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    try {
      const url = `${API_BASE}/shops?limit=200${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
      const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
      if (!res.ok) break;
      const body = await res.json();
      const rows = Array.isArray(body) ? body : Array.isArray(body && body.data) ? body.data : [];
      shops.push(...rows);
      cursor = body && body.nextCursor;
      if (!cursor || rows.length === 0) break;
    } catch {
      break;
    } finally {
      clearTimeout(timer);
    }
  }
  return shops;
}

export default async function sitemap() {
  const now = new Date().toISOString();
  const routes = STATIC_ROUTES.map(([path, priority, changeFrequency]) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));

  const shops = await fetchShops();
  const seen = new Set();
  for (const shop of shops) {
    if (!shop || !shop.id || seen.has(shop.id)) continue;
    seen.add(shop.id);
    routes.push({
      url: `${SITE_URL}/shops/${encodeURIComponent(shop.id)}`,
      lastModified: shop.updated_at || shop.created_at || now,
      changeFrequency: 'daily',
      priority: 0.8,
    });
  }
  return routes;
}
