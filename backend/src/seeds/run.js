/**
 * Default seed: `npm run seed`.
 *
 * This used to execute seeds/dhanori.sql as one script. That file is written
 * for PostgreSQL — its second statement casts with `::jsonb` — so on SQLite,
 * where every developer and the test suite run, it stopped there with
 * "unrecognized token" and seeded nothing. On PostgreSQL it ran, but most of
 * its inserts ended in a bare ON CONFLICT DO NOTHING against tables with no
 * unique key to conflict on (societies, loyalty_tiers, local_shops,
 * shop_products), so every re-run added another copy of each.
 *
 * It is now plain statements through config/database, the same on both
 * engines, and each row is looked up by what identifies it before it is
 * inserted. Running it twice leaves the database as running it once does.
 *
 * Two layers:
 *
 *   reference data   the pilot region, platform settings, loyalty tiers.
 *                    Safe, and needed, everywhere.
 *   demo accounts    one user per core role, a society, and an approved shop
 *                    with products. Skipped when NODE_ENV is production: these
 *                    are fixed, published phone numbers, and a live system
 *                    should not contain a super admin anyone can name. Set
 *                    SEED_DEMO=true to seed them regardless (a staging copy).
 *
 * A production administrator is created with scripts/provision-admin.js, which
 * takes a real phone number and sets a PIN; nothing here sets one.
 */

const crypto = require('crypto');
const { connectDB, query, queryOne } = require('../config/database');

const REGION = {
  name: 'Dhanori', state: 'Maharashtra', district: 'Pune', city: 'Pune',
  pincode: '411015', country: 'India', latitude: 18.5786, longitude: 73.8967, radius_km: 5.0,
};

const SETTINGS = [
  ['feed_radius_km', '3.5', 'community', 'Maximum radius for community feed posts'],
  ['delivery_base_fee', '20.00', 'delivery', 'Base delivery charge in INR'],
  ['delivery_per_km_fee', '8.00', 'delivery', 'Per kilometer delivery charge in INR'],
  ['points_per_post', '5', 'loyalty', 'Loyalty points awarded for creating a post'],
];

const LOYALTY_TIERS = [
  ['Naya Padosi', 0, [{ perk_name: 'basic_access', perk_value: 'true' }]],
  ['Active Padosi', 100, [{ perk_name: 'priority_feed', perk_value: 'true' }]],
  ['Super Padosi', 500, [{ perk_name: 'free_delivery_count', perk_value: '2' }]],
  ['Sampark Champion', 2000, [{ perk_name: 'vip_support', perk_value: 'true' }]],
];

const SOCIETIES = [
  ['Ganga Aria', 'Dhanori Road, Dhanori, Pune'],
  ['Prasanna Goldfields', 'Laxmi Nagar, Dhanori, Pune'],
  ['Choice Goodwill Metropolis', 'Dhanori Chowk, Dhanori, Pune'],
];

// One account per core role. `adminRole` also grants an admin_roles row, which
// is what the admin console checks.
const USERS = [
  { key: 'superAdmin', phone: '+919999999991', name: 'Super Admin Dev', role: 'super_admin', adminRole: 'super_admin', balance: 1000 },
  { key: 'cityAdmin', phone: '+919999999995', name: 'Pune City Admin', role: 'admin', adminRole: 'territory_admin', balance: 0 },
  { key: 'vendor', phone: '+919999999992', name: 'Rajesh Sharma', role: 'shop_owner', balance: 500 },
  { key: 'citizen', phone: '+919999999993', name: 'Amit Patil', role: 'user', balance: 250 },
  { key: 'rider', phone: '+919999999994', name: 'Rahul Shinde', role: 'delivery_agent', balance: 100 },
];

const SHOP = {
  name: 'Sharma Grocery & Dairy',
  description: 'Fresh dairy products, grains, vegetables, and daily household needs.',
  category: 'Grocery',
  categorySlug: 'grocery-supermarkets',
  phone: '+919999999992',
  address: 'Shop 4, Ganga Aria Commercial, Dhanori, Pune',
  latitude: 18.5786,
  longitude: 73.8967,
};

