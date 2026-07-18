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
  db.run(`DROP TABLE IF EXISTS batch_orders;`);
  db.run(`DROP TABLE IF EXISTS loyalty_accounts;`);
  db.run(`DROP TABLE IF EXISTS loyalty_transactions;`);
  db.run(`DROP TABLE IF EXISTS stories;`);
  db.run(`DROP TABLE IF EXISTS shop_qa;`);
  db.run(`DROP TABLE IF EXISTS flash_sales;`);

  // Batch Orders
  db.run(`
    CREATE TABLE IF NOT EXISTS batch_orders (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        total_batch_amount REAL,
        combined_delivery_fee REAL,
        delivery_partner_id TEXT,
        status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // We assume batch_id is already added if it crashed there

  // Loyalty Accounts
  db.run(`
    CREATE TABLE IF NOT EXISTS loyalty_accounts (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        sampark_coins_balance INTEGER DEFAULT 0
    );
  `);

  // Loyalty Transactions
  db.run(`
    CREATE TABLE IF NOT EXISTS loyalty_transactions (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        amount INTEGER NOT NULL,
        transaction_type TEXT NOT NULL,
        description TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Shop Stories / Highlights
  // Assuming table stories doesn't exist yet, we'll create it
  db.run(`
    CREATE TABLE IF NOT EXISTS stories (
        id TEXT PRIMARY KEY,
        shop_id TEXT REFERENCES local_shops(id) ON DELETE CASCADE,
        user_id TEXT,
        media_url TEXT NOT NULL,
        expires_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Shop Q&A
  db.run(`
    CREATE TABLE IF NOT EXISTS shop_qa (
        id TEXT PRIMARY KEY,
        shop_id TEXT REFERENCES local_shops(id) ON DELETE CASCADE,
        user_id TEXT REFERENCES users(id),
        question TEXT NOT NULL,
        answer TEXT,
        answered_by TEXT REFERENCES users(id),
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Assume is_society_verified is handled or ignored for now

  // Flash Sales
  db.run(`
    CREATE TABLE IF NOT EXISTS flash_sales (
        id TEXT PRIMARY KEY,
        shop_id TEXT REFERENCES local_shops(id) ON DELETE CASCADE,
        product_id TEXT,
        product_name TEXT,
        discount_percentage INTEGER NOT NULL,
        start_time TEXT,
        end_time TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Insert mock flash sales
  const flashSales = [
    { id: uuidv4(), shop_id: '1', product_name: 'Amul Butter 500g', discount_percentage: 20, start_time: new Date().toISOString(), end_time: new Date(Date.now() + 2*60*60*1000).toISOString() },
    { id: uuidv4(), shop_id: '1', product_name: 'Aashirvaad Atta 5kg', discount_percentage: 15, start_time: new Date().toISOString(), end_time: new Date(Date.now() + 3*60*60*1000).toISOString() }
  ];
  const stmt = db.prepare(`INSERT OR IGNORE INTO flash_sales (id, shop_id, product_name, discount_percentage, start_time, end_time) VALUES (?, ?, ?, ?, ?, ?)`);
  for (const s of flashSales) {
    stmt.run(s.id, s.shop_id, s.product_name, s.discount_percentage, s.start_time, s.end_time);
  }
  stmt.finalize();

  // Insert mock QA
  const qas = [
    { id: uuidv4(), shop_id: '1', question: 'Do you have fresh paneer today?', answer: 'Yes, just arrived 10 mins ago!', created_at: new Date().toISOString() },
    { id: uuidv4(), shop_id: '1', question: 'Can you deliver to Ganga Aria?', answer: 'Yes, delivery takes around 15 mins.', created_at: new Date().toISOString() }
  ];
  const stmtQA = db.prepare(`INSERT OR IGNORE INTO shop_qa (id, shop_id, question, answer, created_at) VALUES (?, ?, ?, ?, ?)`);
  for (const q of qas) {
    stmtQA.run(q.id, q.shop_id, q.question, q.answer, q.created_at);
  }
  stmtQA.finalize();

});

db.close((err) => {
  if (err) {
    console.error('Error closing database', err);
  } else {
    console.log('Phase 13 tables added successfully.');
  }
});
