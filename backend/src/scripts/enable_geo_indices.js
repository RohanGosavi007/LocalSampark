const { query, pool } = require('../config/database');
const logger = require('../config/logger');

async function enableGeoIndices() {
  try {
    if (process.env.USE_SQLITE === 'true') {
      logger.warn('Skipping geospatial indexing for SQLite. Earthdistance is PostgreSQL only.');
      return;
    }

    logger.info('Enabling PostgreSQL cube and earthdistance extensions...');
    await query('CREATE EXTENSION IF NOT EXISTS cube;');
    await query('CREATE EXTENSION IF NOT EXISTS earthdistance;');
    
    logger.info('Creating GiST index on local_shops...');
    await query('CREATE INDEX IF NOT EXISTS idx_shops_location ON local_shops USING gist (ll_to_earth(latitude, longitude));');
    
    logger.info('Creating GiST index on regions...');
    await query('CREATE INDEX IF NOT EXISTS idx_regions_location ON regions USING gist (ll_to_earth(latitude, longitude));');
    
    logger.info('Creating GiST index on user_addresses...');
    await query('CREATE INDEX IF NOT EXISTS idx_addresses_location ON user_addresses USING gist (ll_to_earth(latitude, longitude));');

    logger.info('✅ Geospatial indices created successfully!');
  } catch (error) {
    logger.error('❌ Failed to create geospatial indices: ' + error.message);
  } finally {
    if (pool) {
      if (typeof pool.end === 'function') {
         await pool.end();
      } else if (typeof pool.close === 'function') {
         await pool.close();
      }
    }
    process.exit(0);
  }
}

enableGeoIndices();
