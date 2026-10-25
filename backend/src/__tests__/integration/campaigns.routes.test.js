/**
 * Ad and shop campaigns.
 *
 * Four things were wrong at once, and each one hid the others:
 *
 *   - POST /purchase was registered after POST /:shopId, so it was never
 *     reached: "purchase" matched as a shop id and the request died in the
 *     wrong handler;
 *   - had it been reached, its INSERT left out three NOT NULL columns;
 *   - had that worked, it charged nothing — any signed-in account got an
 *     active campaign, for any shop, for free;
 *   - and the public click endpoint added ₹5 to `spent` every time it was
 *     called, without limit.
 */

process.env.USE_SQLITE = 'true';

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { query, queryOne } = require('../../config/database');
const { getJwtSecret } = require('../../config/secrets');

const OWNER = 'camp-owner';
const STRANGER = 'camp-stranger';
const ADMIN = 'camp-admin';
const SHOP = 'camp-shop';

let app;
const token = (userId) => jwt.sign({ userId }, getJwtSecret(), { expiresIn: '5m' });
const as = (userId) => ({ Authorization: `Bearer ${token(userId)}` });

async function cleanup() {
  await query('DELETE FROM ad_campaigns WHERE shop_id = $1', [SHOP]);
  await query('DELETE FROM shop_campaigns WHERE shop_id = $1', [SHOP]);
  await query("DELETE FROM wallet_transactions WHERE wallet_id LIKE 'camp-%'");
  await query("DELETE FROM wallets WHERE id LIKE 'camp-%'");
  await query('DELETE FROM local_shops WHERE id = $1', [SHOP]);
  await query("DELETE FROM users WHERE id LIKE 'camp-%'");
}

beforeAll(async () => {
  await cleanup();
  for (const [id, name, phone, role] of [
    [OWNER, 'Campaign Owner', '9833555001', 'shop_owner'],
    [STRANGER, 'Campaign Stranger', '9833555002', 'user'],
    [ADMIN, 'Campaign Admin', '9833555003', 'admin'],
  ]) {
    await query('INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, $2, $3, $4)', [id, name, phone, role]);
  }
  await query("INSERT INTO wallets (id, user_id, balance) VALUES ('camp-wallet-owner', $1, 1000)", [OWNER]);
  await query("INSERT INTO wallets (id, user_id, balance) VALUES ('camp-wallet-stranger', $1, 1000)", [STRANGER]);
  await query(
    `INSERT INTO local_shops (id, owner_id, name, category, address, coordinate, latitude, longitude)
     VALUES ($1, $2, 'Campaign Test Shop', 'Grocery', 'Test Address', 'POINT(73.87 18.53)', 18.53, 73.87)`,
    [SHOP, OWNER]
  );

  app = express();
  app.use(express.json());
  app.use('/campaigns', require('../../modules/crm/routes/campaigns.routes'));
});

afterAll(cleanup);

const balanceOf = async (userId) => Number((await queryOne('SELECT balance FROM wallets WHERE user_id = $1', [userId])).balance);

