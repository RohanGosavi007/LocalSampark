const db = require('./backend/src/config/database');

async function run() {
  try {
    const columns = [
      { name: 'product_commission_percent', type: 'REAL' },
      { name: 'skilled_job_commission_percent', type: 'REAL' },
      { name: 'event_ticket_commission_percent', type: 'REAL' },
      { name: 'delivery_base_fee', type: 'REAL' },
      { name: 'property_listing_fee', type: 'REAL' },
      { name: 'marketplace_listing_fee', type: 'REAL' },
      { name: 'platform_profit_split', type: 'REAL' },
      { name: 'reward_pool_split', type: 'REAL' },
      { name: 'reserve_split', type: 'REAL' }
    ];

    for (const col of columns) {
      try {
        await db.query(`ALTER TABLE franchise_partners ADD COLUMN ${col.name} ${col.type}`);
        console.log(`Added column ${col.name}`);
      } catch (e) {
        if (e.message.includes('duplicate column name')) {
          console.log(`Column ${col.name} already exists`);
        } else {
          throw e;
        }
      }
    }
    console.log('Migration complete');
  } catch (err) {
    console.error('Migration failed', err);
  } finally {
    process.exit(0);
  }
}

run();
