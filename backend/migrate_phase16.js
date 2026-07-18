const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(__dirname, 'src', 'data', 'localsampark.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err);
    process.exit(1);
  }
});

db.serialize(() => {
  db.run(`DROP TABLE IF EXISTS local_services;`);
  db.run(`DROP TABLE IF EXISTS service_bookings;`);
  db.run(`DROP TABLE IF EXISTS wallet_transactions;`);
  db.run(`DROP TABLE IF EXISTS reward_catalog;`);

  // Local Services
  db.run(`
    CREATE TABLE IF NOT EXISTS local_services (
        id TEXT PRIMARY KEY,
        provider_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        service_name TEXT NOT NULL,
        category TEXT NOT NULL,
        hourly_rate REAL,
        rating REAL DEFAULT 5.0,
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Service Bookings
  db.run(`
    CREATE TABLE IF NOT EXISTS service_bookings (
        id TEXT PRIMARY KEY,
        service_id TEXT REFERENCES local_services(id) ON DELETE CASCADE,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        scheduled_time TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Wallet Transactions
  db.run(`
    CREATE TABLE IF NOT EXISTS wallet_transactions (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        amount REAL NOT NULL,
        transaction_type TEXT NOT NULL,
        description TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Reward Catalog
  db.run(`
    CREATE TABLE IF NOT EXISTS reward_catalog (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        coin_cost INTEGER NOT NULL,
        type TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const mockUserId = '1';

  // Seed Services
  const srv1 = uuidv4();
  db.run(`INSERT INTO local_services (id, provider_id, service_name, category, hourly_rate, rating) VALUES ('${srv1}', '${mockUserId}', 'Expert Plumber (Ramesh)', 'Plumbing', 250, 4.8)`);
  db.run(`INSERT INTO local_services (id, provider_id, service_name, category, hourly_rate, rating) VALUES ('${uuidv4()}', '${mockUserId}', 'A-1 Electrician', 'Electrical', 300, 4.9)`);

  // Seed Wallet Transactions
  db.run(`INSERT INTO wallet_transactions (id, user_id, amount, transaction_type, description) VALUES ('${uuidv4()}', '${mockUserId}', 500, 'credit', 'UPI Top-up')`);
  db.run(`INSERT INTO wallet_transactions (id, user_id, amount, transaction_type, description) VALUES ('${uuidv4()}', '${mockUserId}', -150, 'debit', 'Grocery Purchase')`);
  db.run(`INSERT INTO wallet_transactions (id, user_id, amount, transaction_type, description) VALUES ('${uuidv4()}', '${mockUserId}', 50, 'credit', 'Cashback')`);

  // Seed Rewards Catalog
  db.run(`INSERT INTO reward_catalog (id, title, description, coin_cost, type) VALUES ('${uuidv4()}', 'Free Delivery for a Month', 'Get free delivery on all shop orders', 500, 'subscription')`);
  db.run(`INSERT INTO reward_catalog (id, title, description, coin_cost, type) VALUES ('${uuidv4()}', '₹50 Off Next Bill', 'Deduct ₹50 from your next grocery order', 100, 'discount')`);
  db.run(`INSERT INTO reward_catalog (id, title, description, coin_cost, type) VALUES ('${uuidv4()}', 'VIP Profile Badge', 'Show off your verified VIP neighbor status', 200, 'badge')`);

});

db.close((err) => {
  if (err) {
    console.error('Error closing database', err);
  } else {
    console.log('Phase 16 tables added successfully.');
  }
});
