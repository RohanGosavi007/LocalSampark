import test from 'node:test';
import assert from 'node:assert/strict';
import sitemap from '../src/app/sitemap.js';
import robots from '../src/app/robots.js';
import {
  OrganizationJsonLd,
  LocalBusinessJsonLd,
  ProductJsonLd,
  BreadcrumbJsonLd
} from '../src/components/seo/JsonLd.js';

test('P7.1 [SEO]: sitemap.js returns structured URLs with valid priority and changeFrequency', async () => {
  const entries = await sitemap();
  assert.ok(Array.isArray(entries), 'sitemap should return an array');
  assert.ok(entries.length >= 8, `sitemap should contain at least 8 routes, got ${entries.length}`);

  const urls = entries.map((e) => e.url);

  // Check required core routes
  assert.ok(urls.some((u) => u.endsWith('.com') || u.endsWith('.in') || u.endsWith('.com/')), 'root URL missing');
  assert.ok(urls.some((u) => u.includes('/marketplace')), '/marketplace route missing from sitemap');
  assert.ok(urls.some((u) => u.includes('/privacy')), '/privacy route missing from sitemap');
  assert.ok(urls.some((u) => u.includes('/terms')), '/terms route missing from sitemap');
  assert.ok(urls.some((u) => u.includes('/refunds')), '/refunds route missing from sitemap');
  assert.ok(urls.some((u) => u.includes('/legal/grievance')), '/legal/grievance missing from sitemap');
  assert.ok(urls.some((u) => u.includes('/account-deletion')), '/account-deletion missing from sitemap');

  // Verify URL metadata attributes
  for (const entry of entries) {
    assert.ok(entry.url.startsWith('http'), `invalid URL in sitemap: ${entry.url}`);
    assert.ok(entry.lastModified, `missing lastModified for ${entry.url}`);
    assert.ok(typeof entry.priority === 'number', `missing or invalid priority for ${entry.url}`);
    assert.ok(['daily', 'weekly', 'monthly', 'hourly', 'yearly'].includes(entry.changeFrequency), `invalid changeFrequency: ${entry.changeFrequency}`);
  }
});

test('P7.2 [SEO]: robots.js disallows private consoles and specifies canonical sitemap', () => {
  const policy = robots();
  assert.ok(policy.rules, 'robots.js must define rules');
  assert.equal(policy.rules.userAgent, '*');
  assert.equal(policy.rules.allow, '/');

  const disallows = policy.rules.disallow;
  assert.ok(Array.isArray(disallows), 'disallow should be an array');
  assert.ok(disallows.includes('/admin/'), 'must disallow /admin/');
  assert.ok(disallows.includes('/checkout/'), 'must disallow /checkout/');
  assert.ok(disallows.includes('/shop-dashboard/'), 'must disallow /shop-dashboard/');
  assert.ok(disallows.includes('/delivery-dashboard/'), 'must disallow /delivery-dashboard/');
  assert.ok(disallows.includes('/wallet/'), 'must disallow /wallet/');

  assert.ok(policy.sitemap && policy.sitemap.includes('sitemap.xml'), 'must link to sitemap.xml');
});

test('P7.3 [SEO]: JsonLd schema generator outputs valid Schema.org structures', () => {
  // Test Organization schema
  const orgComponent = OrganizationJsonLd();
  assert.ok(orgComponent && orgComponent.props && orgComponent.props.dangerouslySetInnerHTML);
  const orgJson = JSON.parse(orgComponent.props.dangerouslySetInnerHTML.__html);
  assert.equal(orgJson['@context'], 'https://schema.org');
  assert.equal(orgJson['@type'], 'WebApplication');
  assert.equal(orgJson.name, 'LocalSampark');
  assert.equal(orgJson.areaServed?.name, 'Pune');

  // Test LocalBusiness schema
  const mockShop = {
    id: 'shop_001',
    slug: 'dhanori-bakers',
    name: 'Dhanori Fresh Bakers',
    phone: '+91-9876543210',
    address: 'Survey 14, Dhanori',
    pincode: '411015',
    latitude: 18.5857,
    longitude: 73.8913,
    rating: 4.8,
    review_count: 42
  };
  const shopComponent = LocalBusinessJsonLd({ shop: mockShop });
  const shopJson = JSON.parse(shopComponent.props.dangerouslySetInnerHTML.__html);
  assert.equal(shopJson['@type'], 'LocalBusiness');
  assert.equal(shopJson.name, 'Dhanori Fresh Bakers');
  assert.equal(shopJson.geo?.latitude, 18.5857);
  assert.equal(shopJson.address?.postalCode, '411015');
  assert.equal(shopJson.aggregateRating?.ratingValue, 4.8);

  // Test Product schema
  const mockProduct = {
    id: 'prod_101',
    name: 'Artisan Sourdough Loaf',
    price: 180,
    stock_quantity: 15
  };
  const prodComponent = ProductJsonLd({ product: mockProduct, shop: mockShop });
  const prodJson = JSON.parse(prodComponent.props.dangerouslySetInnerHTML.__html);
  assert.equal(prodJson['@type'], 'Product');
  assert.equal(prodJson.name, 'Artisan Sourdough Loaf');
  assert.equal(prodJson.offers?.price, '180.00');
  assert.equal(prodJson.offers?.priceCurrency, 'INR');
  assert.equal(prodJson.offers?.availability, 'https://schema.org/InStock');

  // Test Breadcrumb schema
  const breadcrumbComponent = BreadcrumbJsonLd({
    items: [
      { name: 'Home', url: '/' },
      { name: 'Shops', url: '/shops' },
      { name: 'Dhanori Fresh Bakers', url: '/shop/dhanori-bakers' }
    ]
  });
  const bcJson = JSON.parse(breadcrumbComponent.props.dangerouslySetInnerHTML.__html);
  assert.equal(bcJson['@type'], 'BreadcrumbList');
  assert.equal(bcJson.itemListElement.length, 3);
  assert.equal(bcJson.itemListElement[0].name, 'Home');
  assert.equal(bcJson.itemListElement[2].name, 'Dhanori Fresh Bakers');
});
