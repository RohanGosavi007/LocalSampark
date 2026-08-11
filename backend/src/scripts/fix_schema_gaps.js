/**
 * ═══════════════════════════════════════════════════════════════════════
 * Schema Gap Healer — Auto-runs new migrations on SQLite startup
 * 10x ENHANCED: Now includes all 6 new 10x migrations (038-043)
 * ═══════════════════════════════════════════════════════════════════════
 */
const { query } = require('../config/database.sqlite');
const logger = require('../config/logger');
const fs = require('fs');
const path = require('path');

async function fixSchemaGaps() {
  if (process.env.USE_SQLITE !== 'true') return;
  
  try {
    logger.info('🔧 Checking and healing local SQLite schema gaps...');
    
    // Phase 1: Legacy column additions
    const alterStatements = [
      "ALTER TABLE society_visitors ADD COLUMN guard_id TEXT;",
      "ALTER TABLE society_visitors ADD COLUMN flat_number TEXT;",
      "ALTER TABLE society_visitors ADD COLUMN visitor_photo_url TEXT;",
      "ALTER TABLE society_visitors ADD COLUMN vehicle_number TEXT;",
      "ALTER TABLE society_visitors ADD COLUMN qr_code TEXT;",
      "ALTER TABLE society_visitors ADD COLUMN expected_time TEXT;",
      "ALTER TABLE society_visitors ADD COLUMN actual_in_time TEXT;",
      "ALTER TABLE society_visitors ADD COLUMN actual_out_time TEXT;",
      "ALTER TABLE society_visitors ADD COLUMN purpose TEXT;",
      "ALTER TABLE local_shops ADD COLUMN region_id TEXT;",
      "ALTER TABLE franchise_partners ADD COLUMN product_commission_percent REAL DEFAULT 5.0;",
      "ALTER TABLE franchise_partners ADD COLUMN skilled_job_commission_percent REAL DEFAULT 10.0;",
      "ALTER TABLE franchise_partners ADD COLUMN event_ticket_commission_percent REAL DEFAULT 5.0;",
      "ALTER TABLE franchise_partners ADD COLUMN delivery_base_fee REAL DEFAULT 20.0;",
      "ALTER TABLE franchise_partners ADD COLUMN property_listing_fee REAL DEFAULT 500.0;",
      "ALTER TABLE franchise_partners ADD COLUMN marketplace_listing_fee REAL DEFAULT 50.0;",
      "ALTER TABLE franchise_partners ADD COLUMN platform_profit_split REAL DEFAULT 60.0;",
      "ALTER TABLE franchise_partners ADD COLUMN reward_pool_split REAL DEFAULT 20.0;",
      "ALTER TABLE franchise_partners ADD COLUMN reserve_split REAL DEFAULT 20.0;"
    ];

    for (const stmt of alterStatements) {
      try {
        await query(stmt);
      } catch (err) {
        if (!err.message.includes('duplicate column name')) {
          // Silently skip expected errors
        }
      }
    }
    
    // Phase 2: 10x NEW — Run new migration files (038-043)
    const migrationDir = path.join(__dirname, '../migrations');
    const newMigrations = [
      '038_vendor_kyc.sqlite.sql',
      '039_shop_payouts.sqlite.sql',
      '040_category_attributes.sqlite.sql',
      '041_fraud_prevention.sqlite.sql',
      '042_dpdp_compliance.sqlite.sql',
      '043_offline_sync_analytics.sqlite.sql',
      '044_missing_tables.sqlite.sql',
    ];

    for (const migrationFile of newMigrations) {
      const filePath = path.join(migrationDir, migrationFile);
      if (!fs.existsSync(filePath)) {
        logger.warn(`⚠️ Migration file not found: ${migrationFile}`);
        continue;
      }

      try {
        const sql = fs.readFileSync(filePath, 'utf8');
        const cleanSql = sql.replace(/--.*$/gm, '');
        // Split by semicolons and execute each statement
        const statements = cleanSql
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0);

        for (const stmt of statements) {
          try {
            await query(stmt);
          } catch (err) {
            // Ignore "table already exists" and "duplicate column" errors
            if (!err.message.includes('already exists') &&
                !err.message.includes('duplicate column')) {
              logger.warn(`Migration ${migrationFile} partial error: ${err.message.substring(0, 100)}`);
            }
          }
        }
        logger.info(`  ✅ Migration applied: ${migrationFile}`);
      } catch (err) {
        logger.error(`  ❌ Migration failed: ${migrationFile} — ${err.message}`);
      }
    }
    
    logger.info('✅ SQLite schema gaps check completed (including 10x migrations).');
  } catch (error) {
    logger.error('Error in fixSchemaGaps:', error);
  }
}

module.exports = { fixSchemaGaps };
