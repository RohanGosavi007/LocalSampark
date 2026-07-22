const fs = require('fs');
const path = require('path');
const { query } = require('../config/database');

async function runMigration() {
  console.log('Running 024_pending_modules_all.sqlite.sql migration...');
  try {
    const sqlPath = path.join(__dirname, '024_pending_modules_all.sqlite.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    const statements = sql.split(';').filter(stmt => stmt.trim() !== '');

    for (let stmt of statements) {
      if (stmt.trim()) {
        await query(stmt);
      }
    }

    console.log('Migration 024 applied successfully. All pending modules schemas & default data seeded.');
    process.exit(0);
  } catch (error) {
    console.error('Error running migration 024:', error);
    process.exit(1);
  }
}

runMigration();
