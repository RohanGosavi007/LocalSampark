import { API_BASE } from '../lib/apiUrl.js';

export default async function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://localsampark.com';

  // Static core and statutory routes
  const staticRoutePaths = [
    { path: '', priority: 1.0, changeFrequency: 'daily' },
    { path: '/marketplace', priority: 0.9, changeFrequency: 'daily' },
    { path: '/search', priority: 0.8, changeFrequency: 'daily' },
    { path: '/about', priority: 0.7, changeFrequency: 'weekly' },
    { path: '/privacy', priority: 0.5, changeFrequency: 'monthly' },
    { path: '/terms', priority: 0.5, changeFrequency: 'monthly' },
    { path: '/refunds', priority: 0.5, changeFrequency: 'monthly' },
    { path: '/legal/grievance', priority: 0.6, changeFrequency: 'monthly' },
    { path: '/account-deletion', priority: 0.6, changeFrequency: 'monthly' },
  ];

  const staticRoutes = staticRoutePaths.map(({ path, priority, changeFrequency }) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date().toISOString(),
    changeFrequency,
    priority,
  }));

  try {
    // Fetch verified active shops from API with a 3s timeout for build resilience
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(`${API_BASE}/shops?limit=200`, {
      signal: controller.signal,
      next: { revalidate: 3600 } // ISR: revalidate hourly
    }).catch(() => null);

    clearTimeout(timeout);

    if (!res || !res.ok) {
      return staticRoutes;
    }

    const data = await res.json().catch(() => null);
    const shops = Array.isArray(data?.shops) ? data.shops : (Array.isArray(data) ? data : []);

    const dynamicRoutes = shops
      .filter((shop) => shop && (shop.slug || shop.id))
      .map((shop) => ({
        url: `${baseUrl}/shop/${shop.slug || shop.id}`,
        lastModified: shop.updated_at || shop.created_at || new Date().toISOString(),
        changeFrequency: 'hourly',
        priority: 0.8,
      }));

    return [...staticRoutes, ...dynamicRoutes];
  } catch {
    return staticRoutes;
  }
}
