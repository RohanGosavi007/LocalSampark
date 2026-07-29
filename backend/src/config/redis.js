const { createClient } = require('redis');

let hasLoggedError = false;
let redisClient = null;

async function connectRedis() {
  redisClient = createClient({
    url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
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
        console.error('Redis Client Error:', err.message);
        hasLoggedError = true;
      }
    }
  });

  redisClient.on('connect', () => {
    console.log('   Redis connection established');
    hasLoggedError = false;
  });

  try {
    await redisClient.connect();
  } catch (err) {
    if (!hasLoggedError) {
      console.warn('⚠️  Redis failed to connect. Falling back to memory/no cache mode.', err.message);
      hasLoggedError = true;
    }
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
    console.error('Redis Set Error:', err.message);
  }
}

// 10x Scale: Invalidate keys on database mutation
async function cacheInvalidate(pattern = 'cache:*') {
  if (!redisClient) return;
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
      console.log(`🧹 Invalidated ${keys.length} cache keys matching ${pattern}`);
    }
  } catch (err) {
    console.error('Redis Invalidation Error:', err.message);
  }
}

async function cacheDel(key) {
  if (!redisClient) return;
  try {
    await redisClient.del(key);
  } catch (err) {
    console.error('Redis cacheDel error:', err.message);
  }
}

async function cacheGetOrSet(key, fetchFn, ttlSeconds = 300) {
  const cached = await cacheGet(key);
  if (cached) return cached;
  const fresh = await fetchFn();
  await cacheSet(key, fresh, ttlSeconds);
  return fresh;
}

module.exports = {
  connectRedis,
  get redisClient() { return redisClient; },
  cacheGet,
  cacheSet,
  cacheDel,
  cacheGetOrSet,
  cacheInvalidate
};
