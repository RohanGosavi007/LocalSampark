const { query, queryOne } = require('../../../config/database');

/**
 * AI Surge Pricing Service
 * Predicts and suggests dynamic surge multipliers for service-based shops, delivery, and rides.
 */
class SurgePricingService {
  /**
   * Get dynamic surge suggestion for a shop or service
   * @param {string} shopId 
   * @returns {Promise<Object>} { multiplier, reason, timeMultiplier, demandMultiplier, maxCap }
   */
  async getSurgeSuggestion(shopId) {
    try {
      // 1. Fetch shop and category info
      const shop = await queryOne(
        `SELECT s.*, c.slug as category_slug, c.name as category_name
         FROM local_shops s
         LEFT JOIN shop_categories c ON s.category_id = c.id
         WHERE s.id = $1`,
        [shopId]
      );

      if (!shop) {
        return { multiplier: 1.0, reason: 'Shop not found', timeMultiplier: 1.0, demandMultiplier: 1.0 };
      }

      const slug = shop.category_slug || shop.category || '';
      
      // Surge eligible categories (plumbers, electricians, carpool, mechanics, emergency repair, home services)
      const serviceCategories = ['plumbers', 'electricians', 'carpool-rides', 'mechanics', 'home-services', 'repair', 'cleaning'];
      const isEligible = serviceCategories.some(cat => slug.toLowerCase().includes(cat));
      
      if (!isEligible && !shop.delivery_available) {
        return { multiplier: 1.0, reason: 'Standard Pricing - Category Not Surge-Eligible', timeMultiplier: 1.0, demandMultiplier: 1.0 };
      }

      // 2. Time of Day Peak Window Detection
      // Peak windows: Morning (8 AM - 10 AM), Evening (6 PM - 9 PM)
      const currentHour = new Date().getHours();
      let timeMultiplier = 1.0;
      if ((currentHour >= 8 && currentHour <= 10) || (currentHour >= 18 && currentHour <= 21)) {
        timeMultiplier = 1.25;
      } else if (currentHour >= 22 || currentHour <= 5) {
        // Late night surge
        timeMultiplier = 1.35;
      }

      // 3. Recent Demand Factor (orders/appointments in the last 2 hours)
      let recentOrdersCount = 0;
      try {
        const orderRes = await queryOne(
          `SELECT COUNT(*) as recent_count FROM shop_orders WHERE shop_id = $1 AND (created_at >= NOW() - INTERVAL '2 hours' OR created_at >= datetime('now', '-2 hours'))`,
          [shopId]
        );
        recentOrdersCount = parseInt(orderRes?.recent_count || 0, 10);
      } catch (e) {
        // SQLite fallback or alternate table
        try {
          const orderRes = await queryOne(
            `SELECT COUNT(*) as recent_count FROM shop_orders WHERE shop_id = $1`,
            [shopId]
          );
          recentOrdersCount = parseInt(orderRes?.recent_count || 0, 10);
        } catch (err) {}
      }

      let demandMultiplier = 1.0;
      if (recentOrdersCount >= 10) demandMultiplier = 1.6;
      else if (recentOrdersCount >= 5) demandMultiplier = 1.3;
      else if (recentOrdersCount >= 2) demandMultiplier = 1.15;

      // 4. Fetch Admin Configured Surge Cap
      let maxCap = 2.5; // Default safety cap
      try {
        const configRow = await queryOne(
          "SELECT config_value FROM admin_config WHERE config_key = 'max_surge_multiplier'"
        );
        if (configRow?.config_value) {
          maxCap = parseFloat(configRow.config_value) || 2.5;
        }
      } catch (e) {}

      // 5. Calculate Final Multiplier
      let calculatedMultiplier = Math.max(timeMultiplier, demandMultiplier);
      let finalMultiplier = Math.min(calculatedMultiplier, maxCap);
      finalMultiplier = parseFloat(finalMultiplier.toFixed(2));

      let reason = 'Normal Demand';
      if (finalMultiplier >= 1.5) reason = 'Extremely High Local Demand';
      else if (finalMultiplier >= 1.25) reason = 'Peak Demand Hours';
      else if (finalMultiplier > 1.0) reason = 'Slight Demand Increase';

      return {
        multiplier: finalMultiplier,
        reason,
        timeMultiplier,
        demandMultiplier,
        maxCap
      };
    } catch (err) {
      console.error('[SurgePricingService] Error:', err.message);
      return { multiplier: 1.0, reason: 'Standard Pricing (Fallback)', timeMultiplier: 1.0, demandMultiplier: 1.0 };
    }
  }
}

module.exports = new SurgePricingService();
