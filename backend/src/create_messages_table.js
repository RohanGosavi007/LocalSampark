const { query, connectDB } = require('./config/database');

async function run() {
  await connectDB();
  await query(`
    CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        sender_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        receiver_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        message_text TEXT,
        is_read BOOLEAN DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log("Messages table created.");
  process.exit(0);
}

run();
