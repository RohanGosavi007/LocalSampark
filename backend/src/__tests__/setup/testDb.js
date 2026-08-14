/**
 * Test Database Setup & Lifecycle
 * Manages test database creation, migration, seeding, and teardown.
 * Uses SQLite for fast CI runs or PostgreSQL for integration fidelity.
 */
const path = require('path');
const fs = require('fs');

// Force test environment
process.env.NODE_ENV = 'test';
process.env.USE_SQLITE = process.env.TEST_USE_POSTGRES ? 'false' : 'true';

// Run against a dedicated database file. Previously the suite shared
// src/data/localsampark.db with development, so CREATE TABLE IF NOT EXISTS hit
// pre-existing tables with a divergent schema and seeding failed.
if (!process.env.TEST_USE_POSTGRES) {
  const testDbPath = path.join(__dirname, '../../data/test.db');
  process.env.SQLITE_DB_PATH = testDbPath;

  // Start from a clean slate so schema changes always take effect.
  for (const suffix of ['', '-wal', '-shm']) {
    const f = testDbPath + suffix;
    if (fs.existsSync(f)) {
      try {
        fs.unlinkSync(f);
      } catch {
        // A lingering handle from a previous run is not fatal; the schema
        // creation below is idempotent.
      }
    }
  }
}
process.env.JWT_SECRET = 'test-jwt-secret-key-localsampark-2026';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-localsampark-2026';
process.env.JWT_EXPIRES_IN = '1h';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';

let dbModule;

/**
 * Initialize test database
 */
