const cron = require('../utils/cron');
const { queryMany } = require('../config/database');
const notifications = require('../modules/core/services/notification.service');
const { sqlDate, dayOf } = require('../utils/sqlTime');

// Run daily at 9:00 AM to check for expiring leases and police verifications
cron.schedule('0 9 * * *', async () => {
    console.log('[Job] Running Lease & Police Verification Expiry Reminder...');
    try {
        // The target day is bound rather than written as date('now', '+30
        // days'), which only SQLite understands.
        const inThirtyDays = sqlDate(30);

        // Find police verifications expiring in exactly 30 days
        const expiringVerifications = await queryMany(`
            SELECT id, society_id, flat_number, person_name, person_type, expiry_date
            FROM society_police_verification
            WHERE status = 'verified'
            AND ${dayOf('expiry_date')} = $1
        `, [inThirtyDays]);

        for (const record of expiringVerifications) {
            console.log(`[Alert] Police verification for ${record.person_name} (${record.flat_number}) expires in 30 days.`);

            // Notify flat owner (assume member_id is fetched via flat_number)
            const members = await queryMany('SELECT user_id FROM society_members WHERE society_id = $1 AND flat_number = $2', [record.society_id, record.flat_number]);

            for (const member of members) {
                // Through the notification service, so it reaches the
                // resident's inbox. This was a local stub that only logged.
                await notifications.sendToUser(member.user_id, {
                    type: 'system',
                    title: 'Verification Expiring Soon',
                    body: `The police verification for ${record.person_name} (${record.person_type}) at Flat ${record.flat_number} expires in 30 days. Please renew.`,
                    data: { verification_id: record.id, society_id: record.society_id, flat_number: record.flat_number },
                });
            }
        }

        // Also check lease expiries from flat ledger
        const expiringLeases = await queryMany(`
            SELECT society_id, flat_number, tenant_name, member_id
            FROM society_flat_ledger
            WHERE is_tenant = '1'
            AND ${dayOf('tenant_lease_end')} = $1
        `, [inThirtyDays]);

        for (const lease of expiringLeases) {
            console.log(`[Alert] Lease for ${lease.tenant_name} (${lease.flat_number}) expires in 30 days.`);
            if (!lease.member_id) continue;
            // Notify flat owner
            await notifications.sendToUser(lease.member_id, {
                type: 'system',
                title: 'Tenant Lease Expiring Soon',
                body: `The lease for ${lease.tenant_name} at Flat ${lease.flat_number} expires in 30 days. Please renew the contract.`,
                data: { society_id: lease.society_id, flat_number: lease.flat_number },
            });
        }

    } catch (error) {
        console.error('[Job Error] Expiry reminder failed:', error);
    }
});
