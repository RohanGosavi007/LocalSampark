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
  db.run(`DROP TABLE IF EXISTS events;`);
  db.run(`DROP TABLE IF EXISTS user_subscriptions;`);
  db.run(`DROP TABLE IF EXISTS subscription_plans;`);

  // Carpool
  db.run(`
    CREATE TABLE IF NOT EXISTS carpool_rides (
        id TEXT PRIMARY KEY,
        driver_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        from_location TEXT NOT NULL,
        from_coordinate TEXT,
        to_location TEXT NOT NULL,
        to_coordinate TEXT,
        departure_date TEXT NOT NULL,
        departure_time TEXT NOT NULL,
        total_seats INTEGER NOT NULL,
        available_seats INTEGER NOT NULL,
        price_per_seat REAL NOT NULL,
        vehicle_type TEXT,
        vehicle_number TEXT,
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Events
  db.run(`
    CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        organizer_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        category TEXT DEFAULT 'other',
        venue TEXT NOT NULL,
        event_date TEXT NOT NULL,
        start_time TEXT,
        end_time TEXT,
        max_attendees INTEGER,
        is_paid INTEGER DEFAULT 0,
        ticket_price REAL DEFAULT 0,
        cover_image_url TEXT,
        status TEXT DEFAULT 'upcoming',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Subscription Plans
  db.run(`
    CREATE TABLE IF NOT EXISTS subscription_plans (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        billing_cycle TEXT,
        is_active INTEGER DEFAULT 1,
        provider_name TEXT,
        schedule TEXT,
        category TEXT,
        icon TEXT,
        rating TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // User Subscriptions
  db.run(`
    CREATE TABLE IF NOT EXISTS user_subscriptions (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        plan_id TEXT REFERENCES subscription_plans(id) ON DELETE CASCADE,
        delivery_address TEXT,
        delivery_coordinate TEXT,
        status TEXT DEFAULT 'active',
        next_delivery_date TEXT,
        paused_until TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Insert mock subscription plans to match frontend
  const plans = [
    { id: 'milk', name: 'Fresh Buffalo Milk (1L)', category: 'Dairy & Essentials', provider_name: 'Sharma Dairy & Farms', price: 68, billing_cycle: 'Daily Auto-Debit', schedule: 'Every morning (6:00 AM)', rating: '4.8 ★', icon: '🥛' },
    { id: 'water', name: 'Bisleri 20L Water Can', category: 'Dairy & Essentials', provider_name: 'H2O Express Dhanori', price: 75, billing_cycle: 'On Delivery Auto-Debit', schedule: 'Alternate days', rating: '4.7 ★', icon: '🪣' },
    { id: 'tiffin', name: 'Homely Veg Tiffin (Lunch + Dinner)', category: 'Food & Meals', provider_name: 'Aaji cha Swad (Home Chef)', price: 180, billing_cycle: 'Weekly Auto-Debit', schedule: 'Mon-Sat (12:30 PM & 8:00 PM)', rating: '4.9 ★', icon: '🍱' },
    { id: 'news', name: 'Times of India + Maharashtra Times', category: 'Media', provider_name: 'Dhanori News Agency', price: 220, billing_cycle: 'Monthly Auto-Debit', schedule: 'Every morning (6:30 AM)', rating: '4.5 ★', icon: '📰' },
  ];

  const stmt = db.prepare(`INSERT OR IGNORE INTO subscription_plans (id, name, category, provider_name, price, billing_cycle, schedule, rating, icon) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const p of plans) {
    stmt.run(p.id, p.name, p.category, p.provider_name, p.price, p.billing_cycle, p.schedule, p.rating, p.icon);
  }
  stmt.finalize();
});

db.close((err) => {
  if (err) {
    console.error('Error closing database', err);
  } else {
    console.log('Successfully added tables and seeded subscription plans.');
  }
});
