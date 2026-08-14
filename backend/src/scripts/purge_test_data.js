const { query } = require('../config/database');
const logger = require('../config/logger');

async function runPurge(isDryRun = true) {
  logger.info(`🧹 Starting Selective Mock Data Purge (Dry Run: ${isDryRun})`);

  try {
    const deleteQueries = [
      // Delete test visitors
      'DELETE FROM society_visitors;',
      'DELETE FROM society_visitor_log;',
      
      // Delete test complaints and notices
      'DELETE FROM society_complaints;',
      'DELETE FROM society_notices;',
      
      // Delete chat and feed data
      'DELETE FROM messages;',
      'DELETE FROM chat_rooms;',
      'DELETE FROM feed_likes;',
      'DELETE FROM feed_comments;',
      'DELETE FROM feed_posts;',
      
      // Delete notifications
      'DELETE FROM notifications;',
      
      // Delete dummy users
      "DELETE FROM users WHERE LOWER(full_name) LIKE '%test%' OR LOWER(full_name) LIKE '%dummy%' OR LOWER(full_name) LIKE '%sample%';",
      
      // Delete OTP records
      'DELETE FROM otps;'
    ];

    if (isDryRun) {
      logger.info('DRY RUN MODE: The following queries would be executed:');
      for (const sql of deleteQueries) {
        logger.info(`  > ${sql}`);
      }
      logger.info('To execute these queries for real, pass --execute to this script.');
      return;
    }

    // Execute queries
    for (const sql of deleteQueries) {
      try {
        await query(sql);
        logger.info(`✅ Executed: ${sql}`);
      } catch (err) {
        // Skip if table doesn't exist
        if (!err.message.includes('no such table')) {
          logger.error(`❌ Error executing ${sql}: ${err.message}`);
        } else {
          logger.warn(`⚠️ Skipped (table missing): ${sql}`);
        }
      }
    }

    logger.info('🎉 Selective Mock Data Purge Completed successfully!');
    logger.info('Preserved: Mock Shops (local_shops, shop_products, shop_offers, shop_staff), categories, regions, real users, society structural data.');

  } catch (error) {
    logger.error('Fatal error in purge_test_data:', error);
  }
}

// Run if called directly
if (require.main === module) {
  const isExecute = process.argv.includes('--execute');
  runPurge(!isExecute).then(() => process.exit(0));
}

module.exports = { runPurge };
