const { query } = require('../config/database');

async function runOptimizations() {
  console.log('Starting DB Index Optimizations for Production Hardening...');

  try {
    // Orders
    console.log('Optimizing orders table...');
    await query(`CREATE INDEX IF NOT EXISTS idx_orders_shop_id ON orders(shop_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);`);
    
    // Carpool
    console.log('Optimizing carpool_rides table...');
    await query(`CREATE INDEX IF NOT EXISTS idx_carpool_rides_driver_id ON carpool_rides(driver_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_carpool_rides_status ON carpool_rides(status);`);
    
    // Properties
    console.log('Optimizing properties table...');
    await query(`CREATE INDEX IF NOT EXISTS idx_properties_user_id ON properties(user_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_properties_type ON properties(listing_type);`);

    console.log('DB Optimizations Complete.');
  } catch (error) {
    console.error('Error running optimizations:', error);
  } finally {
    process.exit(0);
  }
}

runOptimizations();