const PRODUCTS = [
  ['Amul Taaza Milk 1L', 'Pasteurized toned milk', 56.0],
  ['Toor Dal 1kg', 'Premium quality unpolished toor dal', 120.0],
  ['Fresh Paneer 200g', 'Soft and fresh cottage cheese', 80.0],
];

/**
 * Returns the id of the row `find` matches, inserting it first if there is
 * none.
 *
 * Every flag in the statements below is written '1', in quotes. The same
 * column is BOOLEAN on one engine and INTEGER on the other, and sometimes
 * BOOLEAN in one table and INTEGER in the next; PostgreSQL will not put a bare
 * 1 in a BOOLEAN column or a bare true in an INTEGER one, while a quoted
 * literal takes whichever type the column has. SQLite stores it as the integer
 * 1 either way.
 */
// [id, name, monthly price in rupees, features] — from migrations/run_021.js.
const SAAS_PLANS = [
  ['plan_basic', 'Basic CRM', 0, ['pos', 'inventory']],
  ['plan_premium', 'Premium SaaS', 999, ['pos', 'inventory', 'advanced_analytics', 'staff_management', 'priority_support']],
];

async function ensure(counts, label, find, findParams, insert) {
  const existing = await queryOne(find, findParams);
  if (existing) {
    counts.existing += 1;
    return existing.id;
  }
  const id = crypto.randomUUID();
  await insert(id);
  counts.created += 1;
  counts.createdRows.push(label);
  return id;
}

