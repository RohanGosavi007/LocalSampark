/**
 * The default seed (`npm run seed`).
 *
 * It did not run at all on SQLite — the script it executed was written in
 * PostgreSQL's dialect and failed at its second statement — and on PostgreSQL
 * it added duplicate societies, shops, products and loyalty tiers on every
 * run. Both are the kind of failure that goes unnoticed until someone needs a
 * clean environment in a hurry, so the properties that matter are pinned here:
 * it completes, it creates one account for each core role, and running it
 * again changes nothing.
 */

process.env.USE_SQLITE = 'true';

const { query, queryOne, queryMany } = require('../config/database');
const { runSeed, USERS, SHOP, REGION } = require('../seeds/run');

const phones = USERS.map((u) => u.phone);
const phoneList = phones.map((_p, i) => `$${i + 1}`).join(', ');

async function removeSeeded() {
  const users = await queryMany(`SELECT id FROM users WHERE phone_number IN (${phoneList})`, phones);
  for (const { id } of users) {
    const shops = await queryMany('SELECT id FROM local_shops WHERE owner_id = $1', [id]);
    for (const shop of shops) {
      await query('DELETE FROM shop_products WHERE shop_id = $1', [shop.id]);
      await query('DELETE FROM local_shops WHERE id = $1', [shop.id]);
    }
    await query('DELETE FROM admin_roles WHERE user_id = $1', [id]);
    await query('DELETE FROM wallets WHERE user_id = $1', [id]);
    await query('DELETE FROM users WHERE id = $1', [id]);
  }
  const region = await queryOne('SELECT id FROM regions WHERE name = $1', [REGION.name]);
  if (region) {
    await query('DELETE FROM societies WHERE region_id = $1', [region.id]);
    await query('DELETE FROM regions WHERE id = $1', [region.id]);
  }
  await query("DELETE FROM loyalty_tiers WHERE name IN ('Naya Padosi', 'Active Padosi', 'Super Padosi', 'Sampark Champion')");
  await query("DELETE FROM admin_config WHERE config_key IN ('feed_radius_km', 'delivery_base_fee', 'delivery_per_km_fee', 'points_per_post')");
}

let first;
let second;

beforeAll(async () => {
  await removeSeeded();
  first = await runSeed({ demo: true });
  second = await runSeed({ demo: true });
});

// The catalogue fixtures other suites rely on must be left as they were found.
afterAll(removeSeeded);

test('the first run creates the dataset', () => {
  expect(first.created).toBeGreaterThan(20);
});

test('a second run creates nothing', () => {
  expect(second.createdRows).toEqual([]);
  expect(second.created).toBe(0);
  expect(second.existing).toBe(first.created + first.existing);
});

test('there is exactly one account for each core role, each in the pilot region', async () => {
  const region = await queryOne('SELECT id FROM regions WHERE name = $1', [REGION.name]);
  expect(region.id).toBeTruthy();

  const rows = await queryMany(
    `SELECT phone_number, role, region_id, is_verified, is_active FROM users WHERE phone_number IN (${phoneList})`,
    phones
  );
  expect(rows).toHaveLength(USERS.length);
  expect(rows.map((r) => r.role).sort()).toEqual(['admin', 'delivery_agent', 'shop_owner', 'super_admin', 'user']);
  for (const row of rows) {
    expect(row.region_id).toBe(region.id);
    expect(Number(row.is_verified)).toBe(1);
    expect(Number(row.is_active)).toBe(1);
  }
});

test('both administrators hold an admin role, and nobody is given a PIN', async () => {
  const roles = await queryMany(
    `SELECT ar.role FROM admin_roles ar JOIN users u ON u.id = ar.user_id WHERE u.phone_number IN (${phoneList})`,
    phones
  );
  expect(roles.map((r) => r.role).sort()).toEqual(['super_admin', 'territory_admin']);

  // A seeded PIN would be a published credential. Provisioning sets one.
  const pins = await queryMany(
    `SELECT ap.id FROM admin_pins ap JOIN users u ON u.id = ap.user_id WHERE u.phone_number IN (${phoneList})`,
    phones
  );
  expect(pins).toEqual([]);
});

test('the vendor has one approved, located shop with its products', async () => {
  const shops = await queryMany('SELECT * FROM local_shops WHERE name = $1', [SHOP.name]);
  expect(shops).toHaveLength(1);

  const [shop] = shops;
  expect(shop.approval_status).toBe('approved');
  expect(shop.coordinate).toBe(`POINT(${SHOP.longitude} ${SHOP.latitude})`);
  expect(Number(shop.latitude)).toBeCloseTo(SHOP.latitude);
  expect(shop.category).toBe(SHOP.category);

  const products = await queryMany('SELECT name FROM shop_products WHERE shop_id = $1', [shop.id]);
  expect(products).toHaveLength(3);
});

test('reference rows are not duplicated', async () => {
  const tiers = await queryMany("SELECT name FROM loyalty_tiers WHERE name IN ('Naya Padosi', 'Active Padosi', 'Super Padosi', 'Sampark Champion')");
  expect(tiers).toHaveLength(4);

  const region = await queryOne('SELECT id FROM regions WHERE name = $1', [REGION.name]);
  const societies = await queryMany('SELECT name FROM societies WHERE region_id = $1', [region.id]);
  expect(societies).toHaveLength(3);
});

test('without the demo layer only reference data is written', async () => {
  await removeSeeded();
  const out = await runSeed({ demo: false });

  expect(out.demo).toBe(false);
  const users = await queryMany(`SELECT id FROM users WHERE phone_number IN (${phoneList})`, phones);
  expect(users).toEqual([]);
  const region = await queryOne('SELECT id FROM regions WHERE name = $1', [REGION.name]);
  expect(region.id).toBeTruthy();
});
