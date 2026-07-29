const { query } = require('../config/database');
const LogisticsBatching = require('./logistics.batching');

/**
 * 10x Spatial Auto-Dispatch Engine
 * Matches orders to active delivery drivers within a 2.5km spatial radius.
 */
class DispatchEngine {
  static async findNearbyDrivers(shopLat, shopLng, maxRadiusKm = 2.5) {
    // PostGIS Spatial Distance Query
    const sql = `
      SELECT id, name, phone, 
        (6371 * acos(cos(radians($1)) * cos(radians(current_lat)) * cos(radians(current_lng) - radians($2)) + sin(radians($1)) * sin(radians(current_lat)))) AS distance_km
      FROM delivery_agents
      WHERE is_online = true AND is_available = true
      HAVING (6371 * acos(cos(radians($1)) * cos(radians(current_lat)) * cos(radians(current_lng) - radians($2)) + sin(radians($1)) * sin(radians(current_lat)))) <= $3
      ORDER BY distance_km ASC
      LIMIT 5;
    `;

    try {
      const res = await query(sql, [shopLat, shopLng, maxRadiusKm]);
      return res.rows || [];
    } catch (err) {
      console.warn('Spatial dispatch search fallback:', err.message);
      return [];
    }
  }

  static async autoAssignOrder(orderId, shopId, shopLat, shopLng, dropoffLat, dropoffLng) {
    // 10x Scale: Check for Geo-Spatial Batching Opportunity
    const candidateOrderId = await LogisticsBatching.findBatchCandidate(shopId, dropoffLat, dropoffLng);
    
    let isBatched = false;
    let batchId = null;

    if (candidateOrderId) {
      batchId = await LogisticsBatching.createBatch(orderId, candidateOrderId);
      isBatched = true;
    }

    const drivers = await this.findNearbyDrivers(shopLat, shopLng);
    if (drivers.length > 0) {
      const assignedDriver = drivers[0];
      await query("UPDATE orders SET assigned_agent_id = $1, status = 'DISPATCHED' WHERE id = $2", [assignedDriver.id, orderId]);
      
      // If batched, assign the candidate order to the same driver
      if (isBatched && candidateOrderId) {
        await query("UPDATE orders SET assigned_agent_id = $1, status = 'DISPATCHED' WHERE id = $2", [assignedDriver.id, candidateOrderId]);
      }

      return { 
        success: true, 
        driver: assignedDriver, 
        isBatched, 
        batchId 
      };
    }
    return { success: false, reason: 'No active driver within 2.5km' };
  }
}

module.exports = DispatchEngine;
