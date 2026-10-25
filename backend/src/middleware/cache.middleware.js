const { cacheGet, cacheSet } = require('../config/redis');

/**
 * Whether the request is made by a signed-in caller.
 *
 * The cache key is pincode + zone + URL: nothing in it says who is asking. So
 * the first signed-in response to /marketplace/saved, an admin's /admin/regions,
 * or any personalised feed was stored under the URL and served to everyone who
 * asked for it over the next ten minutes. Signed-in requests now bypass the
 * cache entirely; anonymous browsing — what these mounts exist to speed up —
 * is unaffected.
 */
function isAuthenticated(req) {
  if (req.user || req.headers.authorization) return true;
  const cookies = req.cookies || {};
  if (Object.keys(cookies).some((name) => /token|session|auth|jwt/i.test(name))) return true;
  return /(?:token|session|auth|jwt)[^=;]*=/i.test(req.headers.cookie || '');
}

const apiCache = (ttlSeconds = 300) => {
  return async (req, res, next) => {
    // Only cache anonymous GET requests
    if (req.method !== 'GET' || isAuthenticated(req)) {
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
        // Successful answers only. Every status used to be stored, so a 404 or a
        // 500 for one bad moment was replayed for the whole TTL.
        if (this.statusCode === 200) {
          // Don't await caching to avoid blocking response
          cacheSet(key, data, ttlSeconds).catch(err => {
            console.error('Cache write failed:', err.message);
          });
        }
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
