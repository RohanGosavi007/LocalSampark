const { query, queryOne } = require('../config/database');

/**
 * Calculates Haversine distance in kilometers between two lat/lng coordinates.
 */
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of Earth in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

/**
 * Resolves active ad campaigns within the given geospatial radius.
 */
async function getGeoTargetedAds({ lat, lng, pincode, categoryId, radiusKm = 4 }) {
  try {
    // 1. Fetch system default radius if not explicitly provided
    if (!radiusKm) {
      const setting = await queryOne("SELECT value FROM system_settings WHERE key = 'default_ad_radius_km'");
      radiusKm = setting ? parseFloat(setting.value) : 4.0;
    }

    // 2. Compute bounding box deltas
    const latDelta = radiusKm / 111.045;
    const lngDelta = radiusKm / (111.045 * Math.cos(lat * (Math.PI / 180)));

    const minLat = lat - latDelta;
    const maxLat = lat + latDelta;
    const minLng = lng - lngDelta;
    const maxLng = lng + lngDelta;

    // 3. Query active campaigns within bounding box & matching category
    let sql = `
      SELECT c.*, s.name as shop_name, s.latitude as shop_lat, s.longitude as shop_lng
      FROM ad_campaigns c
      JOIN local_shops s ON c.shop_id = s.id
      WHERE c.status = 'active'
        AND datetime('now') BETWEEN datetime(c.start_date) AND datetime(c.end_date)
        AND s.latitude BETWEEN ? AND ?
        AND s.longitude BETWEEN ? AND ?
    `;
    const params = [minLat, maxLat, minLng, maxLng];

    if (categoryId) {
      sql += ` AND s.category_id = ?`;
      params.push(categoryId);
    }

    const result = await query(sql, params);
    const candidateAds = result.rows || result;

    // 4. Calculate exact Haversine distance & rank by bid formula
    const rankedAds = candidateAds
      .map(ad => {
        const distanceKm = calculateHaversineDistance(lat, lng, ad.shop_lat, ad.shop_lng);
        // Rank formula: (budget / spent + 1) * (1 / (distanceKm + 0.5))
        const remainingBudget = Math.max(0, (ad.budget || 0) - (ad.spent || 0));
        const rankScore = (remainingBudget + 1) / (distanceKm + 0.5);

        return {
          ...ad,
          distance_km: parseFloat(distanceKm.toFixed(2)),
          rank_score: parseFloat(rankScore.toFixed(4))
        };
      })
      .filter(ad => ad.distance_km <= radiusKm)
      .sort((a, b) => b.rank_score - a.rank_score);

    return rankedAds;
  } catch (error) {
    console.error('Error resolving geo-targeted ads:', error);
    return [];
  }
}

module.exports = {
  calculateHaversineDistance,
  getGeoTargetedAds
};
