const { Queue, Worker } = require('bullmq');
const pool = require('../config/database');
const redisConfig = { connection: { host: process.env.REDIS_HOST || '127.0.0.1', port: process.env.REDIS_PORT || 6379 } };

const campaignQueue = new Queue('campaigns', redisConfig);

const campaignWorker = new Worker('campaigns', async job => {
  if (job.name === 'activate-scheduled') {
    try {
      // Find campaigns where start_datetime <= NOW() and status = 'scheduled'
      const { rows } = await pool.query(
        `UPDATE shop_campaigns 
         SET status = 'active' 
         WHERE status = 'scheduled' AND start_datetime <= NOW() 
         RETURNING *`
      );

      for (const campaign of rows) {
        console.log(`[BullMQ] Activated campaign ${campaign.id} for shop ${campaign.shop_id}`);
        // Here we would trigger Firebase Cloud Messaging (FCM) notifications
        // to users within campaign.radius_km
      }
    } catch (err) {
      console.error('[BullMQ] Campaign Activation Error:', err);
    }
  }

  if (job.name === 'end-active') {
    try {
      await pool.query(
        `UPDATE shop_campaigns 
         SET status = 'completed' 
         WHERE status = 'active' AND end_datetime <= NOW()`
      );
    } catch (err) {
      console.error('[BullMQ] Campaign End Error:', err);
    }
  }
}, redisConfig);

// Schedule repeatable jobs every 5 minutes
campaignQueue.add('activate-scheduled', {}, { repeat: { every: 300000 } });
campaignQueue.add('end-active', {}, { repeat: { every: 300000 } });

module.exports = { campaignQueue, campaignWorker };
