/**
 * ═══════════════════════════════════════════════════════════════════════
 * Unified Cache Service — LRU In-Memory + Redis Hybrid
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * Production: Redis (via config/redis.js)
 * Development: In-memory LRU Map with TTL eviction (zero dependencies)
 * ═══════════════════════════════════════════════════════════════════════
 */

let cacheGet, cacheSet, cacheInvalidate;

// ── In-Memory LRU Cache (Development Fallback) ──────────────────────
class LRUCache {
  constructor(maxSize = 500) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, item);
    return item.value;
  }

  set(key, value, ttlSeconds) {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + (ttlSeconds * 1000)
    });
  }

  invalidate(pattern) {
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      for (const key of this.cache.keys()) {
        if (key.startsWith(prefix)) this.cache.delete(key);
      }
    } else {
      this.cache.delete(pattern);
    }
  }

  clear() {
    this.cache.clear();
  }

  get size() {
    return this.cache.size;
  }
}

// ── Initialize Cache Backend ─────────────────────────────────────────
const lruInstance = new LRUCache(1000);
let useRedis = false;

try {
  const redis = require('../config/redis');
  cacheGet = redis.cacheGet;
  cacheSet = redis.cacheSet;
  cacheInvalidate = redis.cacheInvalidate;

  // Test if Redis functions exist and aren't stubs
  if (typeof cacheGet === 'function' && process.env.NODE_ENV === 'production') {
    useRedis = true;
    console.log('[CacheService] Using Redis backend (production).');
  } else {
    useRedis = false;
  }
} catch (e) {
  useRedis = false;
}

if (!useRedis) {
  console.log('[CacheService] Using in-memory LRU backend (development).');
  cacheGet = async (key) => lruInstance.get(key);
  cacheSet = async (key, value, ttl) => lruInstance.set(key, value, ttl);
  cacheInvalidate = async (pattern) => lruInstance.invalidate(pattern);
}

/**
 * Unified Cache Service
 */
class CacheService {
  /**
   * Get cached data or execute fallback and store in cache.
   * @param {string} key - Cache key
   * @param {number} ttlSeconds - Time-to-live
   * @param {Function} fetchFn - Async fallback
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
   * Get cached data directly
   * @param {string} key - Cache key
   */
  static async get(key) {
    try {
      return await cacheGet(key);
    } catch (err) {
      console.warn(`[CacheService] Read error for key ${key}:`, err.message);
      return null;
    }
  }

  /**
   * Set cached data directly
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttlSeconds - Time-to-live
   */
  static async set(key, value, ttlSeconds) {
    try {
      await cacheSet(key, value, ttlSeconds);
    } catch (err) {
      console.warn(`[CacheService] Write error for key ${key}:`, err.message);
    }
  }

  /**
   * Territory-scoped cache key helper.
   * @param {string} territoryId 
   * @param {string} resource - e.g. 'categories', 'shops:grocery'
   */
  static territoryKey(territoryId, resource) {
    return `territory:${territoryId}:${resource}`;
  }

  /**
   * Invalidate all cache entries for a specific territory.
   * Called when admin updates category matrix, shop data, etc.
   */
  static async invalidateTerritory(territoryId) {
    try {
      await cacheInvalidate(`territory:${territoryId}:*`);
    } catch (err) {
      console.error(`[CacheService] Territory invalidation error:`, err.message);
    }
  }

  /**
   * Invalidate a specific key or pattern.
   */
  static async invalidate(keyPattern) {
    try {
      await cacheInvalidate(keyPattern);
    } catch (err) {
      console.error(`[CacheService] Invalidation error for ${keyPattern}:`, err.message);
    }
  }

  /**
   * Get cache stats (development debugging).
   */
  static getStats() {
    return {
      backend: useRedis ? 'redis' : 'lru-memory',
      lruSize: lruInstance.size
    };
  }
}

module.exports = CacheService;
