// ═══════════════════════════════════════════════════════════════════════
// Pincode Directory Controller — High Performance Hyperlocal API
// ═══════════════════════════════════════════════════════════════════════
// Features:
// 1. Composite Index query targeting [pincode, categoryId], [pincode, categoryType], [pincode, status]
// 2. Strict Payload Stripping (selects only necessary fields for directory cards)
// 3. In-memory LRU / Redis Caching (10 min TTL for high-traffic pincodes like 411001, 411014, 411038)
// 4. Strict Cursor-based Pagination (capped at 15 items per batch)
// 5. Server-side Latency Logging Audit
// ═══════════════════════════════════════════════════════════════════════

const { query } = require('../../../config/database');

// In-Memory LRU Cache Fallback
const directoryCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes TTL

/**
 * GET /api/shops/pincode/:pincode
 * Query Params: ?category_id=...&category_type=...&cursor=...&limit=15
 */
async function getShopsByPincode(req, res, next) {
  const startTime = Date.now();
  try {
    const { pincode } = req.params;
    const { category_id, category_type, cursor, limit = 15 } = req.query;

    const pageSize = Math.min(parseInt(limit, 10) || 15, 20); // Hard cap at max 20

    if (process.env.NODE_ENV !== 'production') {
      try {
        const fs = require('fs'); const path = require('path');
        const mockPath = path.resolve(__dirname, '../../../../../packages/mock-data/seeds/shops_directory.json');
        if (fs.existsSync(mockPath)) {
          const sData = JSON.parse(fs.readFileSync(mockPath, 'utf8'));
          let filteredShops = sData.shops;
          return res.json({ success: true, shops: filteredShops, pincode, count: filteredShops.length, nextCursor: null });
        }
      } catch (e) { next(e); }
    }

    // Construct Cache Key
    const cacheKey = `pincode:${pincode}:catId:${category_id || 'all'}:catType:${category_type || 'all'}:cursor:${cursor || 'first'}:limit:${pageSize}`;

    // Check Cache
    const cachedEntry = directoryCache.get(cacheKey);
    if (cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_TTL_MS) {
      res.setHeader('X-Cache-Source', 'memory-lru');
      res.setHeader('X-Response-Time', `${Date.now() - startTime}ms`);
      return res.json(cachedEntry.payload);
    }

    /**
     * Reads local_shops, the table registration actually writes to.
     *
     * This queried `prisma.shop`, whose model is `@@map`ped to `shops` — a
     * different table. POST /shops/register inserts into local_shops, so a shop
     * that registered successfully never appeared in the pincode directory a
     * customer browses. In development the mock-data short-circuit above hides
     * this entirely, so the only place the query ran was production.
     *
     * local_shops does not carry every column the Prisma model declares. The
     * payload shape is preserved — clients depend on it — and the fields with
     * no column behind them are derived where that is honest (photo_urls gives
     * the logo and banner, the name gives a slug) and null where it is not.
     */
    const conditions = ['s.pincode = $1', 's.is_active = 1'];
    const params = [pincode];

    if (category_id) {
      params.push(category_id);
      conditions.push(`s.category_id = $${params.length}`);
    }

    // Cursor pagination on id, matching the ordering below.
    if (cursor) {
      params.push(cursor);
      conditions.push(`s.id > $${params.length}`);
    }

    params.push(pageSize + 1);

    const result = await query(
      `SELECT s.id, s.name, s.rating, s.pincode, s.photo_urls,
              s.estimated_delivery_time, s.delivery_available, s.pickup_available,
              s.category_id, c.name AS category_name, c.slug AS category_slug,
              c.icon AS category_icon
         FROM local_shops s
         LEFT JOIN shop_categories c ON c.id = s.category_id
        WHERE ${conditions.join(' AND ')}
        ORDER BY s.id ASC
        LIMIT $${params.length}`,
      params
    );

    const firstPhoto = (raw) => {
      if (!raw) return null;
      try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        return Array.isArray(parsed) ? (parsed[0] || null) : null;
      } catch {
        return null;
      }
    };

    const shops = (result.rows || result || []).map((row) => ({
      id: row.id,
      name: row.name,
      slug: String(row.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      categoryType: null,
      rating: row.rating ?? null,
      totalRatings: null,
      logoUrl: firstPhoto(row.photo_urls),
      bannerUrl: firstPhoto(row.photo_urls),
      locality: null,
      pincode: row.pincode,
      estimatedDeliveryTime: row.estimated_delivery_time ?? null,
      deliveryAvailable: Boolean(row.delivery_available),
      pickupAvailable: Boolean(row.pickup_available),
      category: row.category_id
        ? {
          id: row.category_id,
          name: row.category_name,
          slug: row.category_slug,
          iconUrl: row.category_icon,
        }
        : null,
    }));

    let nextCursor = null;
    if (shops.length > pageSize) {
      const nextItem = shops.pop(); // Remove 1 extra item
      nextCursor = nextItem.id;
    }

    const payload = {
      success: true,
      pincode,
      count: shops.length,
      nextCursor,
      shops,
    };

    // Store in Cache
    directoryCache.set(cacheKey, {
      payload,
      timestamp: Date.now(),
    });

    const executionTimeMs = Date.now() - startTime;
    res.setHeader('X-Cache-Source', 'database');
    res.setHeader('X-Response-Time', `${executionTimeMs}ms`);

    // Audit Log for Slow Queries (>100ms)
    if (executionTimeMs > 100) {
      console.warn(`⚠️ [SLOW QUERY AUDIT] /api/shops/pincode/${pincode} took ${executionTimeMs}ms`);
    }

    return res.json(payload);
  } catch (error) {
    next(error);
  }
}

/**
 * Utility to invalidate pincode cache on shop update
 */
function invalidatePincodeCache(pincode) {
  for (const key of directoryCache.keys()) {
    if (key.startsWith(`pincode:${pincode}:`)) {
      directoryCache.delete(key);
    }
  }
}

module.exports = {
  getShopsByPincode,
  invalidatePincodeCache,
};
