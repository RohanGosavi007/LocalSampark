const fs = require('fs');
const path = require('path');
const { query } = require('../config/database');

async function runMigration() {
  console.log('Running 046_add_metadata.sqlite.sql migration...');
  try {
    const sqlPath = path.join(__dirname, '046_add_metadata.sqlite.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    const statements = sql.split(';').filter(stmt => stmt.trim() !== '');

    for (let stmt of statements) {
      if (stmt.trim()) {
        await query(stmt);
      }
    }

    console.log('Migration 046 applied successfully. Metadata column added.');
    process.exit(0);
  } catch (error) {
    console.error('Error running migration 046:', error);
    process.exit(1);
  }
}

runMigration();
