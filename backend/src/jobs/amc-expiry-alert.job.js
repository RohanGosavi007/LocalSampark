const cron = require('../utils/cron');
const { queryMany } = require('../config/database');
const notifications = require('../modules/core/services/notification.service');
const { sqlDate, dayOf } = require('../utils/sqlTime');

/**
 * Does this role's permissions blob grant the assets area?
 *
 * This was `json_extract(permissions, '$.assets') = 1` in the query, a SQLite
 * function PostgreSQL does not have. The column holds JSON text on one engine
 * and may arrive already parsed on the other, so it is read here instead.
 */
function grantsAssets(permissions) {
    let parsed = permissions;
    if (typeof permissions === 'string') {
        try { parsed = JSON.parse(permissions); } catch { return false; }
    }
    return Boolean(parsed) && (parsed.assets === true || parsed.assets === 1);
}

// Run daily at 10:00 AM
cron.schedule('0 10 * * *', async () => {
    console.log('[Job] Running AMC Expiry Alert Job...');
    try {
        // The target day is bound rather than written as date('now', '+45
        // days'), which only SQLite understands.
        const expiringAssets = await queryMany(`
            SELECT id, society_id, asset_name, amc_end_date, amc_vendor_id
            FROM society_assets
            WHERE status = 'operational'
            AND amc_end_date IS NOT NULL
            AND ${dayOf('amc_end_date')} = $1
        `, [sqlDate(45)]);

        for (const asset of expiringAssets) {
            console.log(`[Alert] AMC for asset ${asset.asset_name} expires in 45 days.`);

            // Notify Facility Managers
            const roles = await queryMany(`
                SELECT user_id, permissions FROM society_admin_roles
                WHERE society_id = $1 AND is_active = '1'
            `, [asset.society_id]);
            const facilityAdmins = roles.filter((role) => grantsAssets(role.permissions));

            for (const admin of facilityAdmins) {
                // Through the notification service, so it reaches the admin's
                // inbox. This was a local stub that wrote a line to the server
                // log and delivered nothing to anyone.
                await notifications.sendToUser(admin.user_id, {
                    type: 'system',
                    title: 'AMC Expiring Soon',
                    body: `The Annual Maintenance Contract for ${asset.asset_name} expires in 45 days. Please contact the vendor.`,
                    data: { asset_id: asset.id, society_id: asset.society_id, amc_end_date: asset.amc_end_date },
                });
            }
        }
    } catch (error) {
        console.error('[Job Error] AMC expiry alert failed:', error);
    }
});

module.exports = { grantsAssets };
