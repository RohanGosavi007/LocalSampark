const { query } = require('../config/database');

/**
 * Event Expiration Worker
 * Scans past events and updates ticket states.
 */
async function processExpiredEvents() {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    
    // 1. Mark past events as completed
    await query(`
      UPDATE local_events 
      SET is_active = 0 
      WHERE event_date < $1 AND is_active = 1
    `, [todayStr]);

    // 2. Mark past unused tickets as expired
    await query(`
      UPDATE event_tickets 
      SET status = 'expired' 
      WHERE status = 'confirmed' AND event_id IN (
        SELECT id FROM local_events WHERE event_date < $1
      )
    `, [todayStr]);

    console.log('[Worker:Event] Event & Ticket expiration check completed cleanly.');
  } catch (err) {
    console.error('[Worker:Event] Error processing expired events:', err.message);
  }
}

function initEventWorker() {
  console.log('⚡ [Worker] Event Ticket Expiration Worker Initialized (Interval: 6 hrs)');
  setInterval(processExpiredEvents, 21600000); // 6 hour poll interval
}

module.exports = { initEventWorker, processExpiredEvents };
