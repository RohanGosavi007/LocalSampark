const fs = require('fs');
const path = require('path');
const { pool, connectDB } = require('../config/database');

async function runMigration() {
  try {
    process.env.USE_SQLITE = 'true';
    await connectDB();
    console.log('🔄 Running migration 012...');
    const sqlPath = path.join(__dirname, '012_enterprise_delivery_upgrade.sqlite.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await new Promise((resolve, reject) => {
      pool.exec(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    console.log('✅ Migration 012 completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration 012 failed:', error.message);
    process.exit(1);
  }
}

runMigration();
