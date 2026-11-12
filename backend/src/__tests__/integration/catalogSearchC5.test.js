/**
 * C5: searching the catalogue. The only search looked at shops, so no product
 * could be found by name, a typo found nothing, and there was no autocomplete
 * over products and no category or price filter.
 */
const express = require('express');
const request = require('supertest');
const { fx, fxLike } = require('../helpers/fixtureIds');
const { query } = require('../../config/database');
const search = require('../../services/catalogSearch.service');

const OWNER = fx('c5x-owner');
const SHOP = fx('c5x-shop');
const CLOSED = fx('c5x-closed');
const P = {
  rice: fx('c5x-rice'), brown: fx('c5x-brown'), wheat: fx('c5x-wheat'), atta: fx('c5x-atta'),
  hidden: fx('c5x-hidden'), closedRice: fx('c5x-closed-rice'), smokes: fx('c5x-smokes'),
};
let app;

async function cleanup() {
  await query(`DELETE FROM shop_products WHERE CAST(id AS TEXT) LIKE '${fxLike('c5x')}'`);
  await query(`DELETE FROM local_shops WHERE CAST(id AS TEXT) LIKE '${fxLike('c5x')}'`);
  await query(`DELETE FROM users WHERE CAST(id AS TEXT) LIKE '${fxLike('c5x')}'`);
}

beforeAll(async () => {
  await cleanup();
  await query("INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, 'C5 Owner', '9833555001', 'shop_owner')", [OWNER]);
  for (const [id, name, status] of [[SHOP, 'Kesarbagh Kirana Stores', 'approved'], [CLOSED, 'Kesarbagh Closed Mart', 'suspended']]) {
    await query(
      `INSERT INTO local_shops (id, owner_id, name, category, address, coordinate, latitude, longitude, approval_status)
       VALUES ($1, $2, $3, 'Grocery', 'Dhanori, Pune', 'POINT(73.87 18.53)', 18.53, 73.87, $4)`,
      [id, OWNER, name, status]
    );
  }
  for (const [id, shop, name, category, price, available] of [
    [P.rice, SHOP, 'Kesarbagh Basmati Rice 1kg', 'Grains', 120, 1],
    [P.brown, SHOP, 'Kesarbagh Brown Bread', 'Bakery', 45, 1],
    [P.wheat, SHOP, 'Kesarbagh Wheat Bread', 'Bakery', 55, 1],
    [P.atta, SHOP, 'Kesarbagh Chakki Atta 5kg', 'Grains', 260, 1],
    [P.hidden, SHOP, 'Kesarbagh Basmati Hidden', 'Grains', 99, 0],
    [P.closedRice, CLOSED, 'Kesarbagh Basmati Closed', 'Grains', 98, 1],
    [P.smokes, SHOP, 'Kesarbagh Cigarette Pack', 'Tobacco', 300, 1],
  ]) {
    await query(
      'INSERT INTO shop_products (id, shop_id, name, category, price, is_available) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, shop, name, category, price, available]
    );
  }
  app = express();
  app.use('/shops', require('../../modules/ecommerce/routes/shop.routes'));
  app.use(require('../../middleware/error.middleware').errorHandler);
});

afterAll(cleanup);

const ids = (body) => body.products.map((p) => p.id);
const find = (params) => request(app).get('/shops/search/catalog').query(params);

test('[C5.5] products are found by name, with typos; hidden products, closed shops and restricted goods are not', async () => {
  const exact = await find({ q: 'basmati' });
  expect(exact.status).toBe(200);
  expect(ids(exact.body)).toContain(P.rice);
  expect(exact.body.products.find((p) => p.id === P.rice)).toMatchObject({ name: 'Kesarbagh Basmati Rice 1kg', price: 120, shop: { id: SHOP, name: 'Kesarbagh Kirana Stores' } });

  for (const typo of ['basmatti', 'basmti rice', 'kesarbag']) {
    expect(ids((await find({ q: typo })).body)).toContain(P.rice);
  }
  const bread = ids((await find({ q: 'bred' })).body);
  expect(bread).toEqual(expect.arrayContaining([P.brown, P.wheat]));

  const all = ids((await find({ q: 'kesarbagh', limit: 50 })).body);
  expect(all).not.toContain(P.hidden);
  expect(all).not.toContain(P.closedRice);
  // Restricted goods (A3) are not offered.
  expect(all).not.toContain(P.smokes);
  expect(ids((await find({ q: 'cigarette' })).body)).not.toContain(P.smokes);

  const short = await find({ q: 'k' });
  expect(short.body).toMatchObject({ products: [], reason: 'query_too_short' });
});

