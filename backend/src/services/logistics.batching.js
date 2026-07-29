const { query } = require('../config/database');

/**
 * 10x Geo-Spatial Batching Engine
 * Groups orders placed within a 3-minute window and a 500-meter radius to save logistics costs.
 */
class LogisticsBatching {
  /**
   * Helper: Haversine distance in meters
   */
  static getDistanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth radius in meters
    const p1 = lat1 * Math.PI/180;
    const p2 = lat2 * Math.PI/180;
    const dp = (lat2-lat1) * Math.PI/180;
    const dl = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(dp/2) * Math.sin(dp/2) +
              Math.cos(p1) * Math.cos(p2) *
              Math.sin(dl/2) * Math.sin(dl/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Identifies if a new order can be batched with an existing active order
   */
  static async findBatchCandidate(shopId, newOrderLat, newOrderLng) {
    try {
      // Find orders from the SAME shop created within the last 3 minutes
      // that have not yet been picked up by a driver.
      const sql = `
        SELECT id, dropoff_lat, dropoff_lng, created_at 
        FROM orders 
        WHERE shop_id = $1 
          AND status IN ('PENDING', 'PACKED') 
          AND created_at >= NOW() - INTERVAL '3 minutes'
          AND batch_id IS NULL
        ORDER BY created_at DESC
        LIMIT 5;
      `;
      const res = await query(sql, [shopId]);
      
      const candidates = res.rows || [];

      for (let order of candidates) {
        const distance = this.getDistanceMeters(
          newOrderLat, newOrderLng,
          order.dropoff_lat, order.dropoff_lng
        );

        // If dropoffs are within 500 meters, we can batch them!
        if (distance <= 500) {
          return order.id; // Return candidate order ID to batch with
        }
      }
      return null;
    } catch (err) {
      console.warn('[LogisticsBatching] Error finding candidate:', err.message);
      return null;
    }
  }

  /**
   * Links two orders into a single Batch ID
   */
  static async createBatch(orderId1, orderId2) {
    const batchId = `BATCH-${Date.now()}`;
    await query("UPDATE orders SET batch_id = $1 WHERE id IN ($2, $3)", [batchId, orderId1, orderId2]);
    return batchId;
  }
}

module.exports = LogisticsBatching;
