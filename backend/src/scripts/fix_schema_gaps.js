const { query } = require('../config/database.sqlite');
const logger = require('../config/logger');

async function fixSchemaGaps() {
  if (process.env.USE_SQLITE !== 'true') return;
  
  try {
    logger.info('🔧 Checking and healing local SQLite schema gaps...');
    
    const alterStatements = [
      "ALTER TABLE society_visitors ADD COLUMN guard_id TEXT;",
      "ALTER TABLE society_visitors ADD COLUMN flat_number TEXT;",
      "ALTER TABLE society_visitors ADD COLUMN visitor_photo_url TEXT;",
      "ALTER TABLE society_visitors ADD COLUMN vehicle_number TEXT;",
      "ALTER TABLE society_visitors ADD COLUMN qr_code TEXT;",
      "ALTER TABLE society_visitors ADD COLUMN expected_time TEXT;",
      "ALTER TABLE society_visitors ADD COLUMN actual_in_time TEXT;",
      "ALTER TABLE society_visitors ADD COLUMN actual_out_time TEXT;",
      "ALTER TABLE society_visitors ADD COLUMN purpose TEXT;"
    ];

    for (const stmt of alterStatements) {
      try {
        await query(stmt);
      } catch (err) {
        // Ignore "duplicate column name" errors
        if (!err.message.includes('duplicate column name')) {
          logger.warn(`Could not execute ${stmt}: ${err.message}`);
        }
      }
    }
    
    logger.info('✅ SQLite schema gaps check completed.');
  } catch (error) {
    logger.error('Error in fixSchemaGaps:', error);
  }
}

module.exports = { fixSchemaGaps };
