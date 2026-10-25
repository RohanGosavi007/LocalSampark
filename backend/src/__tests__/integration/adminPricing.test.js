/**
 * The admin console's commercial controls: pricing settings and merchant plan
 * prices.
 *
 * Reading needs an administrator; changing needs a super admin. A change takes
 * effect on the next quote and the next purchase.
 */

process.env.USE_SQLITE = 'true';

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { query, queryOne } = require('../../config/database');
const { getJwtSecret } = require('../../config/secrets');
const platformConfig = require('../../services/platformConfig.service');

const ADMIN = 'apr-admin';
const SUPER = 'apr-super';
const USER = 'apr-user';
const SHOP = 'apr-shop';

const as = (userId) => ({ Authorization: `Bearer ${jwt.sign({ userId }, getJwtSecret(), { expiresIn: '5m' })}` });
let app;

async function cleanup() {
  await query("DELETE FROM admin_config WHERE config_key IN ('delivery_base_fee', 'platform_fee', 'delivery_per_km_fee')");
  await query("DELETE FROM saas_plans WHERE name LIKE 'APR %'");
  await query("DELETE FROM shop_products WHERE id LIKE 'apr-%'");
  await query("DELETE FROM local_shops WHERE id LIKE 'apr-%'");
  await query("DELETE FROM users WHERE id LIKE 'apr-%'");
  platformConfig.invalidate();
}

beforeAll(async () => {
  await cleanup();
  for (const [id, phone, role] of [[ADMIN, '9855100001', 'admin'], [SUPER, '9855100002', 'super_admin'], [USER, '9855100003', 'user']]) {
    await query('INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, $1, $2, $3)', [id, phone, role]);
  }
  await query(
    `INSERT INTO local_shops (id, owner_id, name, category, address, coordinate, latitude, longitude, delivery_available)
     VALUES ($1, $2, 'APR Shop', 'Grocery', 'Road', 'POINT(73.87 18.53)', 18.53, 73.87, 1)`,
    [SHOP, USER]
  );
  await query("INSERT INTO shop_products (id, shop_id, name, price, track_inventory) VALUES ('apr-rice', $1, 'Rice', 100, 0)", [SHOP]);

  app = express();
  app.use(express.json());
  app.use('/admin', require('../../modules/crm/routes/admin-pricing.routes'));
  app.use('/checkout', require('../../modules/ecommerce/routes/checkout.routes'));
  app.use('/saas', require('../../modules/crm/routes/saas.routes'));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => res.status(500).json({ error: err.message }));
});

afterAll(cleanup);