test('[C5.6] category and price facets describe what matched, and filter it', async () => {
  const res = await find({ q: 'kesarbagh', limit: 50 });
  expect(res.body.total).toBe(4);
  expect(res.body.facets.categories).toEqual([{ name: 'Bakery', count: 2 }, { name: 'Grains', count: 2 }]);
  expect(res.body.facets.price).toEqual({ min: 45, max: 260 });

  const bakery = await find({ q: 'kesarbagh', category: 'bakery' });
  expect(ids(bakery.body).sort()).toEqual([P.brown, P.wheat].sort());
  // The category counts ignore the chosen category, so the others can be chosen again.
  expect(bakery.body.facets.categories.map((c) => c.name)).toEqual(['Bakery', 'Grains']);
  expect(bakery.body.facets.price).toEqual({ min: 45, max: 55 });

  const cheap = await find({ q: 'kesarbagh', minPrice: 50, maxPrice: 150 });
  expect(ids(cheap.body).sort()).toEqual([P.rice, P.wheat].sort());
  // The price range ignores the chosen limits.
  expect(cheap.body.facets.price).toEqual({ min: 45, max: 260 });
  expect(cheap.body.facets.categories).toEqual([{ name: 'Bakery', count: 1 }, { name: 'Grains', count: 1 }]);
});

test('[C5.7] results sort by price either way and page', async () => {
  const asc = await find({ q: 'kesarbagh', sort: 'price_asc', limit: 50 });
  expect(asc.body.products.map((p) => p.price)).toEqual([45, 55, 120, 260]);
  const desc = await find({ q: 'kesarbagh', sort: 'price_desc', limit: 2 });
  expect(desc.body.products.map((p) => p.price)).toEqual([260, 120]);
  expect(desc.body.total).toBe(4);
  const page2 = await find({ q: 'kesarbagh', sort: 'price_desc', limit: 2, offset: 2 });
  expect(page2.body.products.map((p) => p.price)).toEqual([55, 45]);
  // Within one shop.
  expect((await find({ q: 'kesarbagh', shopId: CLOSED })).body.products).toEqual([]);
});

test('[C5.8] autocomplete offers shops and products as the customer types, prefix matches first', async () => {
  const res = await request(app).get('/shops/search/suggest').query({ q: 'kesarbagh ba' });
  expect(res.status).toBe(200);
  expect(res.body.suggestions[0]).toMatchObject({ type: 'product', label: 'Kesarbagh Basmati Rice 1kg', shopId: SHOP });

  const shops = await request(app).get('/shops/search/suggest').query({ q: 'kesarbagh kir' });
  expect(shops.body.suggestions.some((s) => s.type === 'shop' && s.id === SHOP)).toBe(true);
  expect(shops.body.suggestions.some((s) => s.id === CLOSED)).toBe(false);
  const typo = await request(app).get('/shops/search/suggest').query({ q: 'chaki atta' });
  expect(typo.body.suggestions.map((s) => s.label)).toContain('Kesarbagh Chakki Atta 5kg');
  expect((await request(app).get('/shops/search/suggest').query({ q: 'k' })).body.suggestions).toEqual([]);
  // The shop itself shows with the products.
  expect((await find({ q: 'kesarbagh kirana' })).body.shops.map((s) => s.id)).toContain(SHOP);
});

test('[C5.9] the similarity measure is pg_trgm\'s, so both engines rank alike', () => {
  // pg_trgm documentation: similarity('word', 'two words') = 0.363636 and
  // word_similarity('word', 'two words') = 0.8.
  expect(search.similarity('word', 'two words')).toBeCloseTo(0.363636, 5);
  expect(search.wordSimilarity('word', 'two words')).toBeCloseTo(0.8, 5);
  expect([...search.trigrams('cat')].sort()).toEqual(['  c', ' ca', 'at ', 'cat']);
  expect(search.wordSimilarity('basmatti', 'kesarbagh basmati rice 1kg')).toBeGreaterThan(0.45);
  expect(search.normalise('  Basmati   RICE ')).toBe('basmati rice');
  expect(search.normalise('a')).toBeNull();
});
