const cron = require('node-cron');
const { query } = require('../config/database');
const { sendTopicPush, sendPushNotification } = require('../config/firebase');

// Run every 5 minutes
cron.schedule('*/5 * * * *', async () => {
    try {
        const queryStr = `
            SELECT id, society_id, flat_number, visitor_name, checked_in_at, max_stay_minutes 
            FROM society_visitors 
            WHERE status = 'checked_in' 
            AND (overstay_alert_sent = 0 OR overstay_alert_sent = false OR overstay_alert_sent IS NULL)
        `;
        
        let result;
        try {
            result = await query(queryStr);
        } catch (e) {
            return; // Table not active yet
        }
        
        const visitors = result.rows || result || [];
        const now = Date.now();

        for (const visitor of visitors) {
            try {
                if (!visitor.checked_in_at) continue;
                const checkInTime = new Date(visitor.checked_in_at).getTime();
                const maxMinutes = parseInt(visitor.max_stay_minutes, 10) || 60;
                const allowedDurationMs = maxMinutes * 60 * 1000;

                // Check if visitor has overstayed
                if (now > (checkInTime + allowedDurationMs)) {
                    console.log(`[Alert] Visitor ${visitor.visitor_name} (Flat ${visitor.flat_number}) has overstayed!`);
                    
                    // Mark as alert sent
                    await query('UPDATE society_visitors SET overstay_alert_sent = true WHERE id = $1', [visitor.id]);

                    // Notify Guard Channel
                    await sendTopicPush('guard_channel_' + visitor.society_id, 'Visitor Overstay Alert', `${visitor.visitor_name} at Flat ${visitor.flat_number} has exceeded their ${maxMinutes} min limit.`);

                    // Notify Resident
                    try {
                        const member = await query('SELECT user_id FROM society_members WHERE society_id = $1 AND flat_number = $2', [visitor.society_id, visitor.flat_number]);
                        const memberRows = member.rows || member || [];
                        if (memberRows.length > 0 && memberRows[0].user_id) {
                            await sendTopicPush(`user_${memberRows[0].user_id}`, 'Visitor Still Here?', `Your visitor ${visitor.visitor_name} has exceeded their time limit. Have they left?`);
                        }
                    } catch (memberErr) {}
                }
            } catch (innerError) {
                console.error(`[Job Error] Failed to process overstay for visitor ${visitor.id}:`, innerError.message);
            }
        }
    } catch (error) {
        console.error('[Job Error] Overstay monitor failed:', error.message);
    }
});
