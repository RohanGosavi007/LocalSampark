/**
 * C5 on the website: the search page keeps its search in the URL and reads
 * the catalogue search (src/lib/catalogSearch.js, src/app/search/page.js).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readSearch, searchQuery, withChange, suggestionHref, productHref, rupees } from '../src/lib/catalogSearch.js';

test('[C5.10] a search, its filters and its sort round-trip through the URL; nonsense is dropped', () => {
  const s = readSearch(new URLSearchParams('q=%20atta%20&category=Grains&minPrice=50&maxPrice=300&sort=price_asc'));
  assert.deepEqual(s, { q: 'atta', category: 'Grains', minPrice: 50, maxPrice: 300, sort: 'price_asc' });
  assert.equal(searchQuery(s), 'q=atta&category=Grains&minPrice=50&maxPrice=300&sort=price_asc');
  assert.deepEqual(readSearch(new URLSearchParams(searchQuery(s))), s);

  assert.deepEqual(readSearch(new URLSearchParams('q=bread&minPrice=-5&maxPrice=abc&sort=cheapest')),
    { q: 'bread', category: null, minPrice: null, maxPrice: null, sort: 'relevance' });
  // Relevance is the default and is left out; paging goes to the API only.
  assert.equal(searchQuery({ q: 'bread', sort: 'relevance' }, { limit: 20, offset: 40 }), 'q=bread&limit=20&offset=40');
  assert.deepEqual(withChange(s, { category: null }), { ...s, category: null });

  assert.equal(suggestionHref({ type: 'shop', id: 's 1' }), '/shops/s%201');
  assert.equal(suggestionHref({ type: 'product', id: 'p1', shopId: 's1' }), '/shops/s1/products/p1');
  assert.equal(productHref({ id: 'p1', shop: { id: 's1' } }), '/shops/s1/products/p1');
  assert.equal(rupees(45), '₹45');
  assert.equal(rupees(45.5), '₹45.50');
});

test('[C5.11] the search page reads the catalogue search and its suggestions, not the shop-only search', () => {
  const page = readFileSync(new URL('../src/app/search/page.js', import.meta.url), 'utf8');
  assert.match(page, /\/shops\/search\/catalog\?/);
  assert.match(page, /\/shops\/search\/suggest\?q=/);
  assert.doesNotMatch(page, /\/shops\/search\?q=/);
  assert.match(page, /data-testid="category-facet"/);
  assert.match(page, /Apply price/);
});
