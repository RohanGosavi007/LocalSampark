const cron = require('node-cron');
const { query, queryMany } = require('../config/database.sqlite');
// Mock FCM
const sendPushNotification = async (userId, payload) => {
    console.log(`[FCM Alert] Sending push to admin ${userId}:`, payload.title);
};

// Run daily at 10:00 AM
cron.schedule('0 10 * * *', async () => {
    console.log('[Job] Running AMC Expiry Alert Job...');
    try {
        const expiringAssets = await queryMany(`
            SELECT id, society_id, asset_name, amc_end_date, amc_vendor_id 
            FROM society_assets 
            WHERE status = 'operational' 
            AND amc_end_date IS NOT NULL
            AND date(amc_end_date) = date('now', '+45 days')
        `);

        for (const asset of expiringAssets) {
            console.log(`[Alert] AMC for asset ${asset.asset_name} expires in 45 days.`);
            
            // Notify Facility Managers
            const facilityAdmins = await queryMany(`
                SELECT user_id FROM society_admin_roles 
                WHERE society_id = ? AND is_active = 1 
                AND json_extract(permissions, '$.assets') = 1
            `, [asset.society_id]);
            
            for (const admin of facilityAdmins) {
                await sendPushNotification(admin.user_id, {
                    title: 'AMC Expiring Soon',
                    body: `The Annual Maintenance Contract for ${asset.asset_name} expires in 45 days. Please contact the vendor.`
                });
            }
        }
    } catch (error) {
        console.error('[Job Error] AMC expiry alert failed:', error);
    }
});
