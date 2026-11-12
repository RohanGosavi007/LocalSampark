/**
 * C5 in the app: the search screen reads the catalogue search
 * (src/services/catalogSearch.js, app/search.js).
 */
const fs = require('fs');
const path = require('path');
const { catalogPath, routeFor, searchCatalog, suggest, rupees } = require('../src/services/catalogSearch');

test('[C5.12] the app asks for products with its filters, and opens what is chosen', async () => {
  expect(catalogPath({ q: 'a' })).toBeNull();
  expect(catalogPath({ q: ' atta ' })).toBe('/shops/search/catalog?q=atta&limit=20');
  expect(catalogPath({ q: 'atta', category: 'Grains & Pulses', minPrice: '50', maxPrice: 'x', sort: 'price_asc', offset: 20 }))
    .toBe('/shops/search/catalog?q=atta&category=Grains%20%26%20Pulses&minPrice=50&sort=price_asc&limit=20&offset=20');
  expect(catalogPath({ q: 'atta', sort: 'cheapest' })).toBe('/shops/search/catalog?q=atta&limit=20');

  expect(routeFor({ type: 'shop', id: 's1' })).toBe('/modules/shops/s1');
  expect(routeFor({ type: 'product', id: 'p1', shopId: 's1' })).toBe('/product/s1/p1');
  expect(routeFor({ id: 'p1', shop: { id: 's1' } })).toBe('/product/s1/p1');
  expect(rupees(45)).toBe('₹45');

  const apiGet = jest.fn()
    .mockResolvedValueOnce({ success: true, products: [{ id: 'p1', name: 'Basmati Rice', price: 120, shop: { id: 's1', name: 'Kirana' } }], shops: [], total: 1, facets: { categories: [{ name: 'Grains', count: 1 }], price: { min: 120, max: 120 } } })
    .mockResolvedValueOnce({ success: true, suggestions: [{ type: 'product', id: 'p1', label: 'Basmati Rice', shopId: 's1' }] });
  const found = await searchCatalog({ q: 'basmatti' }, { api: { apiGet } });
  expect(apiGet).toHaveBeenLastCalledWith('/shops/search/catalog?q=basmatti&limit=20');
  expect(found).toMatchObject({ total: 1, products: [{ id: 'p1' }], facets: { categories: [{ name: 'Grains', count: 1 }] } });
  expect(await suggest('bas', { api: { apiGet } })).toEqual([{ type: 'product', id: 'p1', label: 'Basmati Rice', shopId: 's1' }]);
  expect(apiGet).toHaveBeenLastCalledWith('/shops/search/suggest?q=bas');
  expect(await suggest('b', { api: { apiGet } })).toEqual([]);
});

test('[C5.13] the search screen uses the catalogue search, with suggestions and filters', () => {
  const screen = fs.readFileSync(path.join(__dirname, '../app/search.js'), 'utf8');
  expect(screen).toMatch(/searchCatalog\(\{ q: submitted, category, sort, minPrice, maxPrice \}\)/);
  expect(screen).toMatch(/await suggest\(q\)/);
  expect(screen).toMatch(/testID="category-facet"/);
  expect(screen).not.toMatch(/\/shops\/search\?q=/);
});
