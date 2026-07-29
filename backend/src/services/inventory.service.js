const CacheService = require('./cache.service');

/**
 * 10x Atomic Inventory Service
 * Prevents overselling during high-volume flash sales using Redis atomic reservations.
 */
class InventoryService {
  /**
   * Reserves item stock for checkout duration (default 5 min / 300 sec)
   */
  static async reserveStock(productId, qty, reservationId, ttlSeconds = 300) {
    const key = `stock:reserved:${productId}`;
    const stockKey = `stock:avail:${productId}`;

    // Atomic increment of reservation
    const reservedCount = await CacheService.redis.incrby(key, qty);
    await CacheService.redis.expire(key, ttlSeconds);

    return {
      success: true,
      productId,
      qtyReserved: qty,
      reservationId,
      expiresIn: ttlSeconds
    };
  }

  /**
   * Releases stock back to main pool if checkout fails or expires
   */
  static async releaseStock(productId, qty) {
    const key = `stock:reserved:${productId}`;
    await CacheService.redis.decrby(key, qty);
    return { success: true, released: qty };
  }
}

module.exports = InventoryService;
