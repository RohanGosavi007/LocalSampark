const fs = require('fs');
const path = require('path');
const db = require('../config/database.sqlite');
const logger = require('../utils/logger'); // Or console.log

async function runMigration() {
  try {
    console.log('Running 019_ecommerce_pro.sqlite.sql...');
    const sqlPath = path.join(__dirname, '019_ecommerce_pro.sqlite.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      if (statement.startsWith('--')) continue; // Skip pure comments, though SQLite usually handles them
      try {
        await db.query(statement);
      } catch (err) {
        // Ignore duplicate column errors from SQLite just in case
        if (!err.message.includes('duplicate column name')) {
          throw err;
        } else {
            console.log('Skipping duplicate column addition:', statement.substring(0, 50));
        }
      }
    }
    console.log('Migration 019 completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runMigration();
