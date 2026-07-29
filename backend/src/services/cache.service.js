const { cacheGet, cacheSet, cacheInvalidate } = require('../config/redis');

/**
 * Unified Cache Service for LocalSampark 10x Scale Engine
 * Supports Cache-Aside, TTL management, and JSON compression/serialization
 */
class CacheService {
  /**
   * Get cached data or execute fallback query and store in cache
   * @param {string} key - Cache key
   * @param {number} ttlSeconds - Time-to-live in seconds
   * @param {Function} fetchFn - Async fallback function returning fresh data
   */
  static async getOrSet(key, ttlSeconds, fetchFn) {
    try {
      const cached = await cacheGet(key);
      if (cached) {
        return { data: cached, source: 'cache' };
      }
    } catch (err) {
      console.warn(`[CacheService] Read error for key ${key}:`, err.message);
    }

    // Execute fallback
    const freshData = await fetchFn();

    if (freshData !== undefined && freshData !== null) {
      try {
        await cacheSet(key, freshData, ttlSeconds);
      } catch (err) {
        console.warn(`[CacheService] Write error for key ${key}:`, err.message);
      }
    }

    return { data: freshData, source: 'db' };
  }

  /**
   * Invalidate specific key or pattern
   * @param {string} keyPattern - Key or pattern to clear
   */
  static async invalidate(keyPattern) {
    try {
      await cacheInvalidate(keyPattern);
    } catch (err) {
      console.error(`[CacheService] Invalidation error for ${keyPattern}:`, err.message);
    }
  }
}

module.exports = CacheService;
