/**
 * C4 / C12 on the web: recently viewed products (src/lib/recentlyViewed.js),
 * and the product and wishlist pages using what the server says.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { readRecent, recordView, clearRecent, MAX, KEY } from '../src/lib/recentlyViewed.js';

function memory() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}

test('[C12.7] recently viewed keeps the newest first, one entry per product, and at most 20', () => {
  const store = memory();
  recordView(store, { productId: 'a', shopId: 's', name: 'A', price: 10 }, 1);
  recordView(store, { productId: 'b', shopId: 's', name: 'B', price: 20 }, 2);
  recordView(store, { productId: 'a', shopId: 's', name: 'A', price: 12 }, 3);
  assert.deepEqual(readRecent(store).map((p) => [p.productId, p.price]), [['a', 12], ['b', 20]]);
  for (let i = 0; i < 30; i++) recordView(store, { productId: `p${i}`, shopId: 's', name: `P${i}` }, 10 + i);
  assert.equal(readRecent(store).length, MAX);
  assert.equal(readRecent(store)[0].productId, 'p29');
  assert.deepEqual(recordView(store, { name: 'no ids' }), readRecent(store));
  store.setItem(KEY, 'not json');
  assert.deepEqual(readRecent(store), []);
  assert.deepEqual(clearRecent(store), []);
});

test('[C4.7] the product page shows the server\'s declarations, never invented ones, and records the view', () => {
  const src = fs.readFileSync(new URL('../src/app/shops/[id]/products/[productId]/page.js', import.meta.url), 'utf8');
  assert.match(src, /\/shops\/\$\{encodeURIComponent\(shopId\)\}\/products\/\$\{encodeURIComponent\(productId\)\}/);
  assert.match(src, /Not provided by the seller/);
  assert.match(src, /recordView\(window\.localStorage/);
  assert.match(src, /variantId: variant\.id/);
  for (const key of ['genericName', 'netQuantity', 'manufacturer', 'countryOfOrigin', 'bestBefore', 'consumerCare']) {
    assert.ok(src.includes(`'${key}'`), `shows ${key}`);
  }
  // Product names on the shop page open the product page.
  for (const view of ['RetailVisitorView', 'PharmacyVisitorView', 'RestaurantVisitorView']) {
    const v = fs.readFileSync(new URL(`../src/app/shops/[id]/components/${view}.js`, import.meta.url), 'utf8');
    assert.match(v, /href=\{`\/shops\/\$\{shop\.id\}\/products\//, `${view} links products`);
  }
});

test('[C12.8] the wishlist page uses the server wishlist and its move-to-cart, and the header links to it', () => {
  const src = fs.readFileSync(new URL('../src/app/wishlist/page.js', import.meta.url), 'utf8');
  assert.match(src, /apiGet\('\/wishlist'\)/);
  assert.match(src, /move-to-cart/);
  assert.match(src, /pullFromServer\(\)/);
  const header = fs.readFileSync(new URL('../src/app/components/Header.js', import.meta.url), 'utf8');
  assert.match(header, /href="\/wishlist"/);
  // The cart badge counts the cart rather than printing 0.
  assert.doesNotMatch(header, />\s*0\s*<\/span>/);
  assert.match(header, /cartCount/);
});
