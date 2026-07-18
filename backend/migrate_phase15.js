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
  db.run(`DROP TABLE IF EXISTS home_chefs;`);
  db.run(`DROP TABLE IF EXISTS chef_dishes;`);
  db.run(`DROP TABLE IF EXISTS equipment_rentals;`);
  db.run(`DROP TABLE IF EXISTS rental_bookings;`);
  db.run(`DROP TABLE IF EXISTS delivery_tracking;`);

  // Home Chefs
  db.run(`
    CREATE TABLE IF NOT EXISTS home_chefs (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        kitchen_name TEXT NOT NULL,
        description TEXT,
        fssai_number TEXT,
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Chef Dishes
  db.run(`
    CREATE TABLE IF NOT EXISTS chef_dishes (
        id TEXT PRIMARY KEY,
        chef_id TEXT REFERENCES home_chefs(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        category TEXT,
        availability_status TEXT DEFAULT 'available',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Equipment Rentals
  db.run(`
    CREATE TABLE IF NOT EXISTS equipment_rentals (
        id TEXT PRIMARY KEY,
        owner_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        daily_rate REAL NOT NULL,
        category TEXT,
        status TEXT DEFAULT 'available',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Rental Bookings
  db.run(`
    CREATE TABLE IF NOT EXISTS rental_bookings (
        id TEXT PRIMARY KEY,
        equipment_id TEXT REFERENCES equipment_rentals(id) ON DELETE CASCADE,
        borrower_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        total_price REAL NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Delivery Tracking
  db.run(`
    CREATE TABLE IF NOT EXISTS delivery_tracking (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        delivery_partner_id TEXT REFERENCES users(id),
        current_lat REAL,
        current_lng REAL,
        status TEXT DEFAULT 'in_transit',
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed Mock Data
  const mockUserId = '1';

  // Seed Home Chefs
  const chefId = uuidv4();
  db.run(`INSERT INTO home_chefs (id, user_id, kitchen_name, description, fssai_number) VALUES ('${chefId}', '${mockUserId}', 'Aarti''s Kitchen', 'Authentic Maharashtrian Thali', 'FSSAI-123456')`);
  db.run(`INSERT INTO chef_dishes (id, chef_id, name, price, category) VALUES ('${uuidv4()}', '${chefId}', 'Puran Poli Meal', 150, 'Meals')`);
  db.run(`INSERT INTO chef_dishes (id, chef_id, name, price, category) VALUES ('${uuidv4()}', '${chefId}', 'Misal Pav', 90, 'Breakfast')`);

  // Seed Equipment Rentals
  const equipmentId = uuidv4();
  db.run(`INSERT INTO equipment_rentals (id, owner_id, name, description, daily_rate, category) VALUES ('${equipmentId}', '${mockUserId}', 'Bosch Power Drill', 'Professional drill with all bits', 200, 'Tools')`);
  db.run(`INSERT INTO equipment_rentals (id, owner_id, name, description, daily_rate, category) VALUES ('${uuidv4()}', '${mockUserId}', 'Wheelchair', 'Foldable wheelchair in good condition', 150, 'Medical')`);
  
  // Seed Delivery Tracking
  db.run(`INSERT INTO delivery_tracking (id, order_id, delivery_partner_id, current_lat, current_lng, status) VALUES ('${uuidv4()}', 'ORD-1234', '${mockUserId}', 18.5204, 73.8567, 'in_transit')`);

});

db.close((err) => {
  if (err) {
    console.error('Error closing database', err);
  } else {
    console.log('Phase 15 tables added successfully.');
  }
});
