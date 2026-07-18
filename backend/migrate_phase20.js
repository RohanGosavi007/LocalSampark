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
  db.run(`DROP TABLE IF EXISTS chat_messages;`);
  db.run(`DROP TABLE IF EXISTS townsquare_posts;`);
  db.run(`DROP TABLE IF EXISTS townsquare_polls;`);
  db.run(`DROP TABLE IF EXISTS society_notices;`);
  db.run(`DROP TABLE IF EXISTS daily_subscriptions;`);

  // Chat Messages
  db.run(`
    CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        sender_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        receiver_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        read_status BOOLEAN DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Townsquare Posts
  db.run(`
    CREATE TABLE IF NOT EXISTS townsquare_posts (
        id TEXT PRIMARY KEY,
        author_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        type TEXT DEFAULT 'news',
        content TEXT NOT NULL,
        location TEXT,
        likes INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Townsquare Polls
  db.run(`
    CREATE TABLE IF NOT EXISTS townsquare_polls (
        id TEXT PRIMARY KEY,
        question TEXT NOT NULL,
        options_json TEXT NOT NULL,
        reward_coins INTEGER DEFAULT 0,
        active BOOLEAN DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Society Notices
  db.run(`
    CREATE TABLE IF NOT EXISTS society_notices (
        id TEXT PRIMARY KEY,
        society_name TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        author_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Daily Subscriptions
  db.run(`
    CREATE TABLE IF NOT EXISTS daily_subscriptions (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        product_name TEXT NOT NULL,
        frequency TEXT DEFAULT 'Daily',
        provider_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const mockUserId = '1'; // Typically '1' is the seeded user ID from earlier migrations

  // Seed Townsquare Posts
  db.run(`INSERT INTO townsquare_posts (id, author_id, type, content, location) VALUES ('${uuidv4()}', '${mockUserId}', 'news', 'New vegetable market opened near the society gate today!', 'Dhanori')`);

  // Seed Townsquare Polls
  const options = JSON.stringify([{ text: 'Morning', votes: 12 }, { text: 'Evening', votes: 34 }]);
  db.run(`INSERT INTO townsquare_polls (id, question, options_json, reward_coins) VALUES ('${uuidv4()}', 'Should we organize a weekend cleaning drive at the lake?', '${options}', 10)`);

  // Seed Society Notices
  db.run(`INSERT INTO society_notices (id, society_name, title, content, author_id) VALUES ('${uuidv4()}', 'Ganga Aria', 'Water Cut on Tuesday', 'Please note there will be no water supply from 10 AM to 4 PM due to pipeline repair.', '${mockUserId}')`);

  // Seed Daily Subscriptions
  db.run(`INSERT INTO daily_subscriptions (id, user_id, product_name, frequency, provider_id) VALUES ('${uuidv4()}', '${mockUserId}', 'Amul Taaza Milk 1L', 'Daily', '${mockUserId}')`);
});

db.close((err) => {
  if (err) {
    console.error('Error closing database', err);
  } else {
    console.log('Phase 20 tables added successfully.');
  }
});
