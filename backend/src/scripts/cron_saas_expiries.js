require('dotenv').config();
const { query } = require('../../config/database');

async function checkExpiries() {
    console.log('Starting SaaS expiry check...');
    try {
        const now = new Date().toISOString();
        
        // Find shops where premium_expires_at is strictly in the past, and commission_override_percent is currently 0
        const result = await query(
            `UPDATE local_shops 
             SET commission_override_percent = NULL, 
                 is_premium = false 
             WHERE premium_expires_at IS NOT NULL 
               AND premium_expires_at < $1 
               AND commission_override_percent = 0
             RETURNING id, name`,
            [now]
        );
        
        const updatedShops = result.rows || result || [];
        
        console.log(`Reverted SaaS plan to standard commission for ${updatedShops.length} shop(s).`);
        updatedShops.forEach(shop => console.log(`- Shop ID: ${shop.id} (${shop.name})`));
        
    } catch (err) {
        console.error('Error checking SaaS expiries:', err);
    } finally {
        process.exit(0);
    }
}

checkExpiries();
