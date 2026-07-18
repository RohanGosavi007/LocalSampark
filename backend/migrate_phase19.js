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
  db.run(`DROP TABLE IF EXISTS carpool_rides;`);
  db.run(`DROP TABLE IF EXISTS home_chefs;`);
  db.run(`DROP TABLE IF EXISTS chef_meals;`);
  db.run(`DROP TABLE IF EXISTS equipment_rentals;`);
  db.run(`DROP TABLE IF EXISTS scrap_pickups;`);
  db.run(`DROP TABLE IF EXISTS local_events;`);

  // Carpool Rides
  db.run(`
    CREATE TABLE IF NOT EXISTS carpool_rides (
        id TEXT PRIMARY KEY,
        driver_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        origin TEXT NOT NULL,
        destination TEXT NOT NULL,
        departure_time TEXT NOT NULL,
        seats_available INTEGER NOT NULL,
        price_per_seat REAL NOT NULL,
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Home Chefs
  db.run(`
    CREATE TABLE IF NOT EXISTS home_chefs (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        kitchen_name TEXT NOT NULL,
        specialty TEXT,
        rating REAL DEFAULT 5.0,
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Chef Meals
  db.run(`
    CREATE TABLE IF NOT EXISTS chef_meals (
        id TEXT PRIMARY KEY,
        chef_id TEXT REFERENCES home_chefs(id) ON DELETE CASCADE,
        meal_name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        type TEXT NOT NULL,
        status TEXT DEFAULT 'available',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Equipment Rentals
  db.run(`
    CREATE TABLE IF NOT EXISTS equipment_rentals (
        id TEXT PRIMARY KEY,
        owner_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        item_name TEXT NOT NULL,
        description TEXT,
        daily_rate REAL NOT NULL,
        status TEXT DEFAULT 'available',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Scrap Pickups
  db.run(`
    CREATE TABLE IF NOT EXISTS scrap_pickups (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        address TEXT NOT NULL,
        preferred_time TEXT NOT NULL,
        estimated_weight TEXT,
        status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Local Events
  db.run(`
    CREATE TABLE IF NOT EXISTS local_events (
        id TEXT PRIMARY KEY,
        organizer_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        event_date TEXT NOT NULL,
        location TEXT NOT NULL,
        attendees_count INTEGER DEFAULT 0,
        status TEXT DEFAULT 'upcoming',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const mockUserId = '1';

  // Seed Carpool
  db.run(`INSERT INTO carpool_rides (id, driver_id, origin, destination, departure_time, seats_available, price_per_seat) VALUES ('${uuidv4()}', '${mockUserId}', 'Dhanori', 'Hinjewadi IT Park', '2026-07-03T09:00:00Z', 3, 100)`);

  // Seed Home Chefs & Meals
  const chefId = uuidv4();
  db.run(`INSERT INTO home_chefs (id, user_id, kitchen_name, specialty) VALUES ('${chefId}', '${mockUserId}', 'Aarti Kitchen', 'Maharashtrian Veg')`);
  db.run(`INSERT INTO chef_meals (id, chef_id, meal_name, description, price, type) VALUES ('${uuidv4()}', '${chefId}', 'Puran Poli Thali', 'Authentic 2 Puran Polis with Amti', 120, 'Veg')`);

  // Seed Equipment Rentals
  db.run(`INSERT INTO equipment_rentals (id, owner_id, item_name, description, daily_rate) VALUES ('${uuidv4()}', '${mockUserId}', 'Bosch Power Drill', 'Heavy duty drill with bits', 150)`);

  // Seed Events
  db.run(`INSERT INTO local_events (id, organizer_id, title, description, event_date, location) VALUES ('${uuidv4()}', '${mockUserId}', 'Dhanori Tech Meetup', 'Networking event for IT professionals', '2026-07-10T18:00:00Z', 'Townsquare Cafe')`);
});

db.close((err) => {
  if (err) {
    console.error('Error closing database', err);
  } else {
    console.log('Phase 19 tables added successfully.');
  }
});
