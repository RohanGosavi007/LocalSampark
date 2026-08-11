/**
 * ═══════════════════════════════════════════════════════════════════════
 * Shop Analytics Service — Dashboard Data Engine
 * 10x Plan: Section 20.3 — Owner Dashboard Blueprint
 * ═══════════════════════════════════════════════════════════════════════
 */
const { query, queryOne, queryMany } = require('../config/database');
const { cacheGetOrSet } = require('../config/redis');
const logger = require('../config/logger');

class ShopAnalyticsService {

  /**
   * Revenue trend — daily/weekly/monthly aggregation
   */
  static async getRevenueTrend(shopId, period = 'daily', days = 30) {
    const cacheKey = `analytics:revenue:${shopId}:${period}:${days}`;
    return cacheGetOrSet(cacheKey, async () => {
      let groupBy, dateFormat;
      if (period === 'weekly') {
        groupBy = `strftime('%Y-W%W', created_at)`;
        dateFormat = 'week';
      } else if (period === 'monthly') {
        groupBy = `strftime('%Y-%m', created_at)`;
        dateFormat = 'month';
      } else {
        groupBy = `date(created_at)`;
        dateFormat = 'day';
      }

      const rows = await queryMany(
        `SELECT ${groupBy} as period,
                COUNT(*) as total_orders,
                COUNT(CASE WHEN order_status = 'delivered' THEN 1 END) as completed_orders,
                COALESCE(SUM(CASE WHEN order_status = 'delivered' THEN total_amount ELSE 0 END), 0) as revenue,
                COALESCE(AVG(CASE WHEN order_status = 'delivered' THEN total_amount END), 0) as avg_order_value
         FROM orders
         WHERE shop_id = $1
           AND created_at >= datetime('now', '-${days} days')
         GROUP BY ${groupBy}
         ORDER BY period DESC`,
        [shopId]
      );

      return { period: dateFormat, days, data: rows };
    }, 600); // 10 min cache
  }

  /**
   * Order volume & status breakdown
   */
  static async getOrderBreakdown(shopId, days = 30) {
    const cacheKey = `analytics:orders:${shopId}:${days}`;
    return cacheGetOrSet(cacheKey, async () => {
      const statusBreakdown = await queryMany(
        `SELECT order_status as status, COUNT(*) as count,
                COALESCE(SUM(total_amount), 0) as total_amount
         FROM orders
         WHERE shop_id = $1 AND created_at >= datetime('now', '-${days} days')
         GROUP BY order_status
         ORDER BY count DESC`,
        [shopId]
      );

      const hourlyDistribution = await queryMany(
        `SELECT CAST(strftime('%H', created_at) AS INTEGER) as hour, COUNT(*) as count
         FROM orders
         WHERE shop_id = $1 AND created_at >= datetime('now', '-${days} days')
         GROUP BY hour ORDER BY hour`,
        [shopId]
      );

      return { statusBreakdown, hourlyDistribution };
    }, 600);
  }

  /**
   * Customer analytics — new vs returning, top customers
   */
  static async getCustomerAnalytics(shopId, days = 30) {
    const cacheKey = `analytics:customers:${shopId}:${days}`;
    return cacheGetOrSet(cacheKey, async () => {
      const totalCustomers = await queryOne(
        `SELECT COUNT(DISTINCT user_id) as total
         FROM orders WHERE shop_id = $1 AND created_at >= datetime('now', '-${days} days')`,
        [shopId]
      );

      const repeatCustomers = await queryOne(
        `SELECT COUNT(*) as total FROM (
           SELECT user_id FROM orders
           WHERE shop_id = $1 AND created_at >= datetime('now', '-${days} days')
           GROUP BY user_id HAVING COUNT(*) > 1
         )`,
        [shopId]
      );

      const topCustomers = await queryMany(
        `SELECT u.full_name as name, u.phone_number as phone,
                COUNT(o.id) as order_count,
                SUM(o.total_amount) as total_spent,
                MAX(o.created_at) as last_order
         FROM orders o
         JOIN users u ON o.user_id = u.id
         WHERE o.shop_id = $1 AND o.created_at >= datetime('now', '-${days} days')
         GROUP BY o.user_id
         ORDER BY total_spent DESC LIMIT 10`,
        [shopId]
      );

      const total = totalCustomers ? parseInt(totalCustomers.total) : 0;
      const repeat = repeatCustomers ? parseInt(repeatCustomers.total) : 0;

      return {
        totalCustomers: total,
        newCustomers: total - repeat,
        repeatCustomers: repeat,
        retentionRate: total > 0 ? Math.round((repeat / total) * 100) : 0,
        topCustomers,
      };
    }, 600);
  }

