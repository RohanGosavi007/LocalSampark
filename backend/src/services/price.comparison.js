const { query } = require('../config/database');

/**
 * 10x Cross-Shop Price Comparison Engine
 * Finds the cheapest nearby shop for a specific Global SKU.
 */
class PriceComparisonService {
  /**
   * Returns a sorted list of nearby shops offering the best price for a master SKU
   */
  static async getCheapestNearbyShops(masterSkuId, userLat, userLng, radiusKm = 5) {
    // 10x Scale: PostGIS spatial query combined with catalog price aggregation
    const sql = `
      SELECT 
        s.id AS shop_id, 
        s.name AS shop_name, 
        sp.price, 
        sp.stock_qty,
        (6371 * acos(cos(radians($2)) * cos(radians(s.lat)) * cos(radians(s.lng) - radians($3)) + sin(radians($2)) * sin(radians(s.lat)))) AS distance_km
      FROM shop_products sp
      JOIN shops s ON sp.shop_id = s.id
      WHERE sp.master_sku_id = $1
        AND sp.stock_qty > 0
        AND s.is_active = true
      HAVING (6371 * acos(cos(radians($2)) * cos(radians(s.lat)) * cos(radians(s.lng) - radians($3)) + sin(radians($2)) * sin(radians(s.lat)))) <= $4
      ORDER BY sp.price ASC, distance_km ASC
      LIMIT 10;
    `;

    try {
      const res = await query(sql, [masterSkuId, userLat, userLng, radiusKm]);
      return res.rows;
    } catch (err) {
      console.error('[PriceComparison] Spatial price query failed:', err.message);
      return [];
    }
  }
}

module.exports = PriceComparisonService;
