const axios = require('axios');

/**
 * Intelligent Routing Service using OSRM (Open Source Routing Machine)
 */
class RoutingService {
  constructor() {
    this.baseUrl = 'http://router.project-osrm.org/route/v1/driving';
  }

  /**
   * Get route details between two points
   * @param {number} startLat 
   * @param {number} startLng 
   * @param {number} endLat 
   * @param {number} endLng 
   * @returns {Promise<Object>} Route data containing distance and duration
   */
  async getRouteInfo(startLat, startLng, endLat, endLng) {
    try {
      // OSRM format: longitude,latitude
      const url = `${this.baseUrl}/${startLng},${startLat};${endLng},${endLat}?overview=false`;
      const response = await axios.get(url, { timeout: 3000 });
      
      if (response.data && response.data.routes && response.data.routes.length > 0) {
        const route = response.data.routes[0];
        return {
          distanceKm: (route.distance / 1000).toFixed(2),
          durationMins: Math.ceil(route.duration / 60),
          success: true
        };
      }
      throw new Error('No route found in OSRM response');
    } catch (error) {
      console.warn(`[RoutingService] OSRM Failed: ${error.message}. Falling back to Haversine.`);
      return this.getFallbackRoute(startLat, startLng, endLat, endLng);
    }
  }

  /**
   * Fallback to Haversine calculation if OSRM is unreachable
   */
  getFallbackRoute(lat1, lon1, lat2, lon2) {
    const toRad = (value) => (value * Math.PI) / 180;
    const R = 6371; // km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    // Estimate duration: assume average city speed of 25 km/h
    const durationMins = Math.ceil((distance / 25) * 60);

    return {
      distanceKm: distance.toFixed(2),
      durationMins: durationMins,
      success: false // Indicates fallback was used
    };
  }

  /**
   * Surge Pricing Calculator based on local demand and conditions
   * @param {number} baseFare 
   * @param {string} zoneId 
   * @param {Object} dbClient  - Database query client
   */
  async calculateSurge(baseFare, zoneId, dbQuery) {
    try {
      let multiplier = 1.0;
      // 1. Check for active configured incentives (e.g., rain, peak)
      const incentives = await dbQuery(
        `SELECT multiplier FROM delivery_incentives WHERE zone_id = $1 AND is_active = 1 AND end_time > CURRENT_TIMESTAMP`,
        [zoneId]
      );
      
      if (incentives.rows && incentives.rows.length > 0) {
        // Apply highest multiplier
        multiplier = Math.max(...incentives.rows.map(i => i.multiplier));
      }

      // 2. Compute live demand vs supply ratio
      const activeJobs = await dbQuery(`SELECT COUNT(*) as count FROM delivery_jobs WHERE status IN ('pending', 'assigned') AND pincode = $1`, [zoneId]);
      const onlineAgents = await dbQuery(`SELECT COUNT(*) as count FROM delivery_agents WHERE is_online = 1`);
      
      const demand = parseInt(activeJobs.rows[0].count);
      const supply = parseInt(onlineAgents.rows[0].count) || 1; // avoid divide by zero

      if (demand / supply > 2) multiplier = Math.max(multiplier, 1.5);
      else if (demand / supply > 1.5) multiplier = Math.max(multiplier, 1.25);

      return {
        originalFare: baseFare,
        surgeMultiplier: multiplier,
        finalFare: (baseFare * multiplier).toFixed(2)
      };
    } catch (error) {
      console.error('[RoutingService] Failed to calculate surge:', error.message);
      return { originalFare: baseFare, surgeMultiplier: 1.0, finalFare: baseFare };
    }
  }
}

module.exports = new RoutingService();
