/**
 * What SamparkPlus actually gives: free delivery from a lower item total.
 *
 * The membership was advertised ("free delivery on orders ₹500+") and sold for
 * nothing — no server code read the tier. This is the benefit that now exists,
 * and the check that it is only for members whose paid period is running.
 */

process.env.USE_SQLITE = 'true';

const crypto = require('crypto');
const { query } = require('../../config/database');
const platformConfig = require('../../services/platformConfig.service');
const { deliveryCharges } = require('../../services/deliveryPricing.service');
const { isMember } = require('../../services/membership.service');

let config;
beforeAll(async () => { config = await platformConfig.all(); });

describe('deliveryCharges', () => {
  const charge = (subtotal, opts) => deliveryCharges(4, subtotal, config, new Date('2026-06-15T05:00:00Z'), opts);

  test('the threshold and price are platform settings with sensible defaults', () => {
    expect(config.samparkplus_free_delivery_above).toBe(500);
    expect(config.samparkplus_price_monthly).toBe(99);
  });

  test('a member pays no delivery from the threshold up', () => {
    const r = charge(500, { member: true });
    expect(r.deliveryFee).toBe(0);
    expect(r.freeDelivery).toBe(true);
    expect(r.freeBecauseMember).toBe(true);
  });

  test('a member below the threshold is charged like anyone else', () => {
    const r = charge(499, { member: true });
    expect(r.deliveryFee).toBeGreaterThan(0);
    expect(r.freeBecauseMember).toBe(false);
  });

  test('a non-member at the same total is charged', () => {
    expect(charge(800, { member: false }).deliveryFee).toBeGreaterThan(0);
    expect(charge(800).deliveryFee).toBeGreaterThan(0);
  });

  test('setting the threshold to 0 switches the benefit off', () => {
    const off = { ...config, samparkplus_free_delivery_above: 0 };
    expect(deliveryCharges(4, 5000, off, new Date(), { member: true }).deliveryFee).toBeGreaterThan(0);
  });

  test('delivery that is free for everyone is not credited to the membership', () => {
    const all = { ...config, delivery_free_above: 300 };
    const r = deliveryCharges(4, 600, all, new Date(), { member: true });
    expect(r.deliveryFee).toBe(0);
    expect(r.freeBecauseMember).toBe(false);
  });

  test('the rider is paid the same however the customer\'s charge was waived', () => {
    expect(charge(600, { member: true }).riderPayout).toBe(charge(600, { member: false }).riderPayout);
  });
});

describe('isMember', () => {
  const U = 'mb-user';
  const add = (fields) => query(
    `INSERT INTO user_subscriptions (id, user_id, tier, status, tier_expires_at) VALUES ($1, $2, $3, $4, $5)`,
    [crypto.randomUUID(), U, 'tier' in fields ? fields.tier : 'SamparkPlus', fields.status ?? 'active', fields.expires]
  );
  beforeAll(async () => {
    await query("DELETE FROM user_subscriptions WHERE user_id = $1", [U]);
    await query("DELETE FROM users WHERE id = $1", [U]);
    await query("INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, 'M', '9866000009', 'user')", [U]);
  });
  beforeEach(() => query("DELETE FROM user_subscriptions WHERE user_id = $1", [U]));
  afterAll(async () => {
    await query("DELETE FROM user_subscriptions WHERE user_id = $1", [U]);
    await query("DELETE FROM users WHERE id = $1", [U]);
  });

  test('a running paid period is a membership', async () => {
    await add({ expires: '2999-01-01 00:00:00' });
    expect(await isMember(U)).toBe(true);
  });

  test.each([
    ['an ended period', { expires: '2000-01-01 00:00:00' }],
    ['a period marked expired', { expires: '2999-01-01 00:00:00', status: 'expired' }],
    ['a free row with no end date (the old endpoint)', { expires: null }],
    ['a delivery plan with no tier', { tier: null, expires: '2999-01-01 00:00:00' }],
  ])('%s is not', async (_label, fields) => {
    await add(fields);
    expect(await isMember(U)).toBe(false);
  });

  test('no user, no membership', async () => {
    expect(await isMember(null)).toBe(false);
    expect(await isMember('nobody')).toBe(false);
  });
});
