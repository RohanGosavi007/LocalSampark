const fs = require('fs');
const path = require('path');
const { query } = require('../config/database');

async function runMigration() {
  console.log('Running 021_saas_crm.sqlite.sql migration...');
  try {
    const sqlPath = path.join(__dirname, '021_saas_crm.sqlite.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Split by semicolons and run each statement
    const statements = sql.split(';').filter(stmt => stmt.trim() !== '');

    for (let stmt of statements) {
      if (stmt.trim()) {
        try {
          await query(stmt);
        } catch (e) {
          // Ignore duplicate column errors if migration is re-run
          if (!e.message.includes('duplicate column name')) {
            throw e;
          } else {
            console.log('Skipped adding column (already exists).');
          }
        }
      }
    }

    console.log('Migration 021 applied successfully.');
    
    // Seed default saas_plans
    await query(`INSERT OR IGNORE INTO saas_plans (id, name, price_monthly, features_json) VALUES 
      ('plan_basic', 'Basic CRM', 0, '["pos", "inventory"]'),
      ('plan_premium', 'Premium SaaS', 999, '["pos", "inventory", "advanced_analytics", "staff_management", "priority_support"]')
    `);
    console.log('Seeded default saas plans.');
    
    process.exit(0);
  } catch (error) {
    console.error('Error running migration 021:', error);
    process.exit(1);
  }
}

runMigration();
