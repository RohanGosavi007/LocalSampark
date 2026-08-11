const { createClient } = require('redis');
const logger = require('./logger');

let hasLoggedError = false;
let redisClient = null;

async function connectRedis() {
  redisClient = createClient({
    url: process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
    password: process.env.REDIS_PASSWORD || undefined,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 3) {
          return false; // Stop reconnecting
        }
        return 1000; // Retry after 1 second
      }
    }
  });

  redisClient.on('error', (err) => {
    // Only log if it's not a closed connection error
    if (err.message !== 'Connection is closed') {
      if (!hasLoggedError) {
        logger.error('Redis Client Error: ' + err.message);
        hasLoggedError = true;
      }
    }
  });

  redisClient.on('connect', () => {
    logger.info('   Redis connection established');
    hasLoggedError = false;
  });

  redisClient.on('ready', () => {
    logger.info('   Redis client ready and accepting commands');
  });

  try {
    await redisClient.connect();
  } catch (err) {
    if (!hasLoggedError) {
      logger.warn('⚠️  Redis failed to connect. Falling back to memory/no cache mode. ' + err.message);
      hasLoggedError = true;
    }
    // STOP the background reconnect attempts
    try { await redisClient.disconnect(); } catch (e) {}
    redisClient = null;
  }
  return redisClient;
}

// Cache helpers
async function cacheGet(key) {
  if (!redisClient) return null;
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

async function cacheSet(key, value, ttlSeconds = 300) {
  if (!redisClient) return;
  try {
    await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
  } catch (err) {
    logger.error('Redis Set Error: ' + err.message);
  }
}

/**
 * 10x FIX: Replaced `redis.keys(pattern)` with `SCAN` iterator.
 * 
 * BEFORE (BROKEN AT SCALE): redis.keys('cache:*') → O(N) blocking command
 *   - Blocks the entire Redis server while scanning ALL keys
 *   - With 100K+ keys, this causes 1-5 second freezes
 *   - All other Redis operations stall during this time
 * 
 * AFTER (PRODUCTION-SAFE): scanIterator with COUNT batches
 *   - Non-blocking, cursor-based iteration
 *   - Processes keys in batches of 100
 *   - Redis remains responsive during invalidation
 *   - Deletes keys in batches to avoid memory spikes
 */
async function cacheInvalidate(pattern = 'cache:*') {
  if (!redisClient) return;
  try {
    let deletedCount = 0;
    const batchSize = 100;
    let keysToDelete = [];

    // Use SCAN iterator instead of KEYS — non-blocking O(1) per iteration
    for await (const key of redisClient.scanIterator({ MATCH: pattern, COUNT: batchSize })) {
      keysToDelete.push(key);

      // Delete in batches to avoid memory spikes
      if (keysToDelete.length >= batchSize) {
        await redisClient.del(keysToDelete);
        deletedCount += keysToDelete.length;
        keysToDelete = [];
      }
    }

    // Delete remaining keys
    if (keysToDelete.length > 0) {
      await redisClient.del(keysToDelete);
      deletedCount += keysToDelete.length;
    }

    if (deletedCount > 0) {
      logger.info(`🧹 Invalidated ${deletedCount} cache keys matching ${pattern}`);
    }
  } catch (err) {
    logger.error('Redis Invalidation Error: ' + err.message);
  }
}

async function cacheDel(key) {
  if (!redisClient) return;
  try {
    await redisClient.del(key);
  } catch (err) {
    logger.error('Redis cacheDel error: ' + err.message);
  }
}

async function cacheGetOrSet(key, fetchFn, ttlSeconds = 300) {
  const cached = await cacheGet(key);
  if (cached) return cached;
  const fresh = await fetchFn();
  await cacheSet(key, fresh, ttlSeconds);
  return fresh;
}

/**
 * 10x NEW: Hash-based cache for complex objects (shop dashboards, analytics).
 * Allows partial updates without re-serializing the entire object.
 */
async function cacheHashSet(key, field, value, ttlSeconds = 300) {
  if (!redisClient) return;
  try {
    await redisClient.hSet(key, field, JSON.stringify(value));
    await redisClient.expire(key, ttlSeconds);
  } catch (err) {
    logger.error('Redis Hash Set Error: ' + err.message);
  }
}

async function cacheHashGet(key, field) {
  if (!redisClient) return null;
  try {
    const data = await redisClient.hGet(key, field);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

async function cacheHashGetAll(key) {
  if (!redisClient) return null;
  try {
    const data = await redisClient.hGetAll(key);
    if (!data || Object.keys(data).length === 0) return null;
    const result = {};
    for (const [field, value] of Object.entries(data)) {
      try { result[field] = JSON.parse(value); } catch { result[field] = value; }
    }
    return result;
  } catch {
    return null;
  }
}

/**
 * 10x NEW: Get Redis health info for enhanced /health endpoint.
 */
async function getRedisInfo() {
  if (!redisClient || !redisClient.isReady) {
    return { status: 'disconnected', mode: 'memory-fallback' };
  }
  try {
    const info = await redisClient.info('memory');
    const usedMemoryMatch = info.match(/used_memory_human:(\S+)/);
    const connectedClientsMatch = info.match(/connected_clients:(\d+)/);
    return {
      status: 'connected',
      mode: 'redis',
      usedMemory: usedMemoryMatch ? usedMemoryMatch[1] : 'unknown',
    };
  } catch {
    return { status: 'connected', mode: 'redis', usedMemory: 'unknown' };
  }
}

module.exports = {
  connectRedis,
  get redisClient() { return redisClient; },
  cacheGet,
  cacheSet,
  cacheDel,
  cacheGetOrSet,
  cacheInvalidate,
  cacheHashSet,
  cacheHashGet,
  cacheHashGetAll,
  getRedisInfo
};