describe('POST /campaigns/purchase', () => {
  test('reaches the purchase handler, charges the owner and creates an active campaign', async () => {
    const res = await request(app).post('/campaigns/purchase').set(as(OWNER))
      .send({ shop_id: SHOP, budget_amount: 300, radius_km: 3, duration_days: 5 });

    expect(res.body.error).toBeUndefined();
    expect(res.status).toBe(201);
    expect(res.body.campaign.shop_id).toBe(SHOP);
    expect(res.body.campaign.status).toBe('active');
    expect(res.body.campaign.ad_type).toBe('promoted_listing');
    expect(Number(res.body.campaign.budget)).toBe(300);
    expect(res.body.campaign.start_date).toBeTruthy();
    expect(res.body.campaign.end_date > res.body.campaign.start_date).toBe(true);

    expect(await balanceOf(OWNER)).toBe(700);
    const ledger = await queryOne(
      "SELECT amount, type, purpose FROM wallet_transactions WHERE wallet_id = 'camp-wallet-owner'"
    );
    expect(ledger).toEqual({ amount: 300, type: 'debit', purpose: 'ad_campaign' });
  });

  test('a budget the wallet cannot cover is refused, and nothing is created or charged', async () => {
    const before = await balanceOf(OWNER);
    const res = await request(app).post('/campaigns/purchase').set(as(OWNER))
      .send({ shop_id: SHOP, budget_amount: 5000 });

    expect(res.status).toBe(402);
    expect(await balanceOf(OWNER)).toBe(before);
    const count = await queryOne('SELECT COUNT(*) AS n FROM ad_campaigns WHERE shop_id = $1', [SHOP]);
    expect(Number(count.n)).toBe(1);
  });

  test('someone who does not own the shop cannot buy a campaign for it', async () => {
    const res = await request(app).post('/campaigns/purchase').set(as(STRANGER))
      .send({ shop_id: SHOP, budget_amount: 100 });

    expect(res.status).toBe(403);
    expect(await balanceOf(STRANGER)).toBe(1000);
  });

  test('an admin can grant a placement without a wallet being charged', async () => {
    const res = await request(app).post('/campaigns/purchase').set(as(ADMIN))
      .send({ shop_id: SHOP, budget_amount: 200 });

    expect(res.status).toBe(201);
    expect(res.body.campaign.advertiser_id).toBe(ADMIN);
    expect(await balanceOf(OWNER)).toBe(700);
  });

  test('a nonsense budget and a missing shop are client errors', async () => {
    const bad = await request(app).post('/campaigns/purchase').set(as(OWNER)).send({ shop_id: SHOP, budget_amount: -5 });
    expect(bad.status).toBe(400);
    const none = await request(app).post('/campaigns/purchase').set(as(OWNER)).send({ shop_id: 'camp-no-such-shop' });
    expect(none.status).toBe(404);
  });
});

describe('POST /campaigns/:id/click', () => {
  test('stops charging at the budget and ends the campaign', async () => {
    const id = 'camp-click-test';
    await query(
      `INSERT INTO ad_campaigns (id, shop_id, ad_type, budget, spent, start_date, end_date, status)
       VALUES ($1, $2, 'promoted_listing', 12, 0, '2026-01-01', '2099-01-01', 'active')`,
      [id, SHOP]
    );

    for (let i = 0; i < 6; i += 1) {
      const res = await request(app).post(`/campaigns/${id}/click`);
      expect(res.status).toBe(200);
    }

    const row = await queryOne('SELECT spent, clicks, status FROM ad_campaigns WHERE id = $1', [id]);
    // Two ₹5 clicks fit in ₹12; the third would not.
    expect(Number(row.spent)).toBe(10);
    expect(row.status).toBe('exhausted');
    // The click that exhausted it is counted; clicks on a stopped campaign are not.
    expect(Number(row.clicks)).toBe(3);
  });
});

describe('shop campaigns', () => {
  test('only the owner can create, list and activate them', async () => {
    const body = { title: 'Diwali Sale', discount_type: 'percent', discount_value: 10, radius_km: 3 };

    const denied = await request(app).post(`/campaigns/${SHOP}`).set(as(STRANGER)).send(body);
    expect(denied.status).toBe(403);

    const created = await request(app).post(`/campaigns/${SHOP}`).set(as(OWNER)).send(body);
    expect(created.status).toBe(201);
    expect(created.body.campaign.title).toBe('Diwali Sale');
    expect(created.body.campaign.id).toBeTruthy();

    const listDenied = await request(app).get(`/campaigns/${SHOP}`).set(as(STRANGER));
    expect(listDenied.status).toBe(403);
    const list = await request(app).get(`/campaigns/${SHOP}`).set(as(OWNER));
    expect(list.body).toHaveLength(1);

    const activateDenied = await request(app).put(`/campaigns/${SHOP}/${created.body.campaign.id}/activate`).set(as(STRANGER));
    expect(activateDenied.status).toBe(403);
    const activated = await request(app).put(`/campaigns/${SHOP}/${created.body.campaign.id}/activate`).set(as(OWNER));
    expect(activated.body.campaign.status).toBe('active');
  });

  test('a campaign with no title is a client error, not a failed insert', async () => {
    const res = await request(app).post(`/campaigns/${SHOP}`).set(as(OWNER)).send({ discount_value: 5 });
    expect(res.status).toBe(400);
  });
});
