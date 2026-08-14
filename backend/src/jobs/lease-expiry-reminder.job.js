const cron = require('node-cron');
const { query, queryMany } = require('../config/database');
// Mock FCM
const sendPushNotification = async (userId, payload) => {
    console.log(`[FCM Alert] Sending push to user ${userId}:`, payload.title);
};

// Run daily at 9:00 AM to check for expiring leases and police verifications
cron.schedule('0 9 * * *', async () => {
    console.log('[Job] Running Lease & Police Verification Expiry Reminder...');
    try {
        // Find police verifications expiring in exactly 30 days
        const expiringVerifications = await queryMany(`
            SELECT id, society_id, flat_number, person_name, person_type, expiry_date 
            FROM society_police_verification 
            WHERE status = 'verified' 
            AND date(expiry_date) = date('now', '+30 days')
        `);

        for (const record of expiringVerifications) {
            console.log(`[Alert] Police verification for ${record.person_name} (${record.flat_number}) expires in 30 days.`);
            
            // Notify flat owner (assume member_id is fetched via flat_number)
            const members = await queryMany('SELECT user_id FROM society_members WHERE society_id = $1 AND flat_number = $2', [record.society_id, record.flat_number]);
            
            for (const member of members) {
                await sendPushNotification(member.user_id, {
                    title: 'Verification Expiring Soon',
                    body: `The police verification for ${record.person_name} (${record.person_type}) at Flat ${record.flat_number} expires in 30 days. Please renew.`
                });
            }
        }
        
        // Also check lease expiries from flat ledger
        const expiringLeases = await queryMany(`
            SELECT society_id, flat_number, tenant_name, member_id 
            FROM society_flat_ledger 
            WHERE is_tenant = true 
            AND date(tenant_lease_end) = date('now', '+30 days')
        `);
        
        for (const lease of expiringLeases) {
            console.log(`[Alert] Lease for ${lease.tenant_name} (${lease.flat_number}) expires in 30 days.`);
            // Notify flat owner
            await sendPushNotification(lease.member_id, {
                title: 'Tenant Lease Expiring Soon',
                body: `The lease for ${lease.tenant_name} at Flat ${lease.flat_number} expires in 30 days. Please renew the contract.`
            });
        }
        
    } catch (error) {
        console.error('[Job Error] Expiry reminder failed:', error);
    }
});