async function seedReferenceData(counts) {
  // Repair what the previous version of this script left behind. On SQLite it
  // inserted the region with no id — the table's key has no default there, and
  // SQLite accepts NULL in a text primary key — and then stopped at the next
  // statement. Any database it was ever run against holds a region nothing can
  // reference, and finding that row by name would hand its null id to every
  // row seeded below.
  await query('UPDATE regions SET id = $1 WHERE name = $2 AND id IS NULL', [crypto.randomUUID(), REGION.name]);

  const regionId = await ensure(counts, `region ${REGION.name}`,
    'SELECT id FROM regions WHERE name = $1', [REGION.name],
    (id) => query(
      `INSERT INTO regions (id, name, state, district, city, pincode, country, latitude, longitude, radius_km, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, '1')`,
      [id, REGION.name, REGION.state, REGION.district, REGION.city, REGION.pincode, REGION.country,
        REGION.latitude, REGION.longitude, REGION.radius_km]
    ));

  for (const [key, value, category, description] of SETTINGS) {
    await ensure(counts, `setting ${key}`,
      'SELECT id FROM admin_config WHERE config_key = $1', [key],
      (id) => query(
        // The value is text on SQLite and JSONB on PostgreSQL; a bare number in
        // text form is valid as both.
        `INSERT INTO admin_config (id, config_key, config_value, config_category, description)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, key, value, category, description]
      ));
  }

    // The merchant plans, as migrations/run_021.js defined them. That script was
  // a one-off outside the migration chain, so a database built from the
  // migrations had no plans and nothing to subscribe to.
  for (const [id, name, priceMonthly, features] of SAAS_PLANS) {
    await ensure(counts, `plan ${name}`,
      'SELECT id FROM saas_plans WHERE id = $1', [id],
      () => query(
        "INSERT INTO saas_plans (id, name, price_monthly, features_json, is_active) VALUES ($1, $2, $3, $4, '1')",
        [id, name, priceMonthly, JSON.stringify(features)]
      ));
  }

  for (const [name, minPoints, perks] of LOYALTY_TIERS) {
    await ensure(counts, `loyalty tier ${name}`,
      'SELECT id FROM loyalty_tiers WHERE name = $1', [name],
      (id) => query(
        'INSERT INTO loyalty_tiers (id, name, min_points, perks) VALUES ($1, $2, $3, $4)',
        [id, name, minPoints, JSON.stringify(perks)]
      ));
  }

  return regionId;
}

async function seedDemoAccounts(counts, regionId) {
  for (const [name, address] of SOCIETIES) {
    await ensure(counts, `society ${name}`,
      'SELECT id FROM societies WHERE name = $1 AND region_id = $2', [name, regionId],
      (id) => query(
        'INSERT INTO societies (id, region_id, name, address) VALUES ($1, $2, $3, $4)',
        [id, regionId, name, address]
      ));
  }

  const userIds = {};
  for (const user of USERS) {
    const userId = await ensure(counts, `user ${user.name} (${user.role})`,
      'SELECT id FROM users WHERE phone_number = $1', [user.phone],
      (id) => query(
        `INSERT INTO users (id, phone_number, full_name, role, is_verified, is_active, region_id)
         VALUES ($1, $2, $3, $4, '1', '1', $5)`,
        [id, user.phone, user.name, user.role, regionId]
      ));
    userIds[user.key] = userId;

    await ensure(counts, `wallet for ${user.name}`,
      'SELECT id FROM wallets WHERE user_id = $1', [userId],
      (id) => query('INSERT INTO wallets (id, user_id, balance) VALUES ($1, $2, $3)', [id, userId, user.balance]));

        if (user.role === 'delivery_agent') {
      // Delivery jobs are shown to approved riders only (see
      // modules/services/routes/delivery.routes.js).
      await ensure(counts, `rider profile for ${user.name}`,
        'SELECT id FROM delivery_agents WHERE user_id = $1', [userId],
        (id) => query(
          `INSERT INTO delivery_agents (id, user_id, vehicle_type, vehicle_number, kyc_status, status)
           VALUES ($1, $2, 'motorcycle', 'MH12-DEMO-0001', 'active', 'offline')`,
          [id, userId]
        ));
    }

    if (user.adminRole) {
      await ensure(counts, `admin role ${user.adminRole} for ${user.name}`,
        'SELECT id FROM admin_roles WHERE user_id = $1 AND role = $2', [userId, user.adminRole],
        (id) => query(
          `INSERT INTO admin_roles (id, user_id, role, region_id, permissions, is_active)
           VALUES ($1, $2, $3, $4, $5, '1')`,
          [id, userId, user.adminRole, regionId, JSON.stringify({ all: true })]
        ));
    }
  }

  const category = await queryOne('SELECT id FROM shop_categories WHERE slug = $1', [SHOP.categorySlug]);

  const shopId = await ensure(counts, `shop ${SHOP.name}`,
    'SELECT id FROM local_shops WHERE name = $1 AND owner_id = $2', [SHOP.name, userIds.vendor],
    (id) => query(
      // The coordinates are constants from this file, not input.
      `INSERT INTO local_shops
         (id, owner_id, region_id, category_id, name, description, category, phone, address,
          coordinate, latitude, longitude, is_verified, is_premium, approval_status, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9,
               ST_GeomFromText('POINT(${SHOP.longitude} ${SHOP.latitude})', 4326), $10, $11, '1', '1', 'approved', '1')`,
      [id, userIds.vendor, regionId, category ? category.id : null, SHOP.name, SHOP.description,
        SHOP.category, SHOP.phone, SHOP.address, SHOP.latitude, SHOP.longitude]
    ));

  for (const [name, description, price] of PRODUCTS) {
    await ensure(counts, `product ${name}`,
      'SELECT id FROM shop_products WHERE shop_id = $1 AND name = $2', [shopId, name],
      (id) => query(
        `INSERT INTO shop_products (id, shop_id, name, description, price, is_available, is_active)
         VALUES ($1, $2, $3, $4, $5, '1', '1')`,
        [id, shopId, name, description, price]
      ));
  }
}

/** Seeds the database and reports what it created and what was already there. */
async function runSeed({ demo } = {}) {
  await connectDB();

  const withDemo = demo !== undefined
    ? demo
    : process.env.NODE_ENV !== 'production' || process.env.SEED_DEMO === 'true';

  const counts = { created: 0, existing: 0, createdRows: [], demo: withDemo };
  const regionId = await seedReferenceData(counts);
  if (withDemo) await seedDemoAccounts(counts, regionId);
  return counts;
}

if (require.main === module) {
  console.log('🌱 Seeding database...');
  runSeed()
    .then((counts) => {
      for (const row of counts.createdRows) console.log(`   + ${row}`);
      console.log(`✅ Database seeding completed: ${counts.created} created, ${counts.existing} already present.`);
      if (!counts.demo) {
        console.log('   Demo accounts skipped (NODE_ENV=production). Create an administrator with scripts/provision-admin.js.');
      }
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error.message);
      process.exit(1);
    });
}

module.exports = { runSeed, USERS, SHOP, REGION };
