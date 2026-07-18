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
  db.run(`DROP TABLE IF EXISTS pharmacies;`);
  db.run(`DROP TABLE IF EXISTS medical_orders;`);
  db.run(`DROP TABLE IF EXISTS care_providers;`);
  db.run(`DROP TABLE IF EXISTS care_requests;`);
  db.run(`DROP TABLE IF EXISTS donation_campaigns;`);
  db.run(`DROP TABLE IF EXISTS volunteer_events;`);

  // Pharmacies
  db.run(`
    CREATE TABLE IF NOT EXISTS pharmacies (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        address TEXT NOT NULL,
        license_no TEXT,
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Medical Orders
  db.run(`
    CREATE TABLE IF NOT EXISTS medical_orders (
        id TEXT PRIMARY KEY,
        pharmacy_id TEXT REFERENCES pharmacies(id) ON DELETE CASCADE,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        prescription_url TEXT,
        notes TEXT,
        status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Care Providers
  db.run(`
    CREATE TABLE IF NOT EXISTS care_providers (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        specialization TEXT NOT NULL,
        hourly_rate REAL NOT NULL,
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Care Requests
  db.run(`
    CREATE TABLE IF NOT EXISTS care_requests (
        id TEXT PRIMARY KEY,
        provider_id TEXT REFERENCES care_providers(id) ON DELETE CASCADE,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Donation Campaigns
  db.run(`
    CREATE TABLE IF NOT EXISTS donation_campaigns (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        target_amount REAL NOT NULL,
        raised_amount REAL DEFAULT 0,
        end_date TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Volunteer Events
  db.run(`
    CREATE TABLE IF NOT EXISTS volunteer_events (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        date TEXT NOT NULL,
        location TEXT NOT NULL,
        required_volunteers INTEGER NOT NULL,
        registered_count INTEGER DEFAULT 0,
        status TEXT DEFAULT 'upcoming',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const mockUserId = '1';

  // Seed Pharmacies
  const pharmId = uuidv4();
  db.run(`INSERT INTO pharmacies (id, user_id, name, address, license_no) VALUES ('${pharmId}', '${mockUserId}', 'Pune Wellness Pharmacy', 'Dhanori Main Rd', 'LIC-1234')`);

  // Seed Care Providers
  db.run(`INSERT INTO care_providers (id, user_id, name, specialization, hourly_rate) VALUES ('${uuidv4()}', '${mockUserId}', 'Sunita Nurse', 'Elderly Care', 200)`);
  db.run(`INSERT INTO care_providers (id, user_id, name, specialization, hourly_rate) VALUES ('${uuidv4()}', '${mockUserId}', 'Rahul (Tech Guide)', 'Senior Tech Assist', 150)`);

  // Seed Donation Campaigns
  db.run(`INSERT INTO donation_campaigns (id, title, description, target_amount, raised_amount, end_date) VALUES ('${uuidv4()}', 'Food Drive for Orphanage', 'Collecting funds to provide daily meals.', 50000, 15000, '2026-12-31')`);

  // Seed Volunteer Events
  db.run(`INSERT INTO volunteer_events (id, title, description, date, location, required_volunteers) VALUES ('${uuidv4()}', 'Lake Cleanup Drive', 'Join us to clean the nearby lake.', '2026-07-15T09:00:00Z', 'Dhanori Lake', 50)`);

});

db.close((err) => {
  if (err) {
    console.error('Error closing database', err);
  } else {
    console.log('Phase 17 tables added successfully.');
  }
});
