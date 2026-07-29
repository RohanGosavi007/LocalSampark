const { cacheGet, cacheSet } = require('../config/redis');

const apiCache = (ttlSeconds = 300) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const pincode = req.query.pincode || req.headers['x-pincode'] || 'global';
    const zoneId = req.query.zoneId || req.headers['x-zone-id'] || 'global';
    const key = `cache:${pincode}:${zoneId}:${req.originalUrl || req.url}`;
    
    try {
      const cachedResponse = await cacheGet(key);
      if (cachedResponse) {
        res.setHeader('X-Cache', 'HIT');
        return res.json(cachedResponse);
      }

      res.setHeader('X-Cache', 'MISS');

      // Intercept res.json
      const originalJson = res.json;
      res.json = function (data) {
        res.json = originalJson;
        // Don't await caching to avoid blocking response
        cacheSet(key, data, ttlSeconds).catch(err => {
          console.error('Cache write failed:', err.message);
        });
        return originalJson.call(this, data);
      };
      next();
    } catch (error) {
      console.error('Cache middleware error:', error.message);
      next();
    }
  };
};

module.exports = apiCache;
