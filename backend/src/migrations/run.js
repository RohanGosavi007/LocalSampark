const fs = require('fs');
const path = require('path');
const { pool, connectDB } = require('../config/database');

async function runMigration() {
  try {
    await connectDB();
    console.log('🔄 Running migrations...');
    const isSqlite = process.env.USE_SQLITE === 'true';
    if (isSqlite) {
      // Run init.sqlite.sql first
      const initSql = fs.readFileSync(path.join(__dirname, 'init.sqlite.sql'), 'utf8');
      await new Promise((resolve, reject) => {
        pool.exec(initSql, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Get all 0*.sqlite.sql files
      const files = fs.readdirSync(__dirname)
        .filter(f => f.startsWith('0') && f.endsWith('.sqlite.sql'))
        .sort();

      for (const file of files) {
        console.log(`Running migration: ${file}...`);
        const sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
        try {
          const statements = sql.split(/;\s*[\r\n]+/).map(s => s.trim()).filter(s => s.length > 0);
          for (let statement of statements) {
            try {
              await new Promise((resolve, reject) => {
                pool.exec(statement + ';', (err) => {
                  if (err) reject(err);
                  else resolve();
                });
              });
            } catch (err) {
              if (!err.message.includes('duplicate column') && !err.message.includes('already exists')) {
                console.log(`⚠️ Statement warning:`, err.message);
              }
            }
          }
        } catch (err) {
          console.log(`⚠️ Migration ${file} error:`, err.message);
        }
      }
    } else {
      const sqlPath = path.join(__dirname, 'init.sql');
      const sql = fs.readFileSync(sqlPath, 'utf8');
      await pool.query(sql);
    }
    console.log('✅ Database migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
