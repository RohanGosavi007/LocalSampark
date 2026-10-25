/**
 * ═══════════════════════════════════════════════════════════════════════
 * Shop Analytics Service — Dashboard Data Engine
 * 10x Plan: Section 20.3 — Owner Dashboard Blueprint
 * ═══════════════════════════════════════════════════════════════════════
 *
 * The time-bucketed reports here used to be built in SQL with strftime() and
 * datetime('now', '-N days'). Both are SQLite functions; PostgreSQL has
 * neither, so every one of them failed in production with "function
 * strftime(unknown, timestamp with time zone) does not exist" while passing
 * locally. The window is at most a few thousand orders for one shop, so the
 * rows are now fetched once with a bound cutoff and bucketed here, which gives
 * the same answer on either engine and keeps `days` out of the SQL text.
 */
const { queryOne, queryMany } = require('../config/database');
const { cacheGetOrSet } = require('../config/redis');

/** Days in the reporting window: a whole number from 1 to 365, defaulting to 30. */
function windowDays(days) {
  const n = Math.floor(Number(days));
  if (!Number.isFinite(n) || n < 1) return 30;
  return Math.min(n, 365);
}

/**
 * The window's lower bound, as 'YYYY-MM-DD HH:MM:SS' in UTC.
 *
 * That is the format SQLite stores created_at in, and the comparison there is
 * a string comparison: an ISO string with a 'T' would sort after every row
 * from the same day. PostgreSQL parses it as a timestamp either way.
 */
function cutoff(days) {
  return new Date(Date.now() - windowDays(days) * 86400000).toISOString().slice(0, 19).replace('T', ' ');
}

/** created_at as a Date. PostgreSQL returns one; SQLite returns UTC text with no zone. */
function toDate(value) {
  if (value instanceof Date) return value;
  const text = String(value || '');
  const iso = /[zZ]|[+-]\d{2}:?\d{2}$/.test(text) ? text : `${text.replace(' ', 'T')}Z`;
  return new Date(iso);
}

const pad = (n) => String(n).padStart(2, '0');

/** Week of the year with Monday as the first day, as strftime('%W') counts it. */
function weekOfYear(date) {
  const startOfYear = Date.UTC(date.getUTCFullYear(), 0, 1);
  const dayOfYear = Math.floor((date.getTime() - startOfYear) / 86400000);
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  return Math.floor((dayOfYear + 7 - daysSinceMonday) / 7);
}

async function ordersInWindow(shopId, days) {
  const rows = await queryMany(
    `SELECT user_id, order_status, total_amount, created_at
       FROM orders
      WHERE shop_id = $1 AND created_at >= $2`,
    [shopId, cutoff(days)]
  );
  return rows
    .map((row) => ({
      userId: row.user_id,
      status: row.order_status,
      // DECIMAL arrives from PostgreSQL as a string.
      amount: Number(row.total_amount) || 0,
      at: toDate(row.created_at),
    }))
    .filter((row) => !Number.isNaN(row.at.getTime()));
}

class ShopAnalyticsService {

  /**
   * Revenue trend — daily/weekly/monthly aggregation
   */
  static async getRevenueTrend(shopId, period = 'daily', days = 30) {
    days = windowDays(days);
    const cacheKey = `analytics:revenue:${shopId}:${period}:${days}`;
    return cacheGetOrSet(cacheKey, async () => {
      let keyOf;
      let dateFormat;
      if (period === 'weekly') {
        keyOf = (d) => `${d.getUTCFullYear()}-W${pad(weekOfYear(d))}`;
        dateFormat = 'week';
      } else if (period === 'monthly') {
        keyOf = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
        dateFormat = 'month';
      } else {
        keyOf = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
        dateFormat = 'day';
      }

      const buckets = new Map();
      for (const order of await ordersInWindow(shopId, days)) {
        const key = keyOf(order.at);
        if (!buckets.has(key)) buckets.set(key, { period: key, total_orders: 0, completed_orders: 0, revenue: 0 });
        const bucket = buckets.get(key);
        bucket.total_orders += 1;
        if (order.status === 'delivered') {
          bucket.completed_orders += 1;
          bucket.revenue += order.amount;
        }
      }

      const data = [...buckets.values()]
        .map((b) => ({
          ...b,
          revenue: Math.round(b.revenue * 100) / 100,
          avg_order_value: b.completed_orders > 0 ? Math.round((b.revenue / b.completed_orders) * 100) / 100 : 0,
        }))
        .sort((a, b) => (a.period < b.period ? 1 : -1));

      return { period: dateFormat, days, data };
    }, 600); // 10 min cache
  }

