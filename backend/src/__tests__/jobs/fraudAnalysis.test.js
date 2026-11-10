/**
 * The daily fraud analysis runs on the real tables, raises each signal once,
 * and uses no SQL that only SQLite understands.
 */


const { fx, fxLike } = require('../helpers/fixtureIds');
const fs = require('fs');
const path = require('path');
const { query, queryMany } = require('../../config/database');
const { runFraudAnalysis } = require('../../jobs/fraud-analysis.job');

async function cleanup() {
  await query(`DELETE FROM fraud_signals WHERE CAST(entity_id AS TEXT) LIKE '${fxLike('frd')}'`);
  await query(`DELETE FROM shop_reviews WHERE CAST(user_id AS TEXT) LIKE '${fxLike('frd')}'`);
  await query(`DELETE FROM device_fingerprints WHERE CAST(user_id AS TEXT) LIKE '${fxLike('frd')}'`);
  await query(`DELETE FROM shop_products WHERE CAST(id AS TEXT) LIKE '${fxLike('frd')}'`);
  await query(`DELETE FROM local_shops WHERE CAST(id AS TEXT) LIKE '${fxLike('frd')}'`);
  await query(`DELETE FROM users WHERE CAST(id AS TEXT) LIKE '${fxLike('frd')}'`);
}

beforeAll(async () => {
  await cleanup();
  for (const [id, phone] of [[fx('frd-owner'), '9888100001'], [fx('frd-a'), '9888100002'], [fx('frd-b'), '9888100003'], [fx('frd-bomber'), '9888100004']]) {
    await query("INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, $3, $2, 'user')", [id, phone, id]);
  }
  await query(
    `INSERT INTO local_shops (id, owner_id, name, category, address, coordinate, latitude, longitude, is_active, created_at)
     VALUES ('${fx('frd-empty')}', '${fx('frd-owner')}', 'Empty', 'Grocery', 'Road', 'POINT(73.87 18.53)', 18.53, 73.87, '1', '2026-01-01 00:00:00')`
  );
  for (const user of [fx('frd-a'), fx('frd-b')]) {
    await query(`INSERT INTO device_fingerprints (id, user_id, device_id) VALUES ($1, $2, '${fx('frd-device-1')}')`, [fx(`frd-fp-${user}`), user]);
  }
  // One review per shop per account, so five reviews in a day means five shops.
  for (let i = 0; i < 5; i += 1) {
    await query(
      `INSERT INTO local_shops (id, owner_id, name, category, address, coordinate, latitude, longitude, is_active)
       VALUES ($1, '${fx('frd-owner')}', 'Reviewed', 'Grocery', 'Road', 'POINT(73.87 18.53)', 18.53, 73.87, '1')`,
      [fx(`frd-shop-${i}`)]
    );
    await query("INSERT INTO shop_products (id, shop_id, name, price) VALUES ($1, $2, 'Item', 10)", [fx(`frd-product-${i}`), fx(`frd-shop-${i}`)]);
    await query(`INSERT INTO shop_reviews (id, shop_id, user_id, rating) VALUES ($1, $2, '${fx('frd-bomber')}', 5)`, [fx(`frd-review-${i}`), fx(`frd-shop-${i}`)]);
  }
});

afterAll(cleanup);

const signals = () => queryMany(
  `SELECT entity_id, signal_type FROM fraud_signals WHERE CAST(entity_id AS TEXT) LIKE '${fxLike('frd')}' ORDER BY signal_type, entity_id`
);

test('raises empty-shop, shared-device and review-bombing signals', async () => {
  await runFraudAnalysis();
  // Expected rows in the query's own order (signal_type, then entity_id).
  const bySignalThenId = (a, b) => a.signal_type.localeCompare(b.signal_type) || (a.entity_id < b.entity_id ? -1 : a.entity_id > b.entity_id ? 1 : 0);
  expect(await signals()).toEqual([
    { entity_id: fx('frd-empty'), signal_type: 'empty_shop_48h' },
    { entity_id: fx('frd-a'), signal_type: 'multi_account_device' },
    { entity_id: fx('frd-b'), signal_type: 'multi_account_device' },
    { entity_id: fx('frd-bomber'), signal_type: 'review_bombing' },
  ].sort(bySignalThenId));
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
