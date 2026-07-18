const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { pool, connectDB } = require('../src/config/database');

async function runUpgrade() {
  try {
    await connectDB();
    console.log('Running 009_shop_mega_upgrade migration...');
    const sql = fs.readFileSync(path.join(__dirname, '../src/migrations/009_shop_mega_upgrade.sqlite.sql'), 'utf8');
    
    // Use exec instead of splitting to run the whole script
    await new Promise((resolve, reject) => {
      pool.exec(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    console.log(`Migration script executed successfully.`);
    
    // Verify categories were seeded
    await new Promise((resolve, reject) => {
      pool.all('SELECT COUNT(*) as count FROM shop_categories', (err, rows) => {
        if (err) reject(err);
        else { console.log('Categories seeded:', rows[0].count); resolve(); }
      });
    });
    
    // Verify new tables exist
    await new Promise((resolve, reject) => {
      pool.all("SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE 'shop_%' OR name LIKE 'staff_%' OR name LIKE 'surge_%') ORDER BY name", (err, rows) => {
        if (err) reject(err);
        else { console.log('Shop-related tables:', rows.map(r => r.name).join(', ')); resolve(); }
      });
    });
    
    process.exit(0);
  } catch (err) {
    if (err.message.includes('duplicate column') || err.message.includes('already exists')) {
        console.log('Migration already applied or partial duplicate detected. Continuing.');
        process.exit(0);
    }
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
}
runUpgrade();
