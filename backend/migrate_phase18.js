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
  db.run(`DROP TABLE IF EXISTS user_subscriptions;`);
  db.run(`DROP TABLE IF EXISTS referrals;`);
  db.run(`DROP TABLE IF EXISTS properties;`);
  db.run(`DROP TABLE IF EXISTS pet_services;`);

  // User Subscriptions
  db.run(`
    CREATE TABLE IF NOT EXISTS user_subscriptions (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        tier TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT,
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Referrals
  db.run(`
    CREATE TABLE IF NOT EXISTS referrals (
        id TEXT PRIMARY KEY,
        referrer_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        referred_email TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        reward_amount REAL DEFAULT 50.0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Properties
  db.run(`
    CREATE TABLE IF NOT EXISTS properties (
        id TEXT PRIMARY KEY,
        owner_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        type TEXT NOT NULL,
        location TEXT,
        status TEXT DEFAULT 'available',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Pet Services
  db.run(`
    CREATE TABLE IF NOT EXISTS pet_services (
        id TEXT PRIMARY KEY,
        provider_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        service_type TEXT NOT NULL,
        price REAL,
        description TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const mockUserId = '1';

  // Seed Properties
  db.run(`INSERT INTO properties (id, owner_id, title, description, price, type, location) VALUES ('${uuidv4()}', '${mockUserId}', '2BHK Fully Furnished', 'Spacious apartment near the lake', 25000, 'Rent', 'Dhanori Lake')`);

  // Seed Pet Services
  db.run(`INSERT INTO pet_services (id, provider_id, service_type, price, description) VALUES ('${uuidv4()}', '${mockUserId}', 'Dog Walking', 300, 'Professional dog walking per hour')`);

  // Give mock user a referral record
  db.run(`INSERT INTO referrals (id, referrer_id, referred_email, status) VALUES ('${uuidv4()}', '${mockUserId}', 'neighbor@example.com', 'completed')`);
});

db.close((err) => {
  if (err) {
    console.error('Error closing database', err);
  } else {
    console.log('Phase 18 tables added successfully.');
  }
});
