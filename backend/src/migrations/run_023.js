const fs = require('fs');
const path = require('path');
const { query } = require('../config/database');

async function runMigration() {
  console.log('Running 023_home_services.sqlite.sql migration...');
  try {
    const sqlPath = path.join(__dirname, '023_home_services.sqlite.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    const statements = sql.split(';').filter(stmt => stmt.trim() !== '');

    for (let stmt of statements) {
      if (stmt.trim()) {
        await query(stmt);
      }
    }

    console.log('Migration 023 applied successfully. Home Services Schema & Categories seeded.');
    process.exit(0);
  } catch (error) {
    console.error('Error running migration 023:', error);
    process.exit(1);
  }
}

runMigration();
