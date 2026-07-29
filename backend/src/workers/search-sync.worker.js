const { Worker } = require('bullmq');
const SearchEngine = require('../services/search.engine');
const { queryOne } = require('../../../config/database');

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT || 6379;

/**
 * Background worker to continuously sync PostgreSQL shop updates into Typesense
 */
const searchSyncWorker = new Worker('search-sync', async (job) => {
  const { event, shopId, payload } = job.data;
  console.log(`[SearchSync] Processing ${event} for shop ${shopId}`);

  try {
    if (event === 'shop_created' || event === 'shop_updated') {
      let shopToIndex = payload;
      
      // If full payload isn't provided, fetch it
      if (!shopToIndex || !shopToIndex.location) {
        const dbShop = await queryOne(`SELECT * FROM local_shops WHERE id = $1`, [shopId]);
        if (dbShop) shopToIndex = dbShop;
      }

      if (shopToIndex) {
        await SearchEngine.indexShop(shopToIndex);
      }
    } else if (event === 'shop_deleted') {
      // In a real implementation, we would call a SearchEngine.deleteShop method here.
      console.log(`[SearchSync] Shop ${shopId} deletion sync not yet implemented in Engine.`);
    }
    
    return { success: true };
  } catch (error) {
    console.error(`[SearchSync] Failed to process job ${job.id}:`, error.message);
    throw error; // Let BullMQ handle retries
  }
}, {
  connection: {
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: process.env.REDIS_PASSWORD || undefined,
  }
});

searchSyncWorker.on('failed', (job, err) => {
  console.error(`[SearchSync] Job ${job.id} failed:`, err.message);
});

module.exports = searchSyncWorker;
