const fs = require('fs');
const path = require('path');
const { pool, connectDB } = require('../config/database');

async function runSeed() {
  try {
    await connectDB();
    console.log('🌱 Seeding database...');
    const sqlPath = path.join(__dirname, 'dhanori.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    const isSqlite = process.env.USE_SQLITE === 'true';
    if (isSqlite) {
      await new Promise((resolve, reject) => {
        pool.exec(sql, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    } else {
      await pool.query(sql);
    }
    console.log('✅ Database seeding completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
}

runSeed();
