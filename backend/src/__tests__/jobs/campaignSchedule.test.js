/**
 * Scheduled campaigns start and end by themselves.
 *
 * Nothing moved a shop campaign out of 'scheduled': a flash sale never began
 * unless the merchant activated it, and one that was activated never ended. The
 * job meant to do it was never started. These pin the transitions, in both of
 * the timestamp spellings a row can hold (a space or a 'T' before the time).
 */


const { fx, fxLike } = require('../helpers/fixtureIds');
const { query, queryOne } = require('../../config/database');
const { runCampaignSchedule } = require('../../jobs/campaign-schedule.job');

const SHOP = fx('cs-shop');
const NOW = '2026-06-15 12:00:00';
const status = async (id) => (await queryOne('SELECT status FROM shop_campaigns WHERE id = $1', [id])).status;

async function campaign(id, state, start, end) {
  await query(
    `INSERT INTO shop_campaigns (id, shop_id, title, start_datetime, end_datetime, status) VALUES ($1, $2, 'T', $3, $4, $5)`,
    [id, SHOP, start, end, state]
  );
}

async function cleanup() {
  await query(`DELETE FROM shop_campaigns WHERE CAST(id AS TEXT) LIKE '${fxLike('cs')}'`);
  await query(`DELETE FROM local_shops WHERE CAST(id AS TEXT) LIKE '${fxLike('cs')}'`);
  await query(`DELETE FROM users WHERE CAST(id AS TEXT) LIKE '${fxLike('cs')}'`);
}

beforeAll(async () => {
  await cleanup();
  await query(`INSERT INTO users (id, full_name, phone_number, role) VALUES ('${fx('cs-owner')}', 'Owner', '9862000001', 'shop_owner')`);
  await query(
    `INSERT INTO local_shops (id, owner_id, name, category, address, coordinate, latitude, longitude, is_active)
     VALUES ($1, '${fx('cs-owner')}', 'CS Shop', 'Grocery', 'Road', 'POINT(73.8 18.5)', 18.5, 73.8, '1')`,
    [SHOP]
  );
});
afterAll(cleanup);
beforeEach(() => query(`DELETE FROM shop_campaigns WHERE CAST(id AS TEXT) LIKE '${fxLike('cs')}'`));

test('a scheduled campaign whose window has opened becomes active', async () => {
  await campaign(fx('cs-due'), 'scheduled', '2026-06-15 11:00:00', '2026-06-15 18:00:00');
  await campaign(fx('cs-iso'), 'scheduled', '2026-06-15T09:00:00', '2026-06-15T20:00:00'); // ISO spelling
  await campaign(fx('cs-later'), 'scheduled', '2026-06-15 13:00:00', '2026-06-15 18:00:00');

  const result = await runCampaignSchedule(NOW);
  expect(result.started).toBe(2);
  expect(await status(fx('cs-due'))).toBe('active');
  expect(await status(fx('cs-iso'))).toBe('active');
  expect(await status(fx('cs-later'))).toBe('scheduled'); // not yet
});

test('an active campaign past its end is completed', async () => {
  await campaign(fx('cs-over'), 'active', '2026-06-15 08:00:00', '2026-06-15 11:59:59');
  await campaign(fx('cs-iso-over'), 'active', '2026-06-15T08:00:00', '2026-06-15T10:00:00');
  await campaign(fx('cs-running'), 'active', '2026-06-15 08:00:00', '2026-06-15 12:00:01');

  await runCampaignSchedule(NOW);
  expect(await status(fx('cs-over'))).toBe('completed');
  expect(await status(fx('cs-iso-over'))).toBe('completed');
  expect(await status(fx('cs-running'))).toBe('active');
});

test('a scheduled campaign whose whole window has passed is never activated', async () => {
  await campaign(fx('cs-missed'), 'scheduled', '2026-06-14 08:00:00', '2026-06-14 10:00:00');
  const result = await runCampaignSchedule(NOW);
  expect(await status(fx('cs-missed'))).toBe('completed');
  expect(result.started).toBe(0);
});

test('drafts and open-ended campaigns are left alone', async () => {
  await campaign(fx('cs-draft'), 'draft', '2026-06-01 00:00:00', '2026-06-02 00:00:00');
  await campaign(fx('cs-noend'), 'active', '2026-06-01 00:00:00', null);
  await campaign(fx('cs-nostart'), 'scheduled', null, '2026-06-30 00:00:00');
  await runCampaignSchedule(NOW);
  expect(await status(fx('cs-draft'))).toBe('draft');
  expect(await status(fx('cs-noend'))).toBe('active');
  expect(await status(fx('cs-nostart'))).toBe('scheduled');
});

test('running it again changes nothing', async () => {
  await campaign(fx('cs-once'), 'scheduled', '2026-06-15 11:00:00', '2026-06-15 18:00:00');
  await runCampaignSchedule(NOW);
  const again = await runCampaignSchedule(NOW);
  expect(again).toEqual({ ended: 0, started: 0 });
});

describe('creating a campaign stores UTC and rejects bad windows', () => {
  const express = require('express');
  const request = require('supertest');
  const jwt = require('jsonwebtoken');
  const { getJwtSecret } = require('../../config/secrets');
  const app = express();
  app.use(express.json());
  app.use('/campaigns', require('../../modules/crm/routes/campaigns.routes'));
  const auth = { Authorization: `Bearer ${jwt.sign({ userId: fx('cs-owner'), tokenVersion: 0 }, getJwtSecret(), { expiresIn: '5m' })}` };
  const post = (body) => request(app).post(`/campaigns/${SHOP}`).set(auth).send({ title: 'Flash', ...body });

  test('an offset is converted to UTC', async () => {
    const res = await post({ start_datetime: '2026-06-15T10:00:00+05:30', end_datetime: '2026-06-15T12:00:00+05:30' });
    expect(res.status).toBeLessThan(300);
    const row = await queryOne("SELECT start_datetime, end_datetime FROM shop_campaigns WHERE shop_id = $1 AND title = 'Flash' ORDER BY created_at DESC LIMIT 1", [SHOP]);
    // Compared as instants: SQLite returns the stored UTC text, PostgreSQL an
    // ISO timestamp; both must be 04:30 and 06:30 UTC.
    const instant = (v) => new Date(String(v).includes('T') ? v : `${String(v).replace(' ', 'T')}Z`).toISOString();
    expect({ start: instant(row.start_datetime), end: instant(row.end_datetime) })
      .toEqual({ start: '2026-06-15T04:30:00.000Z', end: '2026-06-15T06:30:00.000Z' });
  });

  test.each([
    ['an unparseable date', { start_datetime: 'next tuesday' }],
    ['an end before the start', { start_datetime: '2026-06-15T10:00:00Z', end_datetime: '2026-06-15T09:00:00Z' }],
  ])('rejects %s', async (_l, body) => {
    expect((await post(body)).status).toBe(400);
  });
});
