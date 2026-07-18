const { queryOne } = require('../config/database');

const findNearestZone = async (lat, lng) => {
    let sql = '';
    if (process.env.USE_SQLITE === 'true') {
        sql = `
            SELECT * FROM regions 
            WHERE is_active = 1
            ORDER BY ((latitude - $1)*(latitude - $1) + (longitude - $2)*(longitude - $2)) ASC
            LIMIT 1
        `;
    } else {
        sql = `
            SELECT * FROM regions 
            WHERE is_active = 1
            ORDER BY (6371 * acos(cos(radians($1)) * cos(radians(latitude)) 
            * cos(radians(longitude) - radians($2)) 
            + sin(radians($1)) * sin(radians(latitude)))) ASC
            LIMIT 1
        `;
    }
    return await queryOne(sql, [parseFloat(lat), parseFloat(lng)]);
};

const zoneScope = async (req, res, next) => {
  try {
      // Priority 1: Explicit zone_id in query params
      if (req.query.zone_id) {
        req.activeZoneId = req.query.zone_id;
      }
      // Priority 2: User's registered active zone or region
      else if (req.user?.active_zone_id || req.user?.region_id) {
        req.activeZoneId = req.user.active_zone_id || req.user.region_id;
      }
      // Priority 3: GPS-based detection (from header)
      else if (req.headers['x-user-latitude'] && req.headers['x-user-longitude']) {
        const nearestZone = await findNearestZone(
          req.headers['x-user-latitude'], 
          req.headers['x-user-longitude']
        );
        req.activeZoneId = nearestZone?.id;
      }
      next();
  } catch (error) {
      next(error);
  }
};

module.exports = { zoneScope, findNearestZone };
