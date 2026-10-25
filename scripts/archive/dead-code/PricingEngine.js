const { query, queryOne } = require('../config/database');

/**
 * Dynamic Pricing Engine
 * Calculates Platform Commission vs. Lead Fees based on category and transaction value.
 */
async function calculateBreakdown({ shopId, cartTotal, pincode }) {
  try {
    const shop = await queryOne(
      `SELECT s.id, s.category_id, s.commission_override_percent, c.name as category_name
       FROM local_shops s
       LEFT JOIN shop_categories c ON s.category_id = c.id
       WHERE s.id = $1`,
      [shopId]
    );

    if (!shop) {
      throw new Error(`Shop not found: ${shopId}`);
    }

    let platformCommission = 0;
    let vendorNetEarnings = 0;
    let feeType = 'PERCENTAGE_COMMISSION';

    const categoryName = (shop.category_name || '').toLowerCase();
    const isLeadBased = categoryName.includes('property') || categoryName.includes('job') || categoryName.includes('event');

    if (isLeadBased) {
      feeType = 'LEAD_FEE';
      platformCommission = 500; // Flat lead fee of ₹500
      vendorNetEarnings = Math.max(0, cartTotal - platformCommission);
    } else {
      // Percentage commission model (default 2% unless override exists)
      const commissionPercent = shop.commission_override_percent !== null && shop.commission_override_percent !== undefined
        ? parseFloat(shop.commission_override_percent)
        : 2.0;

      platformCommission = (cartTotal * commissionPercent) / 100;
      vendorNetEarnings = cartTotal - platformCommission;
    }

    // Lookup Franchise Partner for given pincode
    let franchiseId = null;
    let franchiseCommission = 0;

    if (pincode) {
      const franchise = await queryOne(
        `SELECT id, commission_share_percent FROM franchise_partners WHERE territory_pincode = $1 AND status = 'active'`,
        [pincode]
      );
      if (franchise) {
        franchiseId = franchise.id;
        const franchiseSharePercent = parseFloat(franchise.commission_share_percent || 10.0); // Default 10% of platform cut
        franchiseCommission = (platformCommission * franchiseSharePercent) / 100;
      }
    }

    return {
      cartTotal,
      feeType,
      platformCommission: parseFloat(platformCommission.toFixed(2)),
      franchiseCommission: parseFloat(franchiseCommission.toFixed(2)),
      vendorNetEarnings: parseFloat(vendorNetEarnings.toFixed(2)),
      franchiseId
    };
  } catch (error) {
    console.error('PricingEngine Error:', error);
    throw error;
  }
}

module.exports = {
  calculateBreakdown
};
