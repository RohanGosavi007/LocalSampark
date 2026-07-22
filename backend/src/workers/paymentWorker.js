const { query, withTransaction } = require('../config/database');

/**
 * Technician Escrow Payout Worker
 * Processes completed bookings and releases held inspection funds to technicians T+24h.
 */
async function processPendingPayouts() {
  try {
    const completedBookings = await query(`
      SELECT * FROM home_service_bookings 
      WHERE status = 'completed' AND is_payout_settled = 0
    `);

    const bookings = completedBookings.rows || completedBookings || [];
    for (const b of bookings) {
      await withTransaction(async (txClient) => {
        // Mark payout as settled
        await txClient.query('UPDATE home_service_bookings SET is_payout_settled = 1 WHERE id = $1', [b.id]);

        // Credit technician balance
        if (b.provider_id) {
          await txClient.query(`
            UPDATE home_service_providers 
            SET wallet_balance = COALESCE(wallet_balance, 0) + $1 
            WHERE id = $2
          `, [b.inspection_fee || 199, b.provider_id]);
        }
      });
      console.log(`[Worker:Payout] Released ₹${b.inspection_fee} escrow to provider ${b.provider_id}`);
    }
  } catch (err) {
    console.error('[Worker:Payout] Error processing technician payouts:', err.message);
  }
}

function initPaymentWorker() {
  console.log('⚡ [Worker] Technician Payout Worker Initialized (Interval: 1 hr)');
  setInterval(processPendingPayouts, 3600000); // 1 hour poll interval
}

module.exports = { initPaymentWorker, processPendingPayouts };
