/**
 * S2 product variants — who may change them, and what they may be set to.
 *
 * PUT and DELETE checked that the caller owned the shop named in the URL and
 * then acted on the variant id alone, so a seller could edit or delete another
 * shop's variants; POST attached a variant to any product id. A modifier that
 * took the price below zero was accepted and then priced a negative line at
 * checkout.
 */
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { fx, fxLike } = require('../helpers/fixtureIds');
const { query, queryOne, queryMany } = require('../../config/database');
const { getJwtSecret } = require('../../config/secrets');
const { pointSql } = require('../../utils/sqlPoint');

const OWNER_A = fx('s2v-owner-a');
const OWNER_B = fx('s2v-owner-b');
const ADMIN = fx('s2v-admin');
const SHOP_A = fx('s2v-shop-a');
const SHOP_B = fx('s2v-shop-b');
const PROD_A = fx('s2v-prod-a'); // ₹100
const PROD_B = fx('s2v-prod-b'); // ₹100
const VARIANT_B = fx('s2v-variant-b'); // belongs to shop B's product

const as = (userId) => ({ Authorization: `Bearer ${jwt.sign({ userId }, getJwtSecret(), { expiresIn: '5m' })}` });
let app;

async function cleanup() {
  await query(`DELETE FROM product_variants WHERE CAST(product_id AS TEXT) LIKE '${fxLike('s2v')}'`);
  await query(`DELETE FROM shop_products WHERE CAST(id AS TEXT) LIKE '${fxLike('s2v')}'`);
  await query("DELETE FROM shop_products WHERE name IN ('S2 Created', 'S2 Bad')");
  await query(`DELETE FROM local_shops WHERE CAST(id AS TEXT) LIKE '${fxLike('s2v')}'`);
  await query(`DELETE FROM users WHERE CAST(id AS TEXT) LIKE '${fxLike('s2v')}'`);
}

beforeAll(async () => {
  await cleanup();
  for (const [id, phone, role] of [[OWNER_A, '9833212001', 'shop_owner'], [OWNER_B, '9833212002', 'shop_owner'], [ADMIN, '9833212003', 'super_admin']]) {
    await query('INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, $2, $3, $4)', [id, 'S2 Variants', phone, role]);
  }
  for (const [id, owner] of [[SHOP_A, OWNER_A], [SHOP_B, OWNER_B]]) {
    await query(
      `INSERT INTO local_shops (id, owner_id, name, category, address, latitude, longitude, coordinate, is_active, is_verified)
       VALUES ($1, $2, 'S2 Shop', 'grocery', 'S2 Road', 18.53, 73.87, ${pointSql(18.53, 73.87)}, true, true)`,
      [id, owner]
    );
  }
  for (const [id, shop] of [[PROD_A, SHOP_A], [PROD_B, SHOP_B]]) {
    await query(
      `INSERT INTO shop_products (id, shop_id, name, price, inventory_count, stock_quantity, track_inventory)
       VALUES ($1, $2, 'S2 Product', 100, 10, 10, 1)`,
      [id, shop]
    );
  }
  await query(
    `INSERT INTO product_variants (id, product_id, variant_name, variant_value, price_modifier, inventory_count)
     VALUES ($1, $2, 'Size', 'Large', 20, 5)`,
    [VARIANT_B, PROD_B]
  );
  app = express();
  app.use(express.json());
  app.use('/shops', require('../../modules/ecommerce/routes/shop.routes'));
});

afterAll(cleanup);

const path = (shop, prod, variant) => `/shops/${shop}/products/${prod}/variants${variant ? `/${variant}` : ''}`;

