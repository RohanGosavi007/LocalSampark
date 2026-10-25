/**
 * Scheduled campaigns start and end by themselves.
 *
 * Nothing moved a shop campaign out of 'scheduled': a flash sale never began
 * unless the merchant activated it, and one that was activated never ended. The
 * job meant to do it was never started. These pin the transitions, in both of
 * the timestamp spellings a row can hold (a space or a 'T' before the time).
 */

process.env.USE_SQLITE = 'true';

const { query, queryOne } = require('../../config/database');
const { runCampaignSchedule } = require('../../jobs/campaign-schedule.job');

const SHOP = 'cs-shop';
const NOW = '2026-06-15 12:00:00';
const status = async (id) => (await queryOne('SELECT status FROM shop_campaigns WHERE id = $1', [id])).status;

async function campaign(id, state, start, end) {
  await query(
    `INSERT INTO shop_campaigns (id, shop_id, title, start_datetime, end_datetime, status) VALUES ($1, $2, 'T', $3, $4, $5)`,
    [id, SHOP, start, end, state]
  );
}

async function cleanup() {
  await query("DELETE FROM shop_campaigns WHERE id LIKE 'cs-%'");
  await query("DELETE FROM local_shops WHERE id LIKE 'cs-%'");
  await query("DELETE FROM users WHERE id LIKE 'cs-%'");
}

beforeAll(async () => {
  await cleanup();
  await query("INSERT INTO users (id, full_name, phone_number, role) VALUES ('cs-owner', 'Owner', '9862000001', 'shop_owner')");
  await query(
    `INSERT INTO local_shops (id, owner_id, name, category, address, coordinate, latitude, longitude, is_active)
     VALUES ($1, 'cs-owner', 'CS Shop', 'Grocery', 'Road', 'POINT(73.8 18.5)', 18.5, 73.8, 1)`,
    [SHOP]
  );
});
afterAll(cleanup);
beforeEach(() => query("DELETE FROM shop_campaigns WHERE id LIKE 'cs-%'"));

test('a scheduled campaign whose window has opened becomes active', async () => {
  await campaign('cs-due', 'scheduled', '2026-06-15 11:00:00', '2026-06-15 18:00:00');
  await campaign('cs-iso', 'scheduled', '2026-06-15T09:00:00', '2026-06-15T20:00:00'); // ISO spelling
  await campaign('cs-later', 'scheduled', '2026-06-15 13:00:00', '2026-06-15 18:00:00');

  const result = await runCampaignSchedule(NOW);
  expect(result.started).toBe(2);
  expect(await status('cs-due')).toBe('active');
  expect(await status('cs-iso')).toBe('active');
  expect(await status('cs-later')).toBe('scheduled'); // not yet
});

test('an active campaign past its end is completed', async () => {
  await campaign('cs-over', 'active', '2026-06-15 08:00:00', '2026-06-15 11:59:59');
  await campaign('cs-iso-over', 'active', '2026-06-15T08:00:00', '2026-06-15T10:00:00');
  await campaign('cs-running', 'active', '2026-06-15 08:00:00', '2026-06-15 12:00:01');

  await runCampaignSchedule(NOW);
  expect(await status('cs-over')).toBe('completed');
  expect(await status('cs-iso-over')).toBe('completed');
  expect(await status('cs-running')).toBe('active');
});

test('a scheduled campaign whose whole window has passed is never activated', async () => {
  await campaign('cs-missed', 'scheduled', '2026-06-14 08:00:00', '2026-06-14 10:00:00');
  const result = await runCampaignSchedule(NOW);
  expect(await status('cs-missed')).toBe('completed');
  expect(result.started).toBe(0);
});

test('drafts and open-ended campaigns are left alone', async () => {
  await campaign('cs-draft', 'draft', '2026-06-01 00:00:00', '2026-06-02 00:00:00');
  await campaign('cs-noend', 'active', '2026-06-01 00:00:00', null);
  await campaign('cs-nostart', 'scheduled', null, '2026-06-30 00:00:00');
  await runCampaignSchedule(NOW);
  expect(await status('cs-draft')).toBe('draft');
  expect(await status('cs-noend')).toBe('active');
  expect(await status('cs-nostart')).toBe('scheduled');
});

test('running it again changes nothing', async () => {
  await campaign('cs-once', 'scheduled', '2026-06-15 11:00:00', '2026-06-15 18:00:00');
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
  const auth = { Authorization: `Bearer ${jwt.sign({ userId: 'cs-owner', tokenVersion: 0 }, getJwtSecret(), { expiresIn: '5m' })}` };
  const post = (body) => request(app).post(`/campaigns/${SHOP}`).set(auth).send({ title: 'Flash', ...body });

  test('an offset is converted to UTC', async () => {
    const res = await post({ start_datetime: '2026-06-15T10:00:00+05:30', end_datetime: '2026-06-15T12:00:00+05:30' });
    expect(res.status).toBeLessThan(300);
    const row = await queryOne("SELECT start_datetime, end_datetime FROM shop_campaigns WHERE shop_id = $1 AND title = 'Flash' ORDER BY created_at DESC LIMIT 1", [SHOP]);
    expect(row).toEqual({ start_datetime: '2026-06-15 04:30:00', end_datetime: '2026-06-15 06:30:00' });
  });

  test.each([
    ['an unparseable date', { start_datetime: 'next tuesday' }],
    ['an end before the start', { start_datetime: '2026-06-15T10:00:00Z', end_datetime: '2026-06-15T09:00:00Z' }],
  ])('rejects %s', async (_l, body) => {
    expect((await post(body)).status).toBe(400);
  });
});
