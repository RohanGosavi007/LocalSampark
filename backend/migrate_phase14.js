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
  db.run(`DROP TABLE IF EXISTS franchises;`);
  db.run(`DROP TABLE IF EXISTS franchise_earnings;`);
  db.run(`DROP TABLE IF EXISTS crm_leads;`);
  db.run(`DROP TABLE IF EXISTS crm_campaigns;`);
  db.run(`DROP TABLE IF EXISTS utility_bills;`);

  // Franchises
  db.run(`
    CREATE TABLE IF NOT EXISTS franchises (
        id TEXT PRIMARY KEY,
        owner_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        region_pincode TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Franchise Earnings
  db.run(`
    CREATE TABLE IF NOT EXISTS franchise_earnings (
        id TEXT PRIMARY KEY,
        franchise_id TEXT REFERENCES franchises(id) ON DELETE CASCADE,
        amount REAL NOT NULL,
        source_type TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // CRM Leads
  db.run(`
    CREATE TABLE IF NOT EXISTS crm_leads (
        id TEXT PRIMARY KEY,
        owner_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        customer_name TEXT NOT NULL,
        phone TEXT,
        status TEXT DEFAULT 'new',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // CRM Campaigns
  db.run(`
    CREATE TABLE IF NOT EXISTS crm_campaigns (
        id TEXT PRIMARY KEY,
        owner_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        campaign_type TEXT NOT NULL,
        target_audience TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Utility Bills
  db.run(`
    CREATE TABLE IF NOT EXISTS utility_bills (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        provider TEXT NOT NULL,
        amount REAL NOT NULL,
        status TEXT DEFAULT 'completed',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed Mock Franchise
  const franchiseId = 'f1-franchise';
  // We don't have a specific owner_id handy, but we can insert assuming owner_id '1' (which is the mock seller in many places)
  db.run(`INSERT INTO franchises (id, owner_id, region_pincode) VALUES ('${franchiseId}', '1', '411014')`);
  db.run(`INSERT INTO franchise_earnings (id, franchise_id, amount, source_type) VALUES ('${uuidv4()}', '${franchiseId}', 1500, 'shop_boarding')`);
  db.run(`INSERT INTO franchise_earnings (id, franchise_id, amount, source_type) VALUES ('${uuidv4()}', '${franchiseId}', 350, 'delivery_commission')`);

  // Seed Mock CRM
  db.run(`INSERT INTO crm_leads (id, owner_id, customer_name, phone, status) VALUES ('${uuidv4()}', '1', 'Amit Patel', '9876543210', 'new')`);
  db.run(`INSERT INTO crm_leads (id, owner_id, customer_name, phone, status) VALUES ('${uuidv4()}', '1', 'Priya Singh', '9876543211', 'contacted')`);
  db.run(`INSERT INTO crm_campaigns (id, owner_id, campaign_type, target_audience, status) VALUES ('${uuidv4()}', '1', 'WhatsApp', 'Past Customers', 'active')`);

  // Seed Mock Bills
  db.run(`INSERT INTO utility_bills (id, user_id, provider, amount, status) VALUES ('${uuidv4()}', '1', 'MSEB (Electricity)', 1250, 'completed')`);
});

db.close((err) => {
  if (err) {
    console.error('Error closing database', err);
  } else {
    console.log('Phase 14 tables added successfully.');
  }
});
