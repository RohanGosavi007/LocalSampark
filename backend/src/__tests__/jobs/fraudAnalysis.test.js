/**
 * The daily fraud analysis runs on the real tables, raises each signal once,
 * and uses no SQL that only SQLite understands.
 */

process.env.USE_SQLITE = 'true';

const fs = require('fs');
const path = require('path');
const { query, queryMany } = require('../../config/database');
const { runFraudAnalysis } = require('../../jobs/fraud-analysis.job');

async function cleanup() {
  await query("DELETE FROM fraud_signals WHERE entity_id LIKE 'frd-%'");
  await query("DELETE FROM shop_reviews WHERE user_id LIKE 'frd-%'");
  await query("DELETE FROM device_fingerprints WHERE user_id LIKE 'frd-%'");
  await query("DELETE FROM shop_products WHERE id LIKE 'frd-%'");
  await query("DELETE FROM local_shops WHERE id LIKE 'frd-%'");
  await query("DELETE FROM users WHERE id LIKE 'frd-%'");
}

beforeAll(async () => {
  await cleanup();
  for (const [id, phone] of [['frd-owner', '9888100001'], ['frd-a', '9888100002'], ['frd-b', '9888100003'], ['frd-bomber', '9888100004']]) {
    await query("INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, $1, $2, 'user')", [id, phone]);
  }
  await query(
    `INSERT INTO local_shops (id, owner_id, name, category, address, coordinate, latitude, longitude, is_active, created_at)
     VALUES ('frd-empty', 'frd-owner', 'Empty', 'Grocery', 'Road', 'POINT(73.87 18.53)', 18.53, 73.87, 1, '2026-01-01 00:00:00')`
  );
  for (const user of ['frd-a', 'frd-b']) {
    await query("INSERT INTO device_fingerprints (id, user_id, device_id) VALUES ($1, $2, 'frd-device-1')", [`frd-fp-${user}`, user]);
  }
  // One review per shop per account, so five reviews in a day means five shops.
  for (let i = 0; i < 5; i += 1) {
    await query(
      `INSERT INTO local_shops (id, owner_id, name, category, address, coordinate, latitude, longitude, is_active)
       VALUES ($1, 'frd-owner', 'Reviewed', 'Grocery', 'Road', 'POINT(73.87 18.53)', 18.53, 73.87, 1)`,
      [`frd-shop-${i}`]
    );
    await query("INSERT INTO shop_products (id, shop_id, name, price) VALUES ($1, $2, 'Item', 10)", [`frd-product-${i}`, `frd-shop-${i}`]);
    await query("INSERT INTO shop_reviews (id, shop_id, user_id, rating) VALUES ($1, $2, 'frd-bomber', 5)", [`frd-review-${i}`, `frd-shop-${i}`]);
  }
});

afterAll(cleanup);

const signals = () => queryMany(
  "SELECT entity_id, signal_type FROM fraud_signals WHERE entity_id LIKE 'frd-%' ORDER BY signal_type, entity_id"
);

test('raises empty-shop, shared-device and review-bombing signals', async () => {
  await runFraudAnalysis();
  expect(await signals()).toEqual([
    { entity_id: 'frd-empty', signal_type: 'empty_shop_48h' },
    { entity_id: 'frd-a', signal_type: 'multi_account_device' },
    { entity_id: 'frd-b', signal_type: 'multi_account_device' },
    { entity_id: 'frd-bomber', signal_type: 'review_bombing' },
  ]);
});

test('running it again raises nothing twice', async () => {
  await runFraudAnalysis();
  expect(await signals()).toHaveLength(4);
});

test('uses no SQLite-only SQL', () => {
  const source = fs.readFileSync(path.join(__dirname, '../../jobs/fraud-analysis.job.js'), 'utf8');
  const sql = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  expect(sql).not.toMatch(/datetime\(|GROUP_CONCAT|INSERT OR REPLACE/i);
});