  /**
   * Order volume & status breakdown
   */
  static async getOrderBreakdown(shopId, days = 30) {
    days = windowDays(days);
    const cacheKey = `analytics:orders:${shopId}:${days}`;
    return cacheGetOrSet(cacheKey, async () => {
      const byStatus = new Map();
      const byHour = new Map();

      for (const order of await ordersInWindow(shopId, days)) {
        if (!byStatus.has(order.status)) byStatus.set(order.status, { status: order.status, count: 0, total_amount: 0 });
        const status = byStatus.get(order.status);
        status.count += 1;
        status.total_amount += order.amount;

        const hour = order.at.getUTCHours();
        byHour.set(hour, (byHour.get(hour) || 0) + 1);
      }

      const statusBreakdown = [...byStatus.values()]
        .map((s) => ({ ...s, total_amount: Math.round(s.total_amount * 100) / 100 }))
        .sort((a, b) => b.count - a.count);
      const hourlyDistribution = [...byHour.entries()]
        .map(([hour, count]) => ({ hour, count }))
        .sort((a, b) => a.hour - b.hour);

      return { statusBreakdown, hourlyDistribution };
    }, 600);
  }

  /**
   * Customer analytics — new vs returning, top customers
   */
  static async getCustomerAnalytics(shopId, days = 30) {
    days = windowDays(days);
    const cacheKey = `analytics:customers:${shopId}:${days}`;
    return cacheGetOrSet(cacheKey, async () => {
      const byCustomer = new Map();
      for (const order of await ordersInWindow(shopId, days)) {
        // An order with no account behind it is not a customer who can return.
        if (!order.userId) continue;
        if (!byCustomer.has(order.userId)) {
          byCustomer.set(order.userId, { user_id: order.userId, order_count: 0, total_spent: 0, last_order: order.at });
        }
        const customer = byCustomer.get(order.userId);
        customer.order_count += 1;
        customer.total_spent += order.amount;
        if (order.at > customer.last_order) customer.last_order = order.at;
      }

      const total = byCustomer.size;
      const repeat = [...byCustomer.values()].filter((c) => c.order_count > 1).length;

      const top = [...byCustomer.values()].sort((a, b) => b.total_spent - a.total_spent).slice(0, 10);
      let topCustomers = [];
      if (top.length > 0) {
        const placeholders = top.map((_c, i) => `$${i + 1}`).join(', ');
        const users = await queryMany(
          `SELECT id, full_name, phone_number FROM users WHERE id IN (${placeholders})`,
          top.map((c) => c.user_id)
        );
        const userById = new Map(users.map((u) => [String(u.id), u]));
        topCustomers = top.map((c) => {
          const user = userById.get(String(c.user_id)) || {};
          return {
            name: user.full_name || null,
            phone: user.phone_number || null,
            order_count: c.order_count,
            total_spent: Math.round(c.total_spent * 100) / 100,
            last_order: c.last_order.toISOString(),
          };
        });
      }

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
         WHERE category = $1 AND region_id = $2 AND id != $3 AND is_active = true`,
        [category, regionId, shopId]
      );

      const avgRatingInZone = await queryOne(
        `SELECT AVG(rating) as avg_rating FROM local_shops
         WHERE category = $1 AND region_id = $2 AND is_active = true`,
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
    days = windowDays(days);
    const cacheKey = `analytics:peakhours:${shopId}:${days}`;
    return cacheGetOrSet(cacheKey, async () => {
      // 7x24 grid, Sunday first, hours in UTC as stored.
      const heatmap = Array.from({ length: 7 }, () => Array(24).fill(0));
      for (const order of await ordersInWindow(shopId, days)) {
        heatmap[order.at.getUTCDay()][order.at.getUTCHours()] += 1;
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
        `SELECT COUNT(*) as total FROM shop_products WHERE shop_id = $1 AND is_available = true`, [shopId]
      );
      const outOfStock = await queryMany(
        `SELECT id, name, price FROM shop_products
         WHERE shop_id = $1 AND is_available = false
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
module.exports.weekOfYear = weekOfYear;