describe('pricing settings', () => {
  test('an administrator sees every setting with its limits; a customer sees nothing', async () => {
    const res = await request(app).get('/admin/pricing').set(as(ADMIN));
    expect(res.status).toBe(200);
    const fee = res.body.settings.find((s) => s.key === 'delivery_per_km_fee');
    expect(fee).toMatchObject({ value: 8, default: 8, type: 'number', min: 0, max: 100, group: 'delivery' });
    expect(res.body.settings.find((s) => s.key === 'default_commission_percent').value).toBe(5);

    expect((await request(app).get('/admin/pricing').set(as(USER))).status).toBe(403);
    expect((await request(app).get('/admin/pricing')).status).toBe(401);
  });

  test('only a super admin changes prices, and a change is all-or-nothing', async () => {
    expect((await request(app).put('/admin/pricing').set(as(ADMIN)).send({ settings: { platform_fee: 9 } })).status).toBe(403);

    const bad = await request(app).put('/admin/pricing').set(as(SUPER)).send({ settings: { platform_fee: 9, delivery_per_km_fee: -4, nonsense: 1 } });
    expect(bad.status).toBe(400);
    expect(Object.keys(bad.body.errors).sort()).toEqual(['delivery_per_km_fee', 'nonsense']);
    expect(await platformConfig.get('platform_fee')).toBe(5);
  });

  test('a saved change prices the next order', async () => {
    const quote = () => request(app).post('/checkout/quote').send({ shopId: SHOP, items: [{ productId: 'apr-rice', quantity: 1 }], deliveryCoordinate: { lat: 18.535, lng: 73.875 } });
    const first = await quote();
    expect(first.status).toBe(200);
    expect(first.body.bill).toMatchObject({ deliveryFee: 20, platformFee: 5, total: 125 });

    const saved = await request(app).put('/admin/pricing').set(as(SUPER)).send({ settings: { delivery_base_fee: 25, platform_fee: 3 } });
    expect(saved.status).toBe(200);
    expect(saved.body.updated).toEqual({ delivery_base_fee: 25, platform_fee: 3 });
    expect((await queryOne("SELECT updated_by FROM admin_config WHERE config_key = 'platform_fee'")).updated_by).toBe(SUPER);

    expect((await quote()).body.bill).toMatchObject({ deliveryFee: 25, platformFee: 3, total: 128 });

    await query("DELETE FROM admin_config WHERE config_key IN ('delivery_base_fee', 'platform_fee')");
    platformConfig.invalidate();
  });

  test('a change can be previewed before it is saved', async () => {
    const res = await request(app).post('/admin/pricing/preview').set(as(ADMIN))
      .send({ distanceKm: 5, subtotal: 300, settings: { delivery_per_km_fee: 10 } });
    expect(res.status).toBe(200);
    expect(res.body.preview).toMatchObject({ deliveryFee: 50, riderPayout: 41, platformFee: 5, customerPays: 355, withinRange: true });
    expect(await platformConfig.get('delivery_per_km_fee')).toBe(8);

    expect((await request(app).post('/admin/pricing/preview').set(as(ADMIN)).send({ distanceKm: -1 })).status).toBe(400);
  });
});

describe('merchant plans', () => {
  let planId;

  test('a super admin creates a plan; an administrator cannot', async () => {
    const body = { name: 'APR Growth', priceMonthly: 999, features: ['Unlimited products', 'Priority listing'] };
    expect((await request(app).post('/admin/plans').set(as(ADMIN)).send(body)).status).toBe(403);

    const res = await request(app).post('/admin/plans').set(as(SUPER)).send(body);
    expect(res.status).toBe(201);
    expect(res.body.plan).toMatchObject({ name: 'APR Growth', priceMonthly: 999, isActive: true, activeSubscribers: 0 });
    planId = res.body.plan.id;

    expect((await request(app).post('/admin/plans').set(as(SUPER)).send(body)).status).toBe(409);
    expect((await request(app).post('/admin/plans').set(as(SUPER)).send({ name: 'APR Bad', priceMonthly: -5 })).status).toBe(400);
  });

  test('changing the price changes what the plan sells for', async () => {
    const res = await request(app).put(`/admin/plans/${planId}`).set(as(SUPER)).send({ priceMonthly: 1299 });
    expect(res.status).toBe(200);
    expect(res.body.plan.priceMonthly).toBe(1299);

    const onSale = await request(app).get('/saas/plans');
    expect(onSale.body.plans.find((p) => p.id === planId).price_monthly).toBe(1299);
  });

  test('a withdrawn plan is no longer on sale, but stays in the admin list', async () => {
    expect((await request(app).put(`/admin/plans/${planId}`).set(as(SUPER)).send({ isActive: false })).status).toBe(200);
    expect((await request(app).get('/saas/plans')).body.plans.find((p) => p.id === planId)).toBeUndefined();

    const all = await request(app).get('/admin/plans').set(as(ADMIN));
    expect(all.body.plans.find((p) => p.id === planId)).toMatchObject({ isActive: false, priceMonthly: 1299 });
  });

  test('updates are validated and need something to change', async () => {
    expect((await request(app).put(`/admin/plans/${planId}`).set(as(SUPER)).send({})).status).toBe(400);
    expect((await request(app).put(`/admin/plans/${planId}`).set(as(SUPER)).send({ features: 'free stuff' })).status).toBe(400);
    expect((await request(app).put('/admin/plans/no-such-plan').set(as(SUPER)).send({ priceMonthly: 1 })).status).toBe(404);
    expect((await request(app).put(`/admin/plans/${planId}`).set(as(ADMIN)).send({ priceMonthly: 1 })).status).toBe(403);
  });
});
