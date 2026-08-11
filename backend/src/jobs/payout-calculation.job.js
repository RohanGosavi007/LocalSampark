/**
 * ═══════════════════════════════════════════════════════════════════════
 * Payout Calculation — Daily Cron Job
 * 10x Plan: Section 20.2.3 — Automated Payout Engine
 * 
 * Runs daily at 2 AM to calculate payouts for the previous day
 * ═══════════════════════════════════════════════════════════════════════
 */
const cron = require('node-cron');
const PayoutService = require('../services/payout.service');
const logger = require('../config/logger');

// Run daily at 2:00 AM
cron.schedule('0 2 * * *', async () => {
  logger.info('💰 Starting daily payout calculation...');

  try {
    // Calculate payouts for yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const periodStart = yesterday.toISOString().split('T')[0] + 'T00:00:00.000Z';
    const periodEnd = yesterday.toISOString().split('T')[0] + 'T23:59:59.999Z';

    const payouts = await PayoutService.calculatePayouts(periodStart, periodEnd);
    const validPayouts = payouts.filter(Boolean);

    const totalAmount = validPayouts.reduce((sum, p) => sum + p.netPayout, 0);

    logger.info(
      `✅ Daily payouts calculated: ${validPayouts.length} shops, ` +
      `₹${totalAmount.toLocaleString('en-IN')} total net payout`
    );
  } catch (error) {
    logger.error('❌ Payout calculation cron failed: ' + error.message);
  }
});

logger.info('📅 Payout calculation cron scheduled (daily at 2:00 AM)');
