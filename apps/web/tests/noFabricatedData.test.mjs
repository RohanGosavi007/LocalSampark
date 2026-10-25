/**
 * Pages that people use must not invent what they show.
 *
 * Found by reading: a "using mock data" catch block on five pages (an outage
 * showed made-up chefs, donation drives and customers as if real), random post
 * counts, a random "mins away", random sales per franchise shop, random stock
 * badges, and a payouts ledger that was a fixed table of invented transactions.
 *
 * Run with: npm test --workspace=apps/web
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP = path.join(WEB, 'src', 'app');
const read = (rel) => fs.readFileSync(path.join(APP, rel), 'utf8');

test('a failed request does not fall back to invented rows', () => {
  for (const rel of ['chef/page.js', 'community-hub/page.js', 'donations/page.js', 'equipment/page.js']) {
    const src = read(rel);
    assert.ok(!/using mock data/i.test(src), `${rel}: still falls back to mock data`);
    assert.ok(!/\{\s*id:\s*1,\s*(?:name|title|author|item_name)/.test(src), `${rel}: still carries invented rows`);
  }
});

test('numbers on screen are not random', () => {
  const spots = [
    'community/page.js',
    'franchise-dashboard/shops/page.js',
    'payouts/page.js',
    'shops/page.js',
    'tracking/page.js',
    'shops/[id]/components/PharmacyVisitorView.js',
    'shops/[id]/components/RetailVisitorView.js',
  ];
  for (const rel of spots) {
    assert.ok(!/Math\.random\(\)/.test(read(rel)), `${rel}: Math.random() feeds the page`);
  }
});

test('the payouts page reads the wallet ledger', () => {
  const src = read('payouts/page.js');
  assert.ok(src.includes('/wallet/history'), 'payouts should load /wallet/history');
  assert.ok(!/TXN-882/.test(src), 'payouts still shows an invented transaction id');
});

test('admin and safety pages read the API instead of simulating it', () => {
  const wired = {
    'admin/health/page.js': '/admin/health',
    'admin-dashboard/commissions/page.js': 'PendingPayouts',
    'admin-dashboard/finance-ledger/payouts/page.js': 'PendingPayouts',
    'admin-dashboard/logistics/map/page.js': '/admin/delivery/agents',
    'admin-dashboard/support/page.js': '/admin/support/auto-reply',
    'sos-dashboard/page.js': '/sos/active',
    'society-admin/broadcast/page.js': '/society/notices',
    'shop-manager/bulk-upload/page.js': '/shops/my-shop/products',
    'story-create/page.js': '/stories',
    'profile/security/page.js': '/users/me/delete-account',
  };
  for (const [rel, needle] of Object.entries(wired)) {
    const src = read(rel);
    assert.ok(src.includes(needle), `${rel} should use ${needle}`);
    assert.ok(!/setTimeout\([^)]*(setLoading|setSent|setUploadComplete|setIsUploading|setAlerts|setPayouts|setActiveDeliveries)/s.test(src), `${rel} still simulates a response with setTimeout`);
    assert.ok(!/Mock|Simulate|Dummy/.test(src), `${rel} still mentions mock/simulated data`);
  }
});

test('no page invents a rating or a sponsored product', () => {
  for (const rel of ['shops/page.js', 'carpool/page.js', 'services/page.js', 'search/page.js']) {
    const src = read(rel);
    assert.ok(!/\|\|\s*'4\.[0-9]'/.test(src), `${rel}: a default rating is shown for unrated items`);
    assert.ok(!/AD1|Sponsored Products/.test(src), `${rel}: invented sponsored products`);
  }
});

// ── Invented people, businesses and branded stock in code that real users see ──
const NEEDLES = [
  'Sharma', 'Verma', 'Deshmukh', 'Kulkarni', 'Bhosale', 'Balaji SuperMart', 'Apollo Pharmacy', 'Green Leaf Veg',
  'Aashirvaad', 'Amul ', 'Maggi', 'Tata Salt', 'Parle-G', 'Golden Crumb', 'Glow & Glamour',
  'Rahul', 'Priya', 'Sneha', 'Vikram', 'Suresh', 'Ramesh', 'Anjali', 'Sunita', 'Pooja',
  '12,450', '1,204 Verified', '₹1.2 Cr', '4.8★', 'Real Voices',
];
// Walkthrough material for the investor demo, which is labelled and kept out of search results.
const DEMO_ONLY = new Set(['components/BookingSimulator.js', 'components/DeliveryAgentSimulator.js', 'components/VendorDmsSimulator.js']);

function srcFiles(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.next'].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) srcFiles(p, out);
    else if (/\.(js|jsx)$/.test(e.name)) out.push(p);
  }
  return out;
}
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[^\S\n]*\/\/[^\n]*/gm, '').replace(/([^:'"`])\/\/[^\n]*$/gm, '$1');

test('no live page or component carries invented people, shops or totals', () => {
  const SRC = path.join(WEB, 'src');
  const offenders = [];
  for (const file of srcFiles(SRC)) {
    const rel = path.relative(SRC, file).split(path.sep).join('/');
    if (DEMO_ONLY.has(rel) || /data\/translations\.js$/.test(rel)) continue;
    const lines = strip(fs.readFileSync(file, 'utf8')).split('\n');
    for (const needle of NEEDLES) {
      const hit = lines.findIndex((l) => l.includes(needle) && !/placeholder\s*=|e\.g\./.test(l));
      if (hit !== -1) offenders.push(`${rel}: "${needle}"`);
    }
  }
  assert.deepEqual(offenders, []);
});

test('pages that used to simulate a result now call the API', () => {
  const must = {
    'dashboard/page.js': '/orders/my-orders',
    'order-tracking/page.js': '/orders/${id}',
    'delivery-dashboard/page.js': '/delivery/jobs',
    'health/page.js': '/sos/trigger',
    'rewards/page.js': '/loyalty/spin',
    'community/page.js': '/feed/posts',
    'properties/page.js': '/properties',
  };
  for (const [rel, needle] of Object.entries(must)) {
    assert.ok(read(rel).includes(needle), `${rel} should use ${needle}`);
  }
});
