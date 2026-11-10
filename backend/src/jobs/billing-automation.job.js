const logger = require('../config/logger.js');
const cron = require('../utils/cron');
const { query, queryMany } = require('../config/database');
const billingService = require('../modules/community/services/billing-engine.service');
const { sqlDate } = require('../utils/sqlTime');

// Run daily at midnight to check for overdue bills and apply penalties
cron.schedule('0 0 * * *', async () => {
    logger.info('[Job] Running Daily Billing Automation Job...');
    try {
        const queryStr = `
            SELECT id, society_id, flat_number 
            FROM society_maintenance_bills 
            WHERE payment_status != 'paid' 
            AND due_date < $1
        `;
        
        // due_date is TEXT on PostgreSQL; compared with today's date as a value.
        const overdueBills = await queryMany(queryStr, [sqlDate()]);

        for (const bill of overdueBills) {
            // Apply simple interest penalty
            const penalty = await billingService.calculateLatePenalty(bill.id);
            
            if (penalty > 0) {
                // Upsert to penalty ledger
                const existing = await query('SELECT id FROM society_penalty_ledger WHERE bill_id = $1', [bill.id]);
                if (existing.rows && existing.rows.length > 0) {
                    await query('UPDATE society_penalty_ledger SET penalty_amount = $1, amount = $1 WHERE bill_id = $2', [penalty, bill.id]);
                } else {
                    const id = require('uuid').v4();
                    await query(
                        `INSERT INTO society_penalty_ledger 
                        (id, society_id, bill_id, flat_number, amount, principal_overdue, interest_rate, days_overdue, penalty_amount)
                        VALUES ($1, $2, $3, $4, $6, (SELECT (total_amount - paid_amount) FROM society_maintenance_bills WHERE id = $5), 18, 1, $6)`,
                        [id, bill.society_id, bill.id, bill.flat_number, bill.id, penalty]
                    );
                }
            }
        }
        
        logger.info(`[Job] Processed ${overdueBills.length} overdue bills.`);
    } catch (error) {
        console.error('[Job Error] Billing automation failed:', error);
    }
});

// Run on the 1st of every month to generate bills (Simulated)
cron.schedule('0 0 1 * *', async () => {
    logger.info('[Job] Monthly Bill Generation Started...');
    try {
        const societies = await queryMany('SELECT id FROM societies WHERE is_active = true');
        const month = new Date().getMonth() + 1;
        const year = new Date().getFullYear();

        for (const soc of societies) {
            // Check if bills already generated for this month
            const exists = await query('SELECT id FROM society_maintenance_bills WHERE society_id = $1 AND month = $2 AND year = $3 LIMIT 1', [soc.id, month, year]);
            if (!exists.rows || exists.rows.length === 0) {
                await billingService.generateMonthlyInvoices(soc.id, month, year);
                logger.info(`[Job] Generated bills for society ${soc.id}`);
            }
        }
    } catch (error) {
        console.error('[Job Error] Bill generation failed:', error);
    }
});
