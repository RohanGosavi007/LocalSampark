const fs = require('fs');
const path = require('path');
const { pool, connectDB } = require('../config/database');

async function runMigration() {
  try {
    process.env.USE_SQLITE = 'true';
    await connectDB();
    console.log('🔄 Running migration 013...');
    const sqlPath = path.join(__dirname, '013_engagement_engines.sqlite.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await new Promise((resolve, reject) => {
      pool.exec(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    console.log('✅ Migration 013 completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration 013 failed:', error.message);
    process.exit(1);
  }
}

runMigration();
