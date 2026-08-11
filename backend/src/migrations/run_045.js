const fs = require('fs');
const path = require('path');
const { query } = require('../config/database');

async function runMigration() {
  console.log('Running 045_universal_ecommerce_catalog.sqlite.sql migration...');
  try {
    const sqlPath = path.join(__dirname, '045_universal_ecommerce_catalog.sqlite.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    const statements = sql.split(';').filter(stmt => stmt.trim() !== '');

    for (let stmt of statements) {
      if (stmt.trim()) {
        await query(stmt);
      }
    }

    console.log('Migration 045 applied successfully. Universal Ecommerce Catalog created.');
    process.exit(0);
  } catch (error) {
    console.error('Error running migration 045:', error);
    process.exit(1);
  }
}

runMigration();