describe('[S2.5] seller: variants are managed only by the shop that owns them', () => {
  let variantId;

  test('[S2.5] the owner creates, lists, edits and deletes a variant of their own product', async () => {
    const made = await request(app).post(path(SHOP_A, PROD_A)).set(as(OWNER_A))
      .send({ variant_name: ' Size ', variant_value: 'Medium', sku: 'MED-1', price_modifier: 10, inventory_count: 4 });
    expect(made.status).toBe(201);
    expect(made.body.variant).toMatchObject({ variant_name: 'Size', variant_value: 'Medium', price_modifier: 10, inventory_count: 4 });
    variantId = made.body.variant.id;

    const listed = await request(app).get(path(SHOP_A, PROD_A));
    expect(listed.body.variants.map((v) => v.id)).toContain(variantId);

    const edited = await request(app).put(path(SHOP_A, PROD_A, variantId)).set(as(OWNER_A)).send({ price_modifier: 15, inventory_count: 9 });
    expect(edited.status).toBe(200);
    expect(edited.body.variant).toMatchObject({ variant_value: 'Medium', price_modifier: 15, inventory_count: 9 }); // untouched fields kept
    const row = await queryOne('SELECT price_modifier, inventory_count FROM product_variants WHERE id = $1', [variantId]);
    expect([Number(row.price_modifier), Number(row.inventory_count)]).toEqual([15, 9]);

    expect((await request(app).delete(path(SHOP_A, PROD_A, variantId)).set(as(OWNER_A))).status).toBe(200);
    expect(await queryOne('SELECT id FROM product_variants WHERE id = $1', [variantId])).toBeFalsy();
  });

  test("[S2.5] a seller cannot edit or delete another shop's variant by naming their own shop in the URL", async () => {
    const put = await request(app).put(path(SHOP_A, PROD_A, VARIANT_B)).set(as(OWNER_A)).send({ price_modifier: -99 });
    expect(put.status).toBe(404);
    const del = await request(app).delete(path(SHOP_A, PROD_A, VARIANT_B)).set(as(OWNER_A));
    expect(del.status).toBe(404);
    const row = await queryOne('SELECT price_modifier FROM product_variants WHERE id = $1', [VARIANT_B]);
    expect(Number(row.price_modifier)).toBe(20); // unchanged, still there
  });

  test("[S2.5] a seller cannot attach a variant to another shop's product", async () => {
    const res = await request(app).post(path(SHOP_A, PROD_B)).set(as(OWNER_A)).send({ variant_name: 'Size', variant_value: 'Huge' });
    expect(res.status).toBe(404);
    const rows = await queryMany('SELECT id FROM product_variants WHERE product_id = $1', [PROD_B]);
    expect(rows.length).toBe(1);
  });

  test("[S2.5] a seller cannot act through another shop's URL at all", async () => {
    expect((await request(app).post(path(SHOP_B, PROD_B)).set(as(OWNER_A)).send({ variant_name: 'Size', variant_value: 'X' })).status).toBe(403);
    expect((await request(app).put(path(SHOP_B, PROD_B, VARIANT_B)).set(as(OWNER_A)).send({ inventory_count: 0 })).status).toBe(403);
    expect((await request(app).delete(path(SHOP_B, PROD_B, VARIANT_B)).set(as(OWNER_A))).status).toBe(403);
  });

  test('[S2.5] signed-out requests are refused; platform staff may manage any shop', async () => {
    expect((await request(app).post(path(SHOP_A, PROD_A)).send({ variant_name: 'Size', variant_value: 'X' })).status).toBe(401);
    const asAdmin = await request(app).put(path(SHOP_B, PROD_B, VARIANT_B)).set(as(ADMIN)).send({ inventory_count: 7 });
    expect(asAdmin.status).toBe(200);
  });

  test.each([
    ['no name', { variant_value: 'Large' }],
    ['no value', { variant_name: 'Size' }],
    ['a modifier that is not a number', { variant_name: 'Size', variant_value: 'L', price_modifier: 'abc' }],
    ['a modifier that makes the price negative', { variant_name: 'Size', variant_value: 'L', price_modifier: -150 }],
    ['a huge modifier', { variant_name: 'Size', variant_value: 'L', price_modifier: 99999999 }],
    ['negative stock', { variant_name: 'Size', variant_value: 'L', inventory_count: -3 }],
    ['fractional stock', { variant_name: 'Size', variant_value: 'L', inventory_count: 2.5 }],
  ])('[S2.5] %s is refused', async (_label, body) => {
    const res = await request(app).post(path(SHOP_A, PROD_A)).set(as(OWNER_A)).send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  test('[S2.5] a variant that would cost ₹0 or more is accepted, and the edit route enforces the same rules', async () => {
    const free = await request(app).post(path(SHOP_A, PROD_A)).set(as(OWNER_A)).send({ variant_name: 'Offer', variant_value: 'Free', price_modifier: -100 });
    expect(free.status).toBe(201); // 100 - 100 = 0, not below zero
    const bad = await request(app).put(path(SHOP_A, PROD_A, free.body.variant.id)).set(as(OWNER_A)).send({ price_modifier: -101 });
    expect(bad.status).toBe(400);
  });
});

describe('[S2.6] seller: a product cannot be created or changed to a nonsense price or stock', () => {
  const mine = (method, urlPath, who, body) => request(app)[method](urlPath).set(as(who)).send(body);
  let createdId;

  test('[S2.6] a valid product is created with the price and stock given', async () => {
    const res = await mine('post', '/shops/my-shop/products', OWNER_A, { name: 'S2 Created', price: '49.5', stock_quantity: '12' });
    expect(res.status).toBe(201);
    createdId = res.body.product.id;
    const row = await queryOne('SELECT price, stock_quantity, inventory_count FROM shop_products WHERE id = $1', [createdId]);
    expect([Number(row.price), Number(row.stock_quantity), Number(row.inventory_count)]).toEqual([49.5, 12, 12]);
  });

  test.each([
    ['no price (it used to become a free ₹0 product)', { name: 'S2 Bad' }, 'price'],
    ['a price that is not a number', { name: 'S2 Bad', price: 'abc' }, 'price'],
    ['a negative price', { name: 'S2 Bad', price: -5 }, 'price'],
    ['negative stock', { name: 'S2 Bad', price: 10, stock_quantity: -1 }, 'stock_quantity'],
    ['fractional stock', { name: 'S2 Bad', price: 10, stock_quantity: 2.5 }, 'stock_quantity'],
  ])('[S2.6] %s is refused and nothing is stored', async (_label, body, field) => {
    const res = await mine('post', '/shops/my-shop/products', OWNER_A, body);
    expect(res.status).toBe(400);
    expect(res.body.field).toBe(field);
    expect(await queryOne("SELECT id FROM shop_products WHERE name = 'S2 Bad'")).toBeFalsy();
  });

  test('[S2.6] the same rules apply when a product is edited, and nothing changes on refusal', async () => {
    for (const body of [{ price: 'abc' }, { price: -1 }, { stock_quantity: -3 }, { stock_quantity: 1.5 }]) {
      const res = await mine('put', `/shops/my-shop/products/${createdId}`, OWNER_A, body);
      expect(res.status).toBe(400);
    }
    const row = await queryOne('SELECT price, stock_quantity FROM shop_products WHERE id = $1', [createdId]);
    expect([Number(row.price), Number(row.stock_quantity)]).toEqual([49.5, 12]);

    const ok = await mine('put', `/shops/my-shop/products/${createdId}`, OWNER_A, { price: 55, stock_quantity: 8 });
    expect(ok.status).toBe(200);
    const after = await queryOne('SELECT price, stock_quantity, inventory_count FROM shop_products WHERE id = $1', [createdId]);
    expect([Number(after.price), Number(after.stock_quantity), Number(after.inventory_count)]).toEqual([55, 8, 8]);
  });

  test("[S2.6] a seller cannot edit another shop's product", async () => {
    const res = await mine('put', `/shops/my-shop/products/${PROD_B}`, OWNER_A, { price: 1 });
    expect(res.status).toBe(404);
    const row = await queryOne('SELECT price FROM shop_products WHERE id = $1', [PROD_B]);
    expect(Number(row.price)).toBe(100);
  });
});
