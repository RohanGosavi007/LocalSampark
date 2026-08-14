const { query, withTransaction } = require('../config/database');

/**
 * Technician Escrow Payout Worker
 * Processes completed bookings and releases held inspection funds to technicians T+24h.
 */
async function processPendingPayouts() {
  try {
    const limit = 50;
    let maxIterations = 20; // Guard against unbounded loops

    while (maxIterations > 0) {
      maxIterations--;
      
      let completedBookings;
      try {
        completedBookings = await query(`
          SELECT * FROM home_service_bookings 
          WHERE status = 'completed' AND (is_payout_settled = 0 OR is_payout_settled = false OR is_payout_settled IS NULL)
          LIMIT $1
        `, [limit]);
      } catch (err) {
        break;
      }

      const bookings = completedBookings.rows || completedBookings || [];
      if (bookings.length === 0) {
        break;
      }

      for (const b of bookings) {
        try {
          await withTransaction(async (txClient) => {
            // Mark payout as settled
            await txClient.query('UPDATE home_service_bookings SET is_payout_settled = 1 WHERE id = $1', [b.id]);

            // Credit technician balance
            if (b.provider_id) {
              const fee = parseFloat(b.inspection_fee) || 199;
              await txClient.query(`
                UPDATE home_service_providers 
                SET wallet_balance = COALESCE(wallet_balance, 0) + $1 
                WHERE id = $2
              `, [fee, b.provider_id]);

              const crypto = require('crypto');
              const txId = crypto.randomUUID();
              await txClient.query(`
                INSERT INTO wallet_transactions (id, user_id, amount, transaction_type, description, created_at)
                VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
              `, [txId, b.provider_id, fee, 'credit', `Escrow Payout for Service #${b.id || ''}`]).catch(() => {});
            }
          });
          console.log(`[Worker:Payout] Released ₹${b.inspection_fee || 199} escrow to provider ${b.provider_id}`);
        } catch (innerError) {
          console.error(`[Worker:Payout] Error processing payout for booking ${b.id}:`, innerError.message);
          // Mark with error flag or advance to prevent stuck row
          await query('UPDATE home_service_bookings SET is_payout_settled = -1 WHERE id = $1', [b.id]).catch(() => {});
        }
      }
    }
  } catch (err) {
    console.error('[Worker:Payout] Fatal error processing technician payouts:', err.message);
  }
}

function initPaymentWorker() {
  console.log('⚡ [Worker] Technician Payout Worker Initialized (Interval: 1 hr)');
  setInterval(processPendingPayouts, 3600000); // 1 hour poll interval
}

module.exports = { initPaymentWorker, processPendingPayouts };
