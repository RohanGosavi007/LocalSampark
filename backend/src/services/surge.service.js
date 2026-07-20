const pool = require('../config/database');

/**
 * AI Surge Pricing Service
 * Predicts and suggests dynamic surge multipliers for service-based shops.
 */
class SurgePricingService {
  async getSurgeSuggestion(shopId) {
    try {
      // Get the shop category to see if it's a service category
      const { rows: shopRows } = await pool.query(
        `SELECT shop_category_slug FROM shops WHERE id = $1`,
        [shopId]
      );
      if (shopRows.length === 0) return { multiplier: 1.0, reason: 'Shop not found' };
      
      const slug = shopRows[0].shop_category_slug;
      
      // We only apply surge to heavy service categories (plumbers, electricians, carpool)
      const serviceCategories = ['plumbers', 'electricians', 'carpool-rides', 'mechanics'];
      if (!serviceCategories.includes(slug)) {
        return { multiplier: 1.0, reason: 'Not a surge-eligible category' };
      }

      // 1. Time of Day factor (higher demand in evenings 6PM-9PM)
      const currentHour = new Date().getHours();
      let timeMultiplier = 1.0;
      if (currentHour >= 18 && currentHour <= 21) {
        timeMultiplier = 1.3;
      }

      // 2. Recent Demand Factor (orders in the last 2 hours)
      const { rows: orderRows } = await pool.query(
        `SELECT COUNT(*) as recent_orders FROM orders WHERE shop_id = $1 AND created_at >= NOW() - INTERVAL '2 hours'`,
        [shopId]
      );
      const recentOrders = parseInt(orderRows[0].recent_orders, 10);
      let demandMultiplier = 1.0;
      if (recentOrders > 10) demandMultiplier = 1.5;
      else if (recentOrders > 5) demandMultiplier = 1.2;

      // Calculate final
      let finalMultiplier = Math.max(timeMultiplier, demandMultiplier);
      
      let reason = 'Normal Demand';
      if (finalMultiplier >= 1.5) reason = 'Extremely High Demand in your area';
      else if (finalMultiplier > 1.0) reason = 'Peak Hours - Higher Footfall';

      return { multiplier: finalMultiplier, reason };
    } catch (err) {
      console.error('Surge Pricing Error:', err);
      return { multiplier: 1.0, reason: 'Error calculating surge' };
    }
  }
}

module.exports = new SurgePricingService();