async function setupTestDb() {
  // Import database module after env vars are set
  dbModule = require('../../config/database');
  
  await dbModule.connectDB();
  
  // Run essential schema creation for test tables
  const { query } = dbModule;
  
  // Core tables needed for tests
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone_number TEXT UNIQUE,
      full_name TEXT,
      email TEXT,
      role TEXT DEFAULT 'user',
      avatar_url TEXT,
      bio TEXT,
      region_id INTEGER,
      is_active INTEGER DEFAULT 1,
      is_verified INTEGER DEFAULT 0,
      language_preference TEXT DEFAULT 'en',
      password_hash TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS admin_roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      role TEXT NOT NULL,
      region_id INTEGER,
      permissions TEXT DEFAULT '{}',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS local_shops (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id INTEGER REFERENCES users(id),
      name TEXT,
      description TEXT,
      category TEXT,
      address TEXT,
      pincode TEXT,
      latitude REAL,
      longitude REAL,
      phone TEXT,
      is_verified INTEGER DEFAULT 0,
      is_locked INTEGER DEFAULT 0,
      crm_tier TEXT DEFAULT 'free',
      rating REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS shop_products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shop_id INTEGER REFERENCES local_shops(id),
      name TEXT,
      description TEXT,
      price REAL,
      mrp REAL,
      stock INTEGER DEFAULT 0,
      category TEXT,
      image_url TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS shop_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER REFERENCES users(id),
      shop_id INTEGER REFERENCES local_shops(id),
      status TEXT DEFAULT 'pending',
      total_amount REAL,
      delivery_fee REAL DEFAULT 0,
      payment_status TEXT DEFAULT 'pending',
      payment_gateway_ref TEXT,
      delivery_agent_id INTEGER,
      tracking_otp TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS delivery_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      requester_id INTEGER,
      agent_id INTEGER,
      shop_order_id INTEGER,
      pickup_location TEXT,
      dropoff_location TEXT,
      item_details TEXT,
      delivery_type TEXT,
      payment_pref TEXT,
      price_fiat REAL,
      price_coins INTEGER,
      pincode TEXT,
      status TEXT DEFAULT 'pending',
      surge_multiplier REAL DEFAULT 1.0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS delivery_agents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      vehicle_type TEXT,
      vehicle_number TEXT,
      dl_number TEXT,
      aadhar_number TEXT,
      profile_image_url TEXT,
      dl_image_url TEXT,
      rc_image_url TEXT,
      kyc_status TEXT DEFAULT 'pending',
      is_online INTEGER DEFAULT 0,
      coordinate TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS loyalty_wallets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) UNIQUE,
      total_coins INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS loyalty_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      amount INTEGER,
      type TEXT,
      source TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS community_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author_id INTEGER REFERENCES users(id),
      content TEXT,
      type TEXT DEFAULT 'discussion',
      pincode TEXT,
      likes INTEGER DEFAULT 0,
      comments INTEGER DEFAULT 0,
      is_pinned INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS home_service_bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
      provider_id INTEGER,
      service_type TEXT,
      status TEXT DEFAULT 'pending',
      inspection_fee REAL DEFAULT 199,
      is_payout_settled INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS home_service_providers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      service_type TEXT,
      wallet_balance REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS regions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      state TEXT,
      district TEXT,
      city TEXT,
      pincode TEXT,
      latitude REAL,
      longitude REAL,
      radius_km REAL,
      is_active INTEGER DEFAULT 1
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS admin_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      config_key TEXT UNIQUE,
      config_value TEXT
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS society_guard_reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      society_id INTEGER,
      guard_id INTEGER,
      created_by INTEGER,
      title TEXT,
      description TEXT,
      reminder_time DATETIME,
      priority TEXT,
      is_recurring INTEGER DEFAULT 0,
      recurrence_pattern TEXT,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS shop_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      slug TEXT,
      business_model TEXT,
      commission_percent REAL,
      convenience_fee REAL,
      is_active INTEGER DEFAULT 1,
      display_order INTEGER
    )
  `);

  console.log('✅ Test database initialized');
}

/**
 * Seed baseline test data
 */
async function seedTestData() {
  const { query } = dbModule;
  const bcrypt = require('bcryptjs');
  const passwordHash = await bcrypt.hash('testpassword123', 10);

  // Seed test users for each role
  const testUsers = [
    { phone: '9999900001', name: 'Test Resident', role: 'user' },
    { phone: '9999900002', name: 'Test Shop Owner', role: 'shop_owner' },
    { phone: '9999900003', name: 'Test Delivery Agent', role: 'delivery_agent' },
    { phone: '9999900004', name: 'Test Service Provider', role: 'service_provider' },
    { phone: '9999900005', name: 'Test Admin', role: 'admin' },
    { phone: '9999900006', name: 'Test Super Admin', role: 'super_admin' },
    { phone: '9999900007', name: 'Test Territory Admin', role: 'territory_admin' },
    { phone: '9999900008', name: 'Test Area Agent', role: 'area_agent' },
    { phone: '9999900009', name: 'Test Franchise Owner', role: 'franchise_owner' },
    { phone: '9999900010', name: 'Test Field Agent', role: 'field_agent' },
    { phone: '9999900011', name: 'Test Society Admin', role: 'society_admin' },
    { phone: '9999900012', name: 'Test Moderator', role: 'moderator' },
  ];

  for (const user of testUsers) {
    await query(
      `INSERT OR IGNORE INTO users (phone_number, full_name, role, password_hash, is_active, is_verified) VALUES ($1, $2, $3, $4, 1, 1)`,
      [user.phone, user.name, user.role, passwordHash]
    );
  }

  // Seed admin roles for admin users
  await query(
    `INSERT OR IGNORE INTO admin_roles (user_id, role, permissions, is_active) 
     SELECT id, role, '{"all": true}', 1 FROM users WHERE role IN ('admin', 'super_admin', 'territory_admin', 'area_agent')`
  );

  // Seed a test shop
  await query(
    `INSERT OR IGNORE INTO local_shops (owner_id, name, description, category, address, pincode, latitude, longitude, is_verified)
     SELECT id, 'Test Grocery Store', 'A test shop for automated testing', 'grocery', 'Test Address, Pune', '411015', 18.5204, 73.8567, 1
     FROM users WHERE phone_number = '9999900002'`
  );

  // Seed test products
  await query(
    `INSERT OR IGNORE INTO shop_products (shop_id, name, description, price, mrp, stock, category)
     SELECT ls.id, 'Test Tomatoes', 'Fresh test tomatoes', 45.00, 50.00, 100, 'vegetables'
     FROM local_shops ls WHERE ls.name = 'Test Grocery Store'`
  );

  await query(
    `INSERT OR IGNORE INTO shop_products (shop_id, name, description, price, mrp, stock, category)
     SELECT ls.id, 'Test Rice 1kg', 'Premium test rice', 89.00, 99.00, 50, 'grocery'
     FROM local_shops ls WHERE ls.name = 'Test Grocery Store'`
  );

  // Seed loyalty wallet for test user
  await query(
    `INSERT OR IGNORE INTO loyalty_wallets (user_id, total_coins)
     SELECT id, 500 FROM users WHERE phone_number = '9999900001'`
  );

  await query(
    `INSERT OR IGNORE INTO regions (id, name, state, district, city, pincode, latitude, longitude)
     VALUES (1, 'Viman Nagar', 'Maharashtra', 'Pune', 'Pune', '411014', 18.5679, 73.9143)`
  );

  await query(
    `INSERT OR IGNORE INTO admin_config (config_key, config_value)
     VALUES ('territory_features_1', '{"delivery": true}')`
  );

  await query(
    `INSERT OR IGNORE INTO shop_categories (id, name, slug, business_model, is_active)
     VALUES (1, 'Grocery', 'grocery', 'product', 1)`
  );

  console.log('✅ Test data seeded');
}

/**
 * Clean all test data (between test files)
 */
async function cleanTestData() {
  if (!dbModule) return;
  const { query } = dbModule;
  
  const tables = [
    'loyalty_transactions', 'loyalty_wallets', 'community_posts',
    'delivery_jobs', 'delivery_agents', 'shop_orders', 'shop_products',
    'local_shops', 'home_service_bookings', 'home_service_providers',
    'admin_roles', 'users'
  ];
  
  for (const table of tables) {
    try {
      await query(`DELETE FROM ${table}`);
    } catch (e) {
      // Table may not exist, ignore
    }
  }
}

/**
 * Teardown test database
 */
async function teardownTestDb() {
  if (dbModule && dbModule.pool) {
    if (typeof dbModule.pool.end === 'function') {
      await dbModule.pool.end();
    } else if (typeof dbModule.pool.close === 'function') {
      await dbModule.pool.close();
    }
  }
  console.log('✅ Test database torn down');
}

module.exports = { setupTestDb, seedTestData, cleanTestData, teardownTestDb };
