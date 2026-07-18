const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { connectDB, query, pool } = require('../src/config/database');
const logger = require('../src/config/logger');

async function runMigrations() {
  await connectDB();

  // Create migrations table if it doesn't exist
  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      migration_name VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const migrationsDir = path.join(__dirname, '../migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    logger.info('No migrations directory found. Skipping migrations.');
    process.exit(0);
  }

  const files = fs.readdirSync(migrationsDir).sort(); // Sort to ensure chronological execution

  for (const file of files) {
    if (file.endsWith('.sql')) {
      const result = await query('SELECT id FROM schema_migrations WHERE migration_name = $1', [file]);
      if (result.rows.length === 0) {
        logger.info(`Running migration: ${file}`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        try {
          await query(sql);
          await query('INSERT INTO schema_migrations (migration_name) VALUES ($1)', [file]);
          logger.info(`✅ Migration ${file} executed successfully.`);
        } catch (err) {
          logger.error(`❌ Migration ${file} failed: ${err.message}`);
          process.exit(1);
        }
      } else {
        logger.info(`⏭️ Skipping migration ${file} (already executed).`);
      }
    }
  }

  logger.info('🎉 All migrations up to date.');
  
  if (pool) {
    await pool.end();
  }
  process.exit(0);
}

runMigrations().catch(err => {
  logger.error(`Migration script failed: ${err.message}`);
  process.exit(1);
});
