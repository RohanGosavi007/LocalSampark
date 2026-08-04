const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, 'backend/src/data/localsampark.db'));

db.serialize(() => {
  db.run(`
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

  db.run(`
    CREATE TABLE IF NOT EXISTS admin_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      config_key TEXT UNIQUE,
      config_value TEXT
    )
  `);

  db.run(`
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

  db.run(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      content TEXT,
      media_urls TEXT,
      post_type TEXT,
      region_id INTEGER,
      society_id INTEGER,
      coordinate TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  db.run(`
    INSERT OR IGNORE INTO regions (id, name, state, district, city, pincode, latitude, longitude)
    VALUES (1, 'Viman Nagar', 'Maharashtra', 'Pune', 'Pune', '411014', 18.5679, 73.9143)
  `);
  
  db.run(`
    INSERT OR IGNORE INTO admin_config (config_key, config_value)
    VALUES ('territory_features_1', '{"delivery": true}')
  `);
  
  console.log('Fixed dev DB schema missing tables');
});
