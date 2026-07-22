const fs = require('fs');
const path = require('path');
const { query } = require('../config/database');

async function runMigration() {
  console.log('Running 020_phase2_admin.sqlite.sql migration...');
  try {
    const sqlPath = path.join(__dirname, '020_phase2_admin.sqlite.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Split by semicolons and run each statement
    const statements = sql.split(';').filter(stmt => stmt.trim() !== '');

    for (let stmt of statements) {
      if (stmt.trim()) {
        await query(stmt);
      }
    }

    console.log('Migration 020 applied successfully.');
  } catch (error) {
    console.error('Error running migration 020:', error);
    process.exit(1);
  }
}

runMigration();
