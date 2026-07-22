const pool = require('../../../config/database');

const AnalyticsService = {
  /**
   * Calculates the daily burn rate of products based on the last 30 days of orders.
   * Helps merchants predict when they will run out of stock.
   */
  async getInventoryBurnRate(shopId) {
    try {
      // Query to find total quantity sold per product over the last 30 days
      const result = await pool.query(
        `SELECT 
           oi.product_id, 
           p.name as product_name,
           p.stock as current_stock,
           SUM(oi.quantity) as total_sold_30d,
           (SUM(oi.quantity) / 30.0) as daily_burn_rate
         FROM order_items oi
         JOIN orders o ON oi.order_id = o.id
         JOIN products p ON oi.product_id = p.id
         WHERE o.shop_id = $1 
           AND o.status = 'delivered'
           AND o.created_at >= NOW() - INTERVAL '30 days'
         GROUP BY oi.product_id, p.name, p.stock
         ORDER BY daily_burn_rate DESC`,
        [shopId]
      );

      // Add prediction logic
      const predictions = result.rows.map(row => {
        const burnRate = parseFloat(row.daily_burn_rate);
        const daysRemaining = burnRate > 0 ? (row.current_stock / burnRate) : 999;
        
        let status = 'Healthy';
        let recommendation = 'Stock levels are adequate.';
        
        if (daysRemaining < 3) {
          status = 'Critical';
          recommendation = `You will sell out of ${row.product_name} in less than 3 days. Restock immediately.`;
        } else if (daysRemaining < 7) {
          status = 'Warning';
          recommendation = `Consider ordering more ${row.product_name} for the weekend.`;
        }

        return {
          ...row,
          days_remaining: Math.round(daysRemaining),
          status,
          recommendation
        };
      });

      return predictions;
    } catch (error) {
      console.error('[AnalyticsService] Error calculating burn rate:', error);
      throw error;
    }
  }
};

module.exports = AnalyticsService;
