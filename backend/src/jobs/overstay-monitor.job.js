const cron = require('node-cron');
const { query } = require('../config/database');
// Mock FCM
const sendPushNotification = async (userId, payload) => {
    console.log(`[FCM Alert] Sending push to user ${userId}:`, payload.title);
};

// Run every 5 minutes
cron.schedule('*/5 * * * *', async () => {
    console.log('[Job] Running Overstay Monitor Job...');
    try {
        const queryStr = `
            SELECT id, society_id, flat_number, visitor_name, checked_in_at, max_stay_minutes 
            FROM society_visitors 
            WHERE status = 'checked_in' 
            AND overstay_alert_sent = 0 
            AND checked_in_at + (max_stay_minutes || ' minutes')::interval < CURRENT_TIMESTAMP
        `;
        
        const result = await query(queryStr);
        const overstayers = result.rows || result;

        for (const visitor of overstayers) {
            try {
                console.log(`[Alert] Visitor ${visitor.visitor_name} (Flat ${visitor.flat_number}) has overstayed!`);
                
                // Mark as alert sent
                await query('UPDATE society_visitors SET overstay_alert_sent = 1 WHERE id = $1', [visitor.id]);

                // Notify Guard
                await sendPushNotification('guard_channel_' + visitor.society_id, {
                    title: 'Visitor Overstay Alert',
                    body: `${visitor.visitor_name} at Flat ${visitor.flat_number} has exceeded their ${visitor.max_stay_minutes} min limit.`
                });

                // Need resident user ID to notify resident, fetched through flat
                const member = await query('SELECT user_id FROM society_members WHERE society_id = $1 AND flat_number = $2', [visitor.society_id, visitor.flat_number]);
                if (member && member.rows && member.rows.length > 0) {
                    await sendPushNotification(member.rows[0].user_id, {
                        title: 'Visitor Still Here?',
                        body: `Your visitor ${visitor.visitor_name} has exceeded their time limit. Have they left?`
                    });
                }
            } catch (innerError) {
                console.error(`[Job Error] Failed to process overstay for visitor ${visitor.id}:`, innerError);
            }
        }
    } catch (error) {
        console.error('[Job Error] Overstay monitor failed:', error);
    }
});
