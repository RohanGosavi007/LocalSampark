// @ts-check
/**
 * P7: what a crawler sees. Pages are fetched as raw HTML (no JavaScript), as
 * a search engine or link preview would, against the E2E backend's fixture
 * data (scripts/e2e/prepare-db.js).
 */
const { test, expect } = require('@playwright/test');

const API = 'http://localhost:5000/api/v1';

const canonicalOf = (html) => (html.match(/<link[^>]+rel="canonical"[^>]*>/) || [''])[0].match(/href="([^"]+)"/)?.[1];
const metaOf = (html, attr, name) => {
  const tag = (html.match(new RegExp(`<meta[^>]+${attr}="${name}"[^>]*>`)) || [''])[0];
  return tag.match(/content="([^"]*)"/)?.[1];
};
const jsonLdOf = (html) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));

async function pilotShop(request) {
  const res = await request.get(`${API}/shops?limit=50`);
  expect(res.ok()).toBeTruthy();
  const shops = (await res.json()).data;
  const shop = shops.find((s) => s.name === 'Sharma Grocery & Dairy');
  expect(shop, 'seeded pilot shop').toBeTruthy();
  return shop;
}

test.describe('SEO and metadata', () => {
  test('[P7.2] a shop page is server-rendered with its own title, description, Open Graph and canonical', async ({ request }) => {
    const shop = await pilotShop(request);
    const res = await request.get(`/shops/${shop.id}`);
    expect(res.status()).toBe(200);
    const html = await res.text();

    expect(html).toMatch(new RegExp(`<title>${shop.name.replace(/[&]/g, '&amp;')}[^<]*\\| LocalSampark</title>`));
    expect(metaOf(html, 'name', 'description')).toContain('Fresh dairy products');
    expect(metaOf(html, 'property', 'og:title')).toBe(shop.name.replace(/&/g, '&amp;'));
    expect(canonicalOf(html)).toMatch(new RegExp(`/shops/${shop.id}$`));
  });

  test('[P7.3] a shop page carries LocalBusiness, Product/Offer and breadcrumb JSON-LD from real data', async ({ request }) => {
    const shop = await pilotShop(request);
    const products = await (await request.get(`${API}/shops/${shop.id}/products`)).json();
    const html = await (await request.get(`/shops/${shop.id}`)).text();
    const ld = jsonLdOf(html);

    const business = ld.find((d) => d['@type'] === 'LocalBusiness');
    expect(business).toBeTruthy();
    expect(business.name).toBe(shop.name);
    // Only what the record holds: the seeded shop has no pincode, so none is published.
    expect(business.address.postalCode ?? null).toBe(shop.pincode ?? null);
    expect(business.address.streetAddress).toBe(shop.address);
    expect(business.geo.latitude).toBeCloseTo(Number(shop.latitude), 3);
    const offers = business.hasOfferCatalog.itemListElement;
    expect(offers.length).toBe(products.length);
    for (const product of products) {
      const offer = offers.find((o) => o.itemOffered.name === product.name);
      expect(offer, product.name).toBeTruthy();
      expect(offer.price).toBe(Number(product.price).toFixed(2));
      expect(offer.priceCurrency).toBe('INR');
    }

    const crumbs = ld.find((d) => d['@type'] === 'BreadcrumbList');
    expect(crumbs.itemListElement.map((i) => i.name)).toEqual(['Home', 'Shops', shop.name]);

    // Nothing invented: no placeholder phone, no default rating.
    expect(html).not.toContain('9876543210');
    expect(business.aggregateRating).toBeUndefined();
  });

  test('[P7.4] the sitemap lists active shops and robots.txt points at it on the same site', async ({ request }) => {
    const shop = await pilotShop(request);
    const sitemap = await (await request.get('/sitemap.xml')).text();
    const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    const origin = new URL(locs[0]).origin;
    expect(locs).toContain(`${origin}/shops/${shop.id}`);
    expect(locs).toContain(`${origin}/legal/grievance`);
    expect(locs.some((l) => l.includes('/shop/'))).toBe(false);

    const robots = await (await request.get('/robots.txt')).text();
    expect(robots).toContain(`Sitemap: ${origin}/sitemap.xml`);
    expect(robots).toMatch(/Disallow: \/checkout\//);
  });

  test('[P7.5] every public page declares itself, not the homepage, as canonical', async ({ request }) => {
    for (const path of ['/shops', '/search', '/support', '/services']) {
      const html = await (await request.get(path)).text();
      expect(canonicalOf(html), path).toMatch(new RegExp(`${path}$`));
    }
    const home = canonicalOf(await (await request.get('/')).text());
    expect(new URL(home).pathname).toBe('/');
  });

  test('[P7.6] an unknown shop is not indexed', async ({ request }) => {
    const html = await (await request.get('/shops/00000000-0000-4000-8000-00000000dead')).text();
    expect(metaOf(html, 'name', 'robots')).toMatch(/noindex/);
  });
});