  /**
   * Zone competitor benchmarking
   */
  static async getCompetitorAnalysis(shopId, category, regionId) {
    const cacheKey = `analytics:competitors:${shopId}`;
    return cacheGetOrSet(cacheKey, async () => {
      const competitorCount = await queryOne(
        `SELECT COUNT(*) as cnt FROM local_shops
         WHERE category = $1 AND region_id = $2 AND id != $3 AND is_active = 1`,
        [category, regionId, shopId]
      );

      const avgRatingInZone = await queryOne(
        `SELECT AVG(rating) as avg_rating FROM local_shops
         WHERE category = $1 AND region_id = $2 AND is_active = 1`,
        [category, regionId]
      );

      const shopRating = await queryOne(
        `SELECT rating FROM local_shops WHERE id = $1`, [shopId]
      );

      return {
        competitorsInZone: competitorCount ? parseInt(competitorCount.cnt) : 0,
        zoneAvgRating: avgRatingInZone ? parseFloat(avgRatingInZone.avg_rating || 0).toFixed(1) : '0.0',
        yourRating: shopRating ? parseFloat(shopRating.rating || 0).toFixed(1) : '0.0',
        ratingVsZone: shopRating && avgRatingInZone
          ? (parseFloat(shopRating.rating) - parseFloat(avgRatingInZone.avg_rating)).toFixed(1)
          : '0.0',
      };
    }, 1800); // 30 min cache
  }

  /**
   * Peak hours heatmap data
   */
  static async getPeakHours(shopId, days = 30) {
    const cacheKey = `analytics:peakhours:${shopId}:${days}`;
    return cacheGetOrSet(cacheKey, async () => {
      const data = await queryMany(
        `SELECT
           CAST(strftime('%w', created_at) AS INTEGER) as day_of_week,
           CAST(strftime('%H', created_at) AS INTEGER) as hour,
           COUNT(*) as order_count
         FROM orders
         WHERE shop_id = $1 AND created_at >= datetime('now', '-${days} days')
         GROUP BY day_of_week, hour
         ORDER BY day_of_week, hour`,
        [shopId]
      );

      // Create 7x24 heatmap grid
      const heatmap = Array.from({ length: 7 }, () => Array(24).fill(0));
      for (const row of data) {
        heatmap[row.day_of_week][row.hour] = row.order_count;
      }

      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return { heatmap, dayNames };
    }, 3600);
  }

  /**
   * Inventory status — stock levels, low-stock alerts
   */
  static async getInventoryStatus(shopId) {
    const cacheKey = `analytics:inventory:${shopId}`;
    return cacheGetOrSet(cacheKey, async () => {
      const totalProducts = await queryOne(
        `SELECT COUNT(*) as total FROM shop_products WHERE shop_id = $1`, [shopId]
      );
      const activeProducts = await queryOne(
        `SELECT COUNT(*) as total FROM shop_products WHERE shop_id = $1 AND is_available = 1`, [shopId]
      );
      const outOfStock = await queryMany(
        `SELECT id, name, price FROM shop_products
         WHERE shop_id = $1 AND is_available = 0
         ORDER BY name LIMIT 20`, [shopId]
      );

      return {
        total: totalProducts ? parseInt(totalProducts.total) : 0,
        active: activeProducts ? parseInt(activeProducts.total) : 0,
        inactive: (totalProducts ? parseInt(totalProducts.total) : 0) - (activeProducts ? parseInt(activeProducts.total) : 0),
        outOfStock,
      };
    }, 300);
  }

  /**
   * Full dashboard overview (combines all analytics)
   */
  static async getFullDashboard(shopId, shop) {
    const [revenue, orders, customers, competitors, peakHours, inventory] = await Promise.all([
      this.getRevenueTrend(shopId, 'daily', 30),
      this.getOrderBreakdown(shopId, 30),
      this.getCustomerAnalytics(shopId, 30),
      this.getCompetitorAnalysis(shopId, shop.category, shop.region_id),
      this.getPeakHours(shopId, 30),
      this.getInventoryStatus(shopId),
    ]);

    return { revenue, orders, customers, competitors, peakHours, inventory };
  }
}

module.exports = ShopAnalyticsService;
