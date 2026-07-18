const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'src', 'data', 'localsampark.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err);
    process.exit(1);
  }
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS medical_donors (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        blood_group TEXT NOT NULL,
        pincode TEXT,
        location TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS medical_requests (
        id TEXT PRIMARY KEY,
        requester_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        request_type TEXT NOT NULL,
        required_item TEXT NOT NULL,
        description TEXT,
        location TEXT,
        urgency TEXT DEFAULT 'Urgent',
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
});

db.close((err) => {
  if (err) {
    console.error('Error closing database', err);
  } else {
    console.log('Successfully added medical_donors and medical_requests tables.');
  }
});
