const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'src/data/localsampark.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Connection error:', err.message);
    process.exit(1);
  }
});

db.all(`SELECT sv.*, u.full_name as guard_name FROM society_visitors sv
        LEFT JOIN users u ON sv.guard_id = u.id
        WHERE sv.resident_id = 'test'
        ORDER BY sv.created_at DESC LIMIT 50`, (err, rows) => {
  if (err) {
    console.error('Query error:', err);
  } else {
    console.log('Query successful, rows:', rows.length);
  }
  db.close();
});
