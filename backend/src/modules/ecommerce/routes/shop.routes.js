const express = require('express');
const router = express.Router();

/**
 * Words that are routes, not shop ids.
 *
 * `/:id/staff` and `/:id/products` are registered before the owner routes
 * `/my-shop/staff` and `/my-shop/products`, so a request for the owner's own
 * staff list matched the public handler with id = 'my-shop'. The owner's staff
 * screen got an empty list, and "add staff" and "add product" hit a handler that
 * looks for a shop called 'my-shop'. `next('route')` hands the request on to the
 * next matching route instead.
 */
const RESERVED_SHOP_SEGMENTS = new Set(['my-shop']);
router.param('id', (req, res, next, id) => (RESERVED_SHOP_SEGMENTS.has(id) ? next('route') : next()));
const { query, queryOne, withTransaction } = require('../../../config/database');
const payments = require('../../../services/payments.service');
const orderPlacement = require('../../../services/orderPlacement.service');
const platformConfig = require('../../../services/platformConfig.service');
const { placeholders } = require('../../../utils/sqlList');
const { apiCache } = require('../../../middleware/cache.middleware');
const { generateMockProducts, generateMockServices, generateMockStaff } = require('../../../utils/mockDataGenerator');

// Mock catalog data was served on every request where NODE_ENV !== 'production'.
// That is not just local development: staging, QA and any preview deploy all
// matched it, so those environments answered with invented shops, invented
// products at invented prices, and invented *named* staff with fabricated
// ratings and years of experience — and the mobile storefront wires those
// records straight into the real cart and checkout. Serving fiction is now an
// explicit opt-in rather than the default for everything that is not prod.
// Read at call time so tests and local runs can toggle it.
const useMockCatalog = () =>
  process.env.USE_MOCK_CATALOG === 'true' && process.env.NODE_ENV !== 'production';
const { authenticate } = require('../../../middleware/auth.middleware');
const crypto = require('crypto');
// NOW() is PostgreSQL-only; SQLite needs CURRENT_TIMESTAMP.
const NOW = process.env.USE_SQLITE === 'true' ? 'CURRENT_TIMESTAMP' : 'NOW()';

const { autoCreateShopDelivery } = require('../../services/controllers/delivery.controller');
const geo = require('../../../utils/geo');

// Payments for a shop order go through services/payments.service.js
// (POST /payments/razorpay/order with purpose 'shop_order'). A Razorpay client
// used to be built here with 'rzp_test_mockkey' / 'mocksecret' as fallbacks and
// then never used.

// Distance now comes from src/utils/geo.js. The local copy guarded with
// `if (!lat1 || !lon1 || ...) return Infinity`, which rejects a coordinate of
// exactly 0 as missing — harmless for India, wrong anywhere on the equator or
// the prime meridian, and wrong silently: the shop simply stops appearing in
// proximity results. geo.distanceKm distinguishes absent from zero.
const getDistanceFromLatLonInKm = geo.distanceKm;
const deg2rad = geo.toRad;

const CacheService = require('../../../services/cache.service');
const AuditLogger = require('../../../services/audit.logger');
const logger = require('../../../config/logger');
const SearchEngine = require('../../../services/search.engine');

// GET /search via Typesense AI Search Engine
router.get('/search', async (req, res, next) => {
  try {
    const { q, category, lat, lng, radius = 10, limit = 20 } = req.query;
    
    // Log intent parsing to BullMQ audit pipeline
    AuditLogger.log('ai_search_query', { query: q, category, lat, lng, ip: req.ip });

    const searchResults = await SearchEngine.searchShops({
      query: q,
      category,
      lat,
      lng,
      radius_km: radius,
      limit: parseInt(limit)
    });

    if (searchResults) {
      return res.json({ success: true, source: 'typesense', data: searchResults, shops: searchResults });
    }

    // SearchEngine returns null whenever Typesense is unreachable, and
    // Typesense is not provisioned in this deployment — so this endpoint
    // answered `503 Search Engine Offline` for every query ever made to it.
    // Shop search was simply dead, and nothing surfaced that fact: the client
    // showed an empty result list.
    //
    // Falls through to the in-process hybrid searcher, which fuses the FTS5
    // index with content vectors and depends on no external service. Typesense
    // remains the preferred path when it is actually configured.
    const hybrid = require('../../ml/services/search.service');
    const result = await hybrid.search(q, {
      limit: parseInt(limit, 10) || 20,
      categorySlug: category || null,
    });

    const items = result.items.map((item) => {
      const out = { ...item };
      delete out._fusion_score;
      return out;
    });

    // `success` and `shops` are what the web and mobile search screens read; the body carried only
    // `data`, so neither ever showed a result.
    return res.json({
      success: true,
      source: 'hybrid',
      strategy: result.strategy,
      retrievers: result.retrievers || null,
      data: items,
      shops: items,
    });
  } catch (error) { next(error); }
});
router.get('/categories', async (req, res, next) => {
  try {
    if (useMockCatalog()) {
      try {
        const fs = require('fs'); const path = require('path');
        const mockPath = path.resolve(__dirname, '../../../../../packages/mock-data/seeds/shops_directory.json');
        if (fs.existsSync(mockPath)) {
          const sData = JSON.parse(fs.readFileSync(mockPath, 'utf8'));
          const cats = [...new Set(sData.shops.map(s => s.category))].map((c, i) => ({ id: i + 1, name: c, slug: c.toLowerCase().replace(/ /g, '-'), icon_url: '' }));
          return res.json({ success: true, categories: cats });
        }
      } catch (e) { next(e); }
    }
    AuditLogger.log('api_access', { endpoint: '/categories', ip: req.ip });

    const result = await CacheService.getOrSet('shop:categories:active', 3600, async () => {
      const categories = await query("SELECT * FROM shop_categories WHERE is_active = '1' OR is_active = '1' ORDER BY display_order ASC");
      return categories.rows || categories;
    });

    res.setHeader('X-Cache-Source', result.source);
    res.json(result.data);
  } catch (error) {
    next(error);
  }
});

// ─── Shop detail, nearby and the owner's own shop ────────────────────────────
//
// GET /nearby, GET /my-shop and GET /:id were deleted by accident on
// 2026-09-17 (commit d57cb2a, a range replacement that cut further than it
// meant to). Every client that opens a shop — the web shop page and its
// checkout, the web shop listing, the mobile shop screens and the merchant
// dashboards — has been answered 404 since. They are restored here.

// What a visitor may see of a shop. The old GET /:id returned SELECT *,
// which included the shop's bank account, its registration documents and its
// negotiated commission terms.
const PUBLIC_SHOP_COLUMNS = [
  'id', 'owner_id', 'region_id', 'name', 'description', 'category', 'category_id', 'shop_type',
  'phone_number', 'address', 'pincode', 'latitude', 'longitude', 'opening_hours', 'photo_urls', 'tags',
  'is_verified', 'is_premium', 'is_featured', 'rating', 'delivery_available', 'pickup_available',
  'self_delivery_available', 'dine_in_available', 'accepts_walkin', 'estimated_delivery_time',
  'busy_status', 'avg_wait_minutes', 'management_archetype', 'gst_number', 'created_at',
];
const publicShop = (row) => {
  if (!row) return row;
  const out = {};
  for (const key of PUBLIC_SHOP_COLUMNS) if (row[key] !== undefined) out[key] = row[key];
  return out;
};
const truthyFlag = (v) => v === 1 || v === true || v === '1';

/**
 * GET /shops/nearby?lat&lng&radius&category&pincode&region_id&topRated&deliveryOnly&sortBy
 *
 * Shops within `radius` km (default 10, at most 50). Without a location the
 * old handler assumed one — a fixed point in Pune, as though that were the
 * visitor's — and sorted by distance from it. Now it lists shops without
 * distances and says so (fallbackUsed: true, userLocation: null).
 *
 * Distance is a bounding box in SQL (index-friendly, and works on both
 * engines) and the exact great-circle distance in JS.
 */
router.get('/nearby', async (req, res, next) => {
  try {
    const { category, region_id: regionId, pincode, topRated, deliveryOnly, sortBy } = req.query;
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const located = req.query.lat !== undefined && req.query.lng !== undefined
      && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
    const radiusKm = Math.min(Math.max(Number(req.query.radius) || 10, 0.5), 50);

    const params = [];
    const conditions = ["COALESCE(s.is_active, 1) = 1"];
    if (located) {
      const latDelta = radiusKm / 111.32;
      const lngDelta = radiusKm / (111.32 * Math.max(Math.cos((lat * Math.PI) / 180), 0.01));
      params.push(lat - latDelta, lat + latDelta, lng - lngDelta, lng + lngDelta);
      conditions.push('s.latitude BETWEEN $1 AND $2', 's.longitude BETWEEN $3 AND $4');
    }
    if (category && category !== 'all') {
      params.push(String(category));
      conditions.push(`s.category_id = (SELECT id FROM shop_categories WHERE slug = $${params.length} LIMIT 1)`);
    }
    if (regionId) {
      params.push(String(regionId));
      conditions.push(`s.region_id = $${params.length}`);
    }
    if (pincode) {
      params.push(String(pincode));
      conditions.push(`s.pincode = $${params.length}`);
    }
    if (topRated === 'true') conditions.push('s.rating >= 4.0');
    if (deliveryOnly === 'true') conditions.push("CAST(s.delivery_available AS TEXT) IN ('1', 'true')");

    const result = await query(
      `SELECT s.*, c.slug AS category_slug, c.name AS category_name
         FROM local_shops s
         LEFT JOIN shop_categories c ON c.id = s.category_id
        WHERE ${conditions.join(' AND ')}
        ORDER BY s.created_at DESC
        LIMIT 500`,
      params
    );

    let shops = (result.rows || result || []).map((row) => ({
      ...publicShop(row),
      category_slug: row.category_slug,
      category_name: row.category_name,
      distance_km: located ? geo.distanceKm(lat, lng, Number(row.latitude), Number(row.longitude)) : null,
    }));
    if (located) {
      // The box is square; the radius is a circle.
      shops = shops
        .filter((shop) => Number.isFinite(shop.distance_km) && shop.distance_km <= radiusKm)
        .map((shop) => ({ ...shop, distance_km: Math.round(shop.distance_km * 100) / 100 }));
    }

    const byDistance = (a, b) => (located ? a.distance_km - b.distance_km : 0);
    if (sortBy === 'rating') {
      shops.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0) || byDistance(a, b));
    } else if (sortBy === 'newest') {
      shops.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
    } else if (sortBy === 'name') {
      shops.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    } else {
      // Premium, then featured, then nearest.
      shops.sort((a, b) => (Number(truthyFlag(b.is_premium)) - Number(truthyFlag(a.is_premium)))
        || (Number(truthyFlag(b.is_featured)) - Number(truthyFlag(a.is_featured)))
        || byDistance(a, b));
    }

    res.json({
      shops: shops.slice(0, 200),
      userLocation: located ? { lat, lng } : null,
      radiusKm: located ? radiusKm : null,
      fallbackUsed: !located,
      strictRegion: Boolean(regionId),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /shops/my-shop — the signed-in owner's shop, with what its dashboard
 * shows: products and orders for a shop that sells, services and
 * appointments for one that takes bookings.
 */
router.get('/my-shop', authenticate, async (req, res, next) => {
  try {
    const shop = await queryOne('SELECT * FROM local_shops WHERE owner_id = $1 ORDER BY created_at ASC LIMIT 1', [req.user.id]);
    if (!shop) return res.status(404).json({ error: 'No shop registered for this account' });

    const category = shop.category_id
      ? await queryOne('SELECT * FROM shop_categories WHERE id = $1', [shop.category_id])
      : null;
    const model = String((category && category.business_model) || 'hybrid').toLowerCase();
    const sells = ['product', 'both', 'hybrid'].includes(model);
    const books = ['appointment', 'both', 'hybrid'].includes(model);

    const many = async (sql, params) => {
      const r = await query(sql, params);
      return r.rows || r || [];
    };
    const [products, orders, services, appointments, staff] = await Promise.all([
      sells ? many('SELECT * FROM shop_products WHERE shop_id = $1 ORDER BY created_at DESC', [shop.id]) : [],
      sells ? many('SELECT * FROM orders WHERE shop_id = $1 ORDER BY created_at DESC LIMIT 50', [shop.id]) : [],
      books ? many('SELECT * FROM shop_services WHERE shop_id = $1', [shop.id]) : [],
      books
        ? many(
          `SELECT a.*, COALESCE(a.customer_name, u.full_name) AS customer_name, sv.name AS service_name
             FROM shop_appointments a
             LEFT JOIN users u ON u.id = a.user_id
             LEFT JOIN shop_services sv ON sv.id = a.service_id
            WHERE a.shop_id = $1
            ORDER BY a.appointment_date DESC
            LIMIT 50`,
          [shop.id]
        )
        : [],
      many('SELECT * FROM shop_staff WHERE shop_id = $1', [shop.id]),
    ]);

    // The owner's own shop: every column, bank details included.
    res.json({ shop: { ...shop, category_details: category }, products, services, staff, orders, appointments });
  } catch (error) {
    next(error);
  }
});

// GET all shops (with cursor-based pagination and admin filtering)
router.get('/', async (req, res, next) => {
  try {
    const { limit = 20, cursor, search = '', status } = req.query;

    /**
     * Reads local_shops on every engine.
     *
     * This used to branch: SQLite read local_shops directly and everything else
     * went through `prisma.shop.findMany`. Prisma's Shop model is `@@map`ped to
     * `shops`, which is a different table from the `local_shops` that
     * POST /shops/register writes to — so on PostgreSQL a shop could register
     * successfully and never appear in the listing that is supposed to show it.
     * The owner saw their shop in their own dashboard, which reads local_shops,
     * and nowhere a customer would look.
     *
     * The branch was introduced as a local-dev workaround and quietly became
     * the only thing keeping the two halves apart. Reading the table the writes
     * already target is the smaller change and the correct one; it needs no
     * data migration and is engine-independent.
     */
    const take = Math.min(parseInt(limit, 10) || 20, 100);
    const params = [];
    const conditions = ['1 = 1'];

    if (search) {
      params.push(`%${search}%`);
      const namePlaceholder = `$${params.length}`;
      params.push(`%${search}%`);
      conditions.push(`(name LIKE ${namePlaceholder} OR description LIKE $${params.length})`);
    }

    if (status) {
      params.push(status);
      conditions.push(`approval_status = $${params.length}`);
    }

    // Keyset pagination on created_at, matching the ordering below. The Prisma
    // version paginated on an id cursor; ids here are UUIDs, so ordering by one
    // is meaningless and the cursor has to follow the sort key.
    if (cursor) {
      params.push(cursor);
      conditions.push(`created_at < $${params.length}`);
    }

    params.push(take);

    const result = await query(
      `SELECT * FROM local_shops
        WHERE ${conditions.join(' AND ')}
        ORDER BY created_at DESC
        LIMIT $${params.length}`,
      params
    );

    const shops = result.rows || result || [];
    const nextCursor = shops.length === take && shops.length > 0
      ? shops[shops.length - 1].created_at
      : null;

    res.json({ data: shops, nextCursor, limit: take });
  } catch (error) {
    next(error);
  }
});

/**
 * Validates a shop registration payload.
 *
 * Nothing validated this before: name, coordinates, phone and category all went
 * straight into the INSERT. The consequences were quiet rather than loud.
 *
 * A shop with null coordinates inserts fine and then never appears in a
 * proximity search: every distance against it is Infinity, so it sorts last
 * forever and the owner concludes the platform does not work. A shop at
 * (0, 0) is worse — it is a real point in the Gulf of Guinea, so it sorts by a
 * genuine distance and appears in searches thousands of kilometres away.
 *
 * A category_id that names no row leaves the shop unroutable: the visitor view
 * falls back to the generic one, and the commission lookup has no rate to read.
 *
 * Returns an array of problems; empty means valid.
 */
function validateShopRegistration(body) {
  const problems = [];

  if (!body.name || !String(body.name).trim()) {
    problems.push({ field: 'name', message: 'A shop name is required.' });
  }

  if (!body.address || !String(body.address).trim()) {
    problems.push({ field: 'address', message: 'An address is required.' });
  }

  const lat = Number(body.latitude);
  const lng = Number(body.longitude);

  if (body.latitude === null || body.latitude === undefined || body.latitude === '' || !Number.isFinite(lat)) {
    problems.push({ field: 'latitude', message: 'A latitude is required to place the shop on the map.' });
  } else if (lat < -90 || lat > 90) {
    problems.push({ field: 'latitude', message: 'Latitude must be between -90 and 90.' });
  }

  if (body.longitude === null || body.longitude === undefined || body.longitude === '' || !Number.isFinite(lng)) {
    problems.push({ field: 'longitude', message: 'A longitude is required to place the shop on the map.' });
  } else if (lng < -180 || lng > 180) {
    problems.push({ field: 'longitude', message: 'Longitude must be between -180 and 180.' });
  }

  // Exactly (0, 0) is almost always an uninitialised location object rather
  // than a shop in the Atlantic, and it is far more damaging than a null
  // because it looks like a real position.
  if (Number.isFinite(lat) && Number.isFinite(lng) && lat === 0 && lng === 0) {
    problems.push({
      field: 'latitude',
      message: 'The coordinates are (0, 0), which is in the ocean. Set the shop location on the map.',
    });
  }

  if (body.phoneNumber !== undefined && body.phoneNumber !== null && String(body.phoneNumber).trim() !== '') {
    // Indian mobile numbers: ten digits starting 6-9, optionally with +91 and
    // whatever spacing or dashes the person typed.
    const digits = String(body.phoneNumber).replace(/[\s()+-]/g, '').replace(/^91(?=\d{10}$)/, '');
    if (!/^[6-9]\d{9}$/.test(digits)) {
      problems.push({ field: 'phoneNumber', message: 'Enter a valid 10-digit Indian mobile number.' });
    }
  }

  for (const field of ['openingHours', 'bank_account', 'registration_metadata']) {
    const value = body[field];
    if (value === undefined || value === null) continue;
    if (typeof value === 'object') continue;

    // A string here is either JSON the client stringified itself or junk.
    // JSON.stringify would happily wrap the junk in quotes and store it, and
    // the next reader would get a string where it expected an object.
    try {
      JSON.parse(value);
    } catch {
      problems.push({ field, message: `${field} must be an object or valid JSON.` });
    }
  }

  return problems;
}

router.post('/register', authenticate, async (req, res, next) => {
  try {
    const problems = validateShopRegistration(req.body || {});
    if (problems.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'This shop cannot be registered yet.',
        problems,
      });
    }

    const { name, description, category_id, phoneNumber, address, latitude, longitude, openingHours, photoUrls, delivery_available, pickup_available, estimated_delivery_time, gst_number, bank_account, registration_metadata } = req.body;

    // A category that names no row leaves the shop unroutable: the visitor view
    // falls back to the generic one and the commission lookup has no rate.
    //
    // local_shops.category is the category's display name and is NOT NULL on
    // both engines. The INSERT below never supplied it, so a payload that
    // passed every check still failed on the constraint and answered 500. It
    // is taken from the category row so the name and the id cannot disagree,
    // with a free-text `category` accepted for callers that have no id.
    let categoryName = typeof req.body.category === 'string' ? req.body.category.trim() : '';
    if (category_id) {
      const category = await queryOne('SELECT id, name FROM shop_categories WHERE id = $1', [category_id]);
      if (!category) {
        return res.status(400).json({
          success: false,
          error: 'This shop cannot be registered yet.',
          problems: [{ field: 'category_id', message: 'That category does not exist.' }],
        });
      }
      categoryName = category.name;
    }
    if (!categoryName) {
      return res.status(400).json({
        success: false,
        error: 'This shop cannot be registered yet.',
        problems: [{ field: 'category_id', message: 'Choose a category for the shop.' }],
      });
    }

    // Generate UUID if DB doesn't auto-gen string IDs easily (using crypto)
    const id = crypto.randomUUID();

    // `coordinate` is NOT NULL as well. PostgreSQL has a trigger that derives
    // it from latitude/longitude (migration 074), but only where PostGIS is
    // installed, and SQLite has no such trigger. Both numbers have already been
    // range-checked by validateShopRegistration, and are re-coerced here so
    // that what reaches the SQL text is a number and nothing else.
    const lat = Number(latitude);
    const lng = Number(longitude);
    const coordinate = `ST_GeomFromText('POINT(${lng} ${lat})', 4326)`;

    // `phone`, not `phone_number`: the live local_shops table has phone, while
    // only the PostgreSQL DDL spelled it phone_number. Shop registration failed
    // outright on SQLite because of it. Migration 070 renames the PostgreSQL
    // column to match, making `phone` correct on both engines.
    const shop = await queryOne(`INSERT INTO local_shops (id, owner_id, region_id, name, description, category_id, category, phone, address, coordinate, latitude, longitude, opening_hours, photo_urls, delivery_available, pickup_available, estimated_delivery_time, gst_number, bank_account, registration_metadata, approval_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, ${coordinate}, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, 'pending')
       RETURNING *`,
      // region_id, not regionId: req.user is the users row as stored, so the
      // camelCase read was always undefined and every shop registered with no
      // region — invisible to any region-scoped listing.
      [id, req.user.id, req.user.region_id || null, String(name).trim(), description || null, category_id || null, categoryName, phoneNumber || null, String(address).trim(), lat, lng, JSON.stringify(openingHours || {}), JSON.stringify(photoUrls || []), delivery_available ? 1:0, pickup_available ? 1:0, estimated_delivery_time || null, gst_number || null, JSON.stringify(bank_account||{}), JSON.stringify(registration_metadata||{})]
    );

    // Auto-generate QR code
    const qrData = `https://localsampark.in/shops/${id}?walkin=true`;
    await query(`INSERT INTO shop_qr_codes (id, shop_id, qr_data) VALUES ($1, $2, $3)`, [crypto.randomUUID(), id, qrData]);

    res.status(201).json(shop);
  } catch (error) {
    next(error);
  }
});

// --- PRODUCTS ---
router.get('/:id/products', async (req, res, next) => {
  try {
    if (useMockCatalog()) {
      const shopRow = await queryOne('SELECT c.slug FROM local_shops s JOIN shop_categories c ON s.category_id = c.id WHERE s.id = $1', [req.params.id]);
      const category = shopRow ? shopRow.slug : 'default';
      return res.json(generateMockProducts(category));
    }
    const products = await query('SELECT * FROM shop_products WHERE shop_id = $1 AND is_available = true', [req.params.id]);
    res.json(products.rows || products);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/products', authenticate, async (req, res, next) => {
  try {
    // This route was `authenticate` only — no ownership check at all — so any
    // signed-in account could insert products into any shop's catalog, and those
    // rows are what the storefront lists and what checkout prices.
    const shop = await queryOne('SELECT id, owner_id FROM local_shops WHERE id = $1', [req.params.id]);
    if (!shop) return res.status(404).json({ error: 'Shop not found' });

    const isAdmin = req.user.role === 'admin' || req.user.role === 'super_admin';
    if (!isAdmin && shop.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'You do not own this shop' });
    }

    const { name, description, price, imageUrl } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Product name is required' });
    }

    // shop_products.id is a TEXT primary key with no default. The insert omitted
    // it, which SQLite happily accepts as NULL (only INTEGER PRIMARY KEY
    // auto-assigns), so products were created with no id and could never be
    // added to a cart or ordered.
    const id = crypto.randomUUID();
    const product = await queryOne(
      `INSERT INTO shop_products (id, shop_id, name, description, price, image_url, is_available, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, '1', 1) RETURNING *`,
      [id, req.params.id, String(name).trim(), description || null, Number(price) || 0, imageUrl || null]
    );
    res.status(201).json(product || { id, shop_id: req.params.id, name });
  } catch (error) {
    next(error);
  }
});

// --- SERVICES ---
router.get('/:id/services', async (req, res, next) => {
  try {
    if (useMockCatalog()) {
      const shopRow = await queryOne('SELECT c.slug FROM local_shops s JOIN shop_categories c ON s.category_id = c.id WHERE s.id = $1', [req.params.id]);
      const category = shopRow ? shopRow.slug : 'default';
      return res.json(generateMockServices(category));
    }
    const services = await query('SELECT * FROM shop_services WHERE shop_id = $1 AND is_available = \'1\' ORDER BY display_order ASC', [req.params.id]);
    res.json(services.rows || services);
  } catch (error) {
    next(error);
  }
});

/**
 * Ends the request unless the caller owns the shop in :id or is an admin.
 * Returns true when the handler may go on.
 *
 * POST /:id/products was given this check after it was found that any
 * signed-in account could write into any shop's catalogue. The two routes
 * below it had exactly the same gap and were missed: anyone could add a
 * service, at a price of their choosing, or a staff member to a shop that was
 * not theirs, and both are what the storefront shows and the booking flow
 * charges for.
 */
async function ownsShopOr403(req, res) {
  const shop = await queryOne('SELECT id, owner_id FROM local_shops WHERE id = $1', [req.params.id]);
  if (!shop) {
    res.status(404).json({ error: 'Shop not found' });
    return false;
  }
  const isAdmin = req.user.role === 'admin' || req.user.role === 'super_admin';
  if (!isAdmin && String(shop.owner_id) !== String(req.user.id)) {
    res.status(403).json({ error: 'You do not own this shop' });
    return false;
  }
  return true;
}

router.post('/:id/services', authenticate, async (req, res, next) => {
  try {
    if (!(await ownsShopOr403(req, res))) return;

    const { name, description, duration_minutes, price, image_url, category, display_order } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Service name is required' });
    }
    const s = await queryOne(`INSERT INTO shop_services (id, shop_id, name, description, duration_minutes, price, image_url, category, display_order) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [crypto.randomUUID(), req.params.id, name, description, duration_minutes, price, image_url, category, display_order]
    );
    res.status(201).json(s);
  } catch (error) {
    next(error);
  }
});

// --- STAFF ---
router.get('/:id/staff', async (req, res, next) => {
  try {
    if (useMockCatalog()) {
      const shopRow = await queryOne('SELECT c.slug FROM local_shops s JOIN shop_categories c ON s.category_id = c.id WHERE s.id = $1', [req.params.id]);
      const category = shopRow ? shopRow.slug : 'default';
      return res.json(generateMockStaff(category));
    }
    // Public: this is the stylist/doctor picker on a shop page. It was
    // SELECT *, which also returned each person's email, phone, shift,
    // commission and total revenue to anyone who asked. The owner's own list
    // (/my-shop/staff) still returns everything.
    const staff = await query(
      `SELECT id, shop_id, name, role, profile_image, specialization, experience_years,
              avg_rating, bio, portfolio_photos, availability
         FROM shop_staff WHERE shop_id = $1 AND is_active = '1'`,
      [req.params.id]
    );
    res.json(staff.rows || staff);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/staff', authenticate, async (req, res, next) => {
  try {
    if (!(await ownsShopOr403(req, res))) return;

    const { name, role, profileImage, specialization, phone_number, experience_years } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Staff name is required' });
    }
    const s = await queryOne(`INSERT INTO shop_staff (shop_id, name, role, profile_image, specialization, phone_number, experience_years) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.params.id, name, role, profileImage, specialization, phone_number, experience_years]
    );
    res.status(201).json(s);
  } catch (error) {
    next(error);
  }
});

router.get('/:id/staff/:sid/slots', async (req, res, next) => {
    try {
        if (useMockCatalog()) {
            const slots = [];
            const startHour = 10;
            for(let i=0; i<6; i++) {
                const hour = startHour + i;
                const timeStr = hour > 12 ? `${hour-12}:00 PM` : `${hour}:00 ${hour===12?'PM':'AM'}`;
                slots.push({
                    id: `slot_${hour}`,
                    time: timeStr,
                    surgeMultiplier: i === 2 || i === 3 ? 1.2 : 1.0,
                    status: (hour % 4 === 0) ? 'booked' : 'available'
                });
            }
            return res.json({ slots });
        }
        const { date } = req.query; // "YYYY-MM-DD"
        if (!date) return res.status(400).json({error: "Date required"});
        const dayOfWeek = new Date(date).getDay();

        let schedule = await queryOne('SELECT * FROM staff_availability WHERE staff_id = $1 AND day_of_week = $2 AND is_available = \'1\'', [req.params.sid, dayOfWeek]);
        if (!schedule) return res.json({ slots: [], message: 'Staff not available on this day' });
        
        let offDay = await queryOne('SELECT * FROM staff_off_days WHERE staff_id = $1 AND off_date = $2', [req.params.sid, date]);
        if (offDay) return res.json({ slots: [], message: 'Staff is on leave' });

        // Generate slots
        const startTotalMins = parseInt(schedule.start_time.split(':')[0])*60 + parseInt(schedule.start_time.split(':')[1]);
        const endTotalMins = parseInt(schedule.end_time.split(':')[0])*60 + parseInt(schedule.end_time.split(':')[1]);
        const allSlots = [];
        for(let m = startTotalMins; m + schedule.slot_duration_minutes <= endTotalMins; m += schedule.slot_duration_minutes) {
            const h = Math.floor(m/60).toString().padStart(2, '0');
            const mm = (m%60).toString().padStart(2, '0');
            allSlots.push(`${h}:${mm}`);
        }

        const booked = await query("SELECT time_slot FROM shop_appointments WHERE staff_id = $1 AND appointment_date = $2 AND status != 'cancelled'", [req.params.sid, date]);
        const bookedSet = new Set((booked.rows||booked).map(b => b.time_slot));

        // Surge pricing
        const surgeRules = await query('SELECT * FROM surge_pricing_rules WHERE shop_id = $1 AND (day_of_week = $2 OR day_of_week IS NULL) AND is_active = \'1\'', [req.params.id, dayOfWeek]);
        
        const slots = allSlots.filter(s => !bookedSet.has(s)).map(s => {
            let multiplier = 1.0;
            // Basic surge check logic
            (surgeRules.rows||surgeRules).forEach(r => {
                if (s >= r.start_time && s <= r.end_time) {
                    multiplier = r.surge_multiplier;
                }
            });
            return { time: s, surgeMultiplier: multiplier };
        });

        res.json({ slots });
    } catch(err) {
        next(err);
    }
});

// --- APPOINTMENTS & ORDERS ---
router.post('/:id/appointments', authenticate, async (req, res, next) => {
  try {
    const { serviceSlotId, scheduledDate, scheduledTime, paymentMethod, customerNotes, patientSymptoms } = req.body;
    
    // Fetch service slot
    /*
     * Rewritten off Prisma. `ServiceSlot` is @@mapped to `service_slots` and
     * `Appointment` to `appointments` — neither table exists here. The real
     * ones are `shop_services` and `shop_appointments`, and the unique index
     * migration 106 adds (and which the comment below relies on) is on
     * shop_appointments (shop_id, staff_id, appointment_date, time_slot). So
     * the index was never protecting the code path actually in use.
     */
    const slot = await queryOne(
      'SELECT * FROM shop_services WHERE id = $1 AND shop_id = $2',
      [serviceSlotId, req.params.id]
    );
    if (!slot) return res.status(404).json({ error: 'Service slot not found' });

    // Refuse a slot that is already taken.
    //
    // Migration 106 makes this impossible at the database level, which is what
    // actually holds under concurrency — two customers tapping "confirm" on the
    // last evening slot at the same moment. This check exists so the ordinary
    // case gets a clear 409 rather than a constraint-violation stack trace.
    const clash = await queryOne(
      `SELECT id FROM shop_appointments
        WHERE shop_id = $1
          AND appointment_date = $2
          AND time_slot = $3
          AND UPPER(COALESCE(status, '')) NOT IN ('CANCELLED', 'NO_SHOW')
        LIMIT 1`,
      [req.params.id, scheduledDate, scheduledTime]
    );

    if (clash) {
      return res.status(409).json({
        success: false,
        error: 'That slot has just been taken. Please choose another time.',
        code: 'SLOT_UNAVAILABLE',
      });
    }

    // crypto.randomUUID rather than Date.now()+random(1000). The old form drew
    // from a thousand values inside a single millisecond, so two simultaneous
    // bookings collided about once in a thousand — rare enough to survive
    // testing and frequent enough to happen in production.
    const appointmentId = crypto.randomUUID();
    const bookingNumber = 'LS-BK-' + crypto.randomUUID();

    try {
      await query(
        `INSERT INTO shop_appointments
           (id, shop_id, user_id, service_id, appointment_date, time_slot,
            status, payment_method, payment_status, service_price, final_price,
            customer_notes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'REQUESTED', $7, 'pending', $8, $8, $9, ${NOW})`,
        [
          appointmentId, req.params.id, req.user.id, serviceSlotId,
          scheduledDate, scheduledTime, paymentMethod || 'COD',
          slot.price, customerNotes || null,
        ]
      );
    } catch (e) {
      // The unique index is the real guard; translate its violation into the
      // same 409 the pre-check returns rather than a 500.
      if (/UNIQUE|duplicate key/i.test(e.message || '')) {
        return res.status(409).json({
          success: false,
          error: 'That slot has just been taken. Please choose another time.',
          code: 'SLOT_UNAVAILABLE',
        });
      }
      throw e;
    }

    const appt = await queryOne('SELECT * FROM shop_appointments WHERE id = $1', [appointmentId]);

    res.status(201).json({
      success: true,
      appointment: {
        ...appt,
        bookingNumber,
        serviceName: slot.name,
        durationMinutes: slot.duration_minutes,
        patientSymptoms: patientSymptoms || null,
      },
    });
  } catch (error) {
    // The index fired, meaning another request claimed the slot between the
    // check above and this insert. That is the race the index exists for, and
    // the customer should see the same message as the ordinary clash.
    if (error && (error.code === 'P2002' || /unique|duplicate/i.test(error.message || ''))) {
      return res.status(409).json({
        success: false,
        error: 'That slot has just been taken. Please choose another time.',
        code: 'SLOT_UNAVAILABLE',
      });
    }
    next(error);
  }
});

/**
 * POST /shops/:id/orders — order from one shop's page.
 *
 * This wrote to shop_orders, a table that the merchant's order queue, the
 * rider's job list and the customer's tracking screen do not read: an order
 * placed here was paid for and then seen by nobody. It also took the total
 * from the request, checked only against a floor.
 *
 * It now places the order through orderPlacement.service — the same path as
 * POST /checkout — so it lands in `orders`, priced from the catalogue, with
 * the delivery charge worked out from the distance to the customer.
 *
 * body: { items: [{ id, quantity, type? }], paymentMethod, deliveryType,
 *         deliveryAddress, deliveryCoordinate: { lat, lng } | addressId,
 *         appointmentDetails? }
 *
 * A service in the cart is booked as an appointment and paid at the shop.
 */
router.post('/:id/orders', authenticate, async (req, res, next) => {
  try {
    const body = req.body || {};
    const { items, appointmentDetails } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'items must be a non-empty list.' });
    }
    const method = payments.paymentMethod(body.paymentMethod);
    if (!method) {
      return res.status(400).json({ success: false, error: 'paymentMethod must be cod, razorpay or wallet.' });
    }

    const productItems = items.filter(item => item && item.type !== 'service');
    const serviceItems = items.filter(item => item && item.type === 'service');
    if (serviceItems.length > 0 && !appointmentDetails) {
      // These were dropped without a word: the customer was told the order had
      // been placed and no appointment existed.
      return res.status(400).json({ success: false, error: 'appointmentDetails is required to book a service.' });
    }

    const shop = await queryOne('SELECT id FROM local_shops WHERE id = $1', [req.params.id]);
    if (!shop) {
      return res.status(404).json({ success: false, error: 'Shop not found.' });
    }

    // 1. The products: one order, through the shared placement path.
    let placed = null;
    if (productItems.length > 0) {
      placed = await orderPlacement.placeOrder({
        user: req.user,
        shopId: req.params.id,
        items: productItems.map(item => ({ productId: item.productId ?? item.product_id ?? item.id, quantity: item.quantity ?? 1 })),
        body,
        method,
      });

      const io = req.app?.get ? req.app.get('io') : null;
      if (io) io.emit(`vendor:orders:${req.params.id}`, { event: 'ORDER_CREATED', order: placed.order });
    }

    // 2. Handle services (Hybrid Cart Support). Paid at the shop.
    const createdAppointments = [];
    for (const service of serviceItems) {
      const appt = await queryOne(`INSERT INTO shop_appointments (id, shop_id, staff_id, user_id, service_id, appointment_date, time_slot, payment_method, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending') RETURNING *`,
        [crypto.randomUUID(), req.params.id, appointmentDetails.staffId, req.user.id, service.id, appointmentDetails.appointmentDate, appointmentDetails.timeSlot, 'COD']
      );
      createdAppointments.push(appt);
    }

    res.status(201).json({
      success: true,
      order: placed ? { ...placed.order, items: placed.items } : null,
      bill: placed ? placed.bill : null,
      appointments: createdAppointments,
      payment: placed ? placed.paymentData : null,
      ...(placed && placed.paymentError ? { paymentError: placed.paymentError } : {}),
    });
  } catch (error) {
    if (error instanceof orderPlacement.OrderError) {
      return res.status(error.status).json({ success: false, code: error.code, error: error.message, ...error.details });
    }
    next(error);
  }
});

// State Machine API for Orders
router.put('/orders/:id/status', authenticate, async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'accepted', 'preparing', 'ready_for_pickup', 'dispatched', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    // Who may move an order.
    //
    // This took `authenticate` and updated whichever order id was in the URL:
    // any signed-in account could mark any shop's order delivered or cancelled.
    // The shop's owner (or an admin) runs the order through its states; the
    // customer who placed it may cancel it, and only before the shop has
    // accepted it.
    const existing = await queryOne(
      `SELECT o.id, o.user_id, o.status, s.owner_id
         FROM shop_orders o LEFT JOIN local_shops s ON s.id = o.shop_id
        WHERE o.id = $1`,
      [req.params.id]
    );
    if (!existing) return res.status(404).json({ error: 'Order not found' });

    const isAdmin = req.user.role === 'admin' || req.user.role === 'super_admin';
    const isOwner = existing.owner_id && String(existing.owner_id) === String(req.user.id);
    const isCustomer = existing.user_id && String(existing.user_id) === String(req.user.id);
    const customerCancel = isCustomer && status === 'cancelled' && existing.status === 'pending';
    if (!isAdmin && !isOwner && !customerCancel) {
      return res.status(403).json({ error: 'You cannot change the status of this order' });
    }

    const order = await queryOne('UPDATE shop_orders SET status = $1 WHERE id = $2 RETURNING *', [status, req.params.id]);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Auto-dispatch hook if shop owner marks as ready
    if (status === 'ready_for_pickup' && order.delivery_type === 'delivery') {
      const coords = typeof order.delivery_coordinate === 'string' ? JSON.parse(order.delivery_coordinate) : order.delivery_coordinate;
      await autoCreateShopDelivery(order.id, order.shop_id, order.user_id, coords?.lat || 0, coords?.lng || 0, order.delivery_address, order.items);
    }

    const supabaseRealtime = req.app.get('supabaseRealtime');
    if (supabaseRealtime) {
      supabaseRealtime.broadcast(`order:${order.id}`, 'order:status_update', {
        orderId: order.id,
        status: order.status
      });
    }

    res.json({ success: true, order });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /shops/cart/batch-checkout — one cart, several shops, one delivery.
 *
 * body: { items: [{ shop_id, product_id, quantity }], address,
 *         coordinate: { lat, lng } | addressId, use_coins,
 *         paymentMethod: 'wallet' | 'cod' }
 *
 * What this used to do, in order: write the orders as payment_method 'wallet'
 * without touching the wallet; price each line from whatever product id was
 * sent, for whatever quantity (a negative one reduced the total), counting a
 * product that did not exist as free; charge a flat ₹40 whatever the distance;
 * and award 1% of the total in coins on the spot. So a cart cost nothing and
 * paid a reward for placing it.
 *
 * Now each shop's part is an order placed through orderPlacement.service, all
 * of them — and the payment — in one transaction:
 *
 *   delivery   charged once for the cart: the dearest of the shops' own
 *              distance-based charges, plus delivery_extra_pickup_fee for each
 *              further shop the rider collects from.
 *   fees       the platform fee is charged once; the small-order fee is judged
 *              on the cart as a whole.
 *   payment    wallet (debited inside the transaction — no balance, nothing is
 *              written) or cash. Not Razorpay: one gateway payment settles one
 *              order row.
 *   coins      earned only on a cart that has actually been paid for.
 */
const BATCH_MAX_LINES = 100;

router.post('/cart/batch-checkout', authenticate, async (req, res, next) => {
    try {
        const body = req.body || {};
        const { items, use_coins } = body;
        if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ message: 'Cart is empty' });
        if (items.length > BATCH_MAX_LINES) return res.status(400).json({ message: `A cart can hold at most ${BATCH_MAX_LINES} lines` });

        const method = payments.paymentMethod(body.paymentMethod || 'wallet');
        if (method !== 'wallet' && method !== 'cod') {
            return res.status(400).json({ message: 'A multi-shop cart can be paid from the wallet or on delivery' });
        }

        // Lines grouped by the shop they are from.
        const byShop = new Map();
        for (const item of items) {
            if (!item || !item.shop_id || !item.product_id) {
                return res.status(400).json({ message: 'Each item needs shop_id, product_id and a whole quantity of at least 1' });
            }
            if (!byShop.has(item.shop_id)) byShop.set(item.shop_id, []);
            byShop.get(item.shop_id).push({ productId: item.product_id, quantity: item.quantity });
        }

        // The placement service reads the address and location under these names.
        const orderBody = { ...body, deliveryAddress: body.deliveryAddress ?? body.address, deliveryCoordinate: body.deliveryCoordinate ?? body.coordinate };

        // Price every shop's part first; nothing is written until all of it is good.
        const quotes = [];
        for (const [shopId, lines] of byShop) {
            quotes.push({ shopId, lines, quote: await orderPlacement.quoteOrder({ user: req.user, shopId, items: lines, body: orderBody }) });
        }

        const config = await platformConfig.all();
        const round = (value) => Math.round(value * 100) / 100;
        const itemsTotal = round(quotes.reduce((sum, q) => sum + q.quote.bill.subtotal, 0));

        // One delivery charge for the cart: the dearest leg, plus a pickup fee
        // for each further shop. The shop with the dearest leg carries it.
        quotes.sort((a, b) => b.quote.bill.deliveryFee - a.quote.bill.deliveryFee);
        const freeDelivery = config.delivery_free_above > 0 && itemsTotal >= config.delivery_free_above;
        const smallOrderFee = config.small_order_threshold > 0 && itemsTotal < config.small_order_threshold ? config.small_order_fee : 0;
        quotes.forEach((q, index) => {
            q.fees = {
                deliveryFee: freeDelivery ? 0 : (index === 0 ? q.quote.bill.deliveryFee : config.delivery_extra_pickup_fee),
                platformFee: index === 0 ? config.platform_fee : 0,
                smallOrderFee: index === 0 ? smallOrderFee : 0,
            };
        });
        const totalDeliveryFee = round(quotes.reduce((sum, q) => sum + q.fees.deliveryFee, 0));
        const cartTotal = round(itemsTotal + totalDeliveryFee + config.platform_fee + smallOrderFee);

        if (method === 'cod' && (!config.cod_enabled || (config.cod_max_order_value > 0 && cartTotal > config.cod_max_order_value))) {
            return res.status(400).json({ message: 'Cash on delivery is not available for this cart. Please pay from your wallet.', code: 'COD_NOT_AVAILABLE' });
        }

        const batch_id = crypto.randomUUID();
        const paid = method === 'wallet';

        const outcome = await withTransaction(async (client) => {
            let finalAmount = cartTotal;
            let coinsUsed = 0;

            if (use_coins) {
                const account = (await client.query('SELECT sampark_coins_balance FROM loyalty_accounts WHERE user_id = $1', [req.user.id])).rows[0];
                const available = account ? Math.floor(Number(account.sampark_coins_balance) || 0) : 0;
                if (available > 0) {
                    coinsUsed = Math.min(available, Math.floor(finalAmount));
                    // Guarded by the balance, so two carts checked out at once
                    // cannot both spend the same coins.
                    const burned = await client.query(
                        'UPDATE loyalty_accounts SET sampark_coins_balance = sampark_coins_balance - $1 WHERE user_id = $2 AND sampark_coins_balance >= $1',
                        [coinsUsed, req.user.id]
                    );
                    if (!burned.rowCount) coinsUsed = 0;
                    if (coinsUsed > 0) {
                        finalAmount = round(finalAmount - coinsUsed);
                        await client.query('INSERT INTO loyalty_transactions (id, user_id, amount, transaction_type, reference_id) VALUES ($1, $2, $3, $4, $5)',
                            [crypto.randomUUID(), req.user.id, coinsUsed, 'burned', batch_id]);
                    }
                }
            }

            if (paid && finalAmount > 0) {
                await payments.debitWallet({ userId: req.user.id, amount: finalAmount, purpose: 'batch_order_payment', referenceId: batch_id, client });
            }

            await client.query('INSERT INTO batch_orders (id, user_id, total_batch_amount, combined_delivery_fee, status) VALUES ($1, $2, $3, $4, $5)',
                [batch_id, req.user.id, finalAmount, totalDeliveryFee, 'pending']);

                        // The coins come off the orders themselves, first order first, so
            // that each order's total is what is actually owed for it: a rider
            // collecting cash for one collects the discounted amount, and a
            // refund returns what was paid.
            const placed = [];
            let discountLeft = coinsUsed;
            for (const q of quotes) {
                const before = round(q.quote.bill.subtotal + q.fees.deliveryFee + q.fees.platformFee + q.fees.smallOrderFee);
                const discount = Math.min(discountLeft, before);
                discountLeft = round(discountLeft - discount);
                const result = await orderPlacement.placeOrder({
                    user: req.user, shopId: q.shopId, items: q.lines, body: orderBody, method,
                    batchId: batch_id, client, prepaid: paid, fees: { ...q.fees, discount },
                });
                placed.push(result.order.id);
            }

            // 1% back in coins, on money that has actually been received.
            const earnedCoins = paid ? Math.floor(finalAmount * 0.01) : 0;
            if (earnedCoins > 0) {
                await client.query(`
                    INSERT INTO loyalty_accounts (user_id, sampark_coins_balance) VALUES ($1, $2)
                    ON CONFLICT(user_id) DO UPDATE SET sampark_coins_balance = loyalty_accounts.sampark_coins_balance + excluded.sampark_coins_balance
                `, [req.user.id, earnedCoins]);
                await client.query('INSERT INTO loyalty_transactions (id, user_id, amount, transaction_type, reference_id) VALUES ($1, $2, $3, $4, $5)',
                    [crypto.randomUUID(), req.user.id, earnedCoins, 'earned', batch_id]);
            }

            return { finalAmount, coinsUsed, earnedCoins, orderIds: placed };
        });

        res.json({
            batch_id, totalBatchAmount: itemsTotal, totalDeliveryFee,
            platformFee: config.platform_fee, smallOrderFee,
            finalAmount: outcome.finalAmount, coinsUsed: outcome.coinsUsed, earnedCoins: outcome.earnedCoins,
            orderIds: outcome.orderIds,
            paymentMethod: method, paymentStatus: paid ? 'paid' : 'pending',
        });
    } catch (err) {
        if (err instanceof orderPlacement.OrderError) {
            return res.status(err.status).json({ message: err.message, code: err.code, ...err.details });
        }
        if (err instanceof payments.PaymentError) {
            return res.status(err.status).json({ message: err.message, code: err.code });
        }
        next(err);
    }
});

// Phase 2: Local Highlights (Shop Stories/Reels)
router.get('/highlights/feed', authenticate, async (req, res, next) => {
    try {
        const { lat, lng, radius_km = 10 } = req.query;
        let queryStr = `
            SELECT st.*, s.name as shop_name, s.photo_urls as shop_photos 
            FROM stories st
            JOIN local_shops s ON st.shop_id = s.id
            WHERE st.expires_at > CURRENT_TIMESTAMP 
              AND st.shop_id IS NOT NULL
        `;
        let params = [];
        
        // Simple bounding box logic if lat/lng provided
        if (lat && lng) {
            const latDiff = radius_km / 111.32;
            const lngDiff = radius_km / (111.32 * Math.cos(parseFloat(lat) * (Math.PI / 180)));
            queryStr += ` AND s.latitude BETWEEN $1 AND $2 AND s.longitude BETWEEN $3 AND $4`;
            params = [
                parseFloat(lat) - latDiff, parseFloat(lat) + latDiff,
                parseFloat(lng) - lngDiff, parseFloat(lng) + lngDiff
            ];
        }
        
        queryStr += ` ORDER BY st.created_at DESC`;
        
        const highlights = await query(queryStr, params);
        res.json(highlights.rows || highlights);
    } catch (err) {
        next(err);
    }
});

// Phase 2: Q&A System
router.post('/:id/qa', authenticate, async (req, res, next) => {
    try {
        const { question } = req.body;
        if (!question) return res.status(400).json({message: 'Question is required'});
        
        const qa_id = crypto.randomUUID();
        await query('INSERT INTO shop_qa (id, shop_id, user_id, question) VALUES ($1, $2, $3, $4)', 
            [qa_id, req.params.id, req.user.id, question]);
            
        res.status(201).json({ id: qa_id, message: 'Question posted successfully' });
    } catch (err) {
        next(err);
    }
});

router.get('/:id/qa', async (req, res, next) => {
    try {
        const qaList = await query('SELECT * FROM shop_qa WHERE shop_id = $1 ORDER BY created_at DESC', [req.params.id]);
        res.json(qaList.rows || qaList);
    } catch (err) {
        next(err);
    }
});

/**
 * POST /shops/:id/reviews — a customer's review.
 *
 * Every review was stored as verified (`is_society_verified = 1`, "Assuming
 * true for demo"), so the shop page put a Verified badge on anything anyone
 * wrote, including a shop's own fake reviews. A review is now marked verified
 * only when its writer has actually been served by the shop: a delivered
 * order, or a completed appointment.
 */
router.post('/:id/reviews', authenticate, async (req, res, next) => {
    try {
        const { rating, review_text, photo_urls } = req.body || {};
        const stars = Number(rating);
        if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
            return res.status(400).json({ message: 'rating must be a whole number from 1 to 5' });
        }
        if (review_text !== undefined && review_text !== null && (typeof review_text !== 'string' || review_text.length > 2000)) {
            return res.status(400).json({ message: 'review_text must be text of at most 2000 characters' });
        }
        const photos = Array.isArray(photo_urls) ? photo_urls.filter((u) => typeof u === 'string').slice(0, 10) : [];

        const shop = await queryOne('SELECT id, owner_id FROM local_shops WHERE id = $1', [req.params.id]);
        if (!shop) return res.status(404).json({ message: 'Shop not found' });
        if (String(shop.owner_id) === String(req.user.id)) {
            return res.status(403).json({ message: 'You cannot review your own shop' });
        }

        const served = await queryOne(
            `SELECT 1 AS ok FROM orders WHERE shop_id = $1 AND user_id = $2 AND LOWER(order_status) = 'delivered'
             UNION ALL
             SELECT 1 AS ok FROM shop_appointments WHERE shop_id = $1 AND user_id = $2 AND LOWER(status) = 'completed'
             LIMIT 1`,
            [shop.id, req.user.id]
        );
        const is_society_verified = served ? 1 : 0;

        // One review per customer per shop (a unique index): they edit it rather than add another.
        const already = await queryOne('SELECT id FROM shop_reviews WHERE shop_id = $1 AND user_id = $2', [shop.id, req.user.id]);
        if (already) return res.status(409).json({ message: 'You have already reviewed this shop', reviewId: already.id });

        const review_id = crypto.randomUUID();
        await query(`INSERT INTO shop_reviews (id, shop_id, user_id, rating, review_text, photo_urls, is_society_verified)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [review_id, shop.id, req.user.id, stars, review_text || null, JSON.stringify(photos), is_society_verified]);
            
        res.status(201).json({ id: review_id, is_society_verified, message: 'Review added' });
    } catch (err) {
        next(err);
    }
});

// Phase 13: Flash Sales (Happy Hours)
router.get('/flash-sales/active', async (req, res, next) => {
    try {
        const sales = await query(`
            SELECT f.*, s.name as shop_name 
            FROM flash_sales f
            JOIN local_shops s ON f.shop_id = s.id
            ORDER BY f.discount_percentage DESC
        `);
        res.json(sales.rows || sales);
    } catch (err) {
        next(err);
    }
});

// Phase 13: Local Highlights (Stories)
// A second GET /highlights/feed was registered here. Express serves the first
// matching route, so this one never ran — which was fortunate, because it had no
// expiry filter and would have served stories that had already lapsed.
// Phase 13: Batch Checkout
//
// A second POST /cart/batch-checkout was registered here, described in its own
// comment as a "Mock implementation". Express serves the first match, so the
// real handler above won and this never ran. It is deleted rather than left in
// place because it computed the order total from client-supplied item.price —
// anything reordering the routes would have turned that into a live
// price-tampering hole — and it burned and granted loyalty coins without
// creating any order to attach them to.

// ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————
// ENHANCED SHOP MANAGEMENT ROUTES (v2)
// ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

const { requireShopOwner, requireOrderAccess, requireAppointmentAccess } = require('../../../middleware/shop-owner.middleware');
const shopMgmt = require('../controllers/shop-management.controller');
const uploadService = require('../../core/services/upload.service');
const { uploadLimiter } = require('../../../middleware/rateLimit.middleware');

// ——— SHOP OWNER DASHBOARD ————————————————————————————————————————————————————————————————————————————————————————————————————————
router.get('/my-shop/dashboard', authenticate, requireShopOwner, shopMgmt.getShopDashboard);
router.get('/my-shop/analytics', authenticate, requireShopOwner, shopMgmt.getShopAnalytics);
router.get('/my-shop/payouts', authenticate, requireShopOwner, shopMgmt.getShopPayouts);
router.put('/my-shop/settings', authenticate, requireShopOwner, shopMgmt.updateShopSettings);
router.put('/my-shop/live-status', authenticate, requireShopOwner, shopMgmt.toggleLiveVisibility);

// ——— ORDER MANAGEMENT (Shop Owner) ——————————————————————————————————————————————————————————————————————————————————————————————
router.get('/my-shop/orders', authenticate, requireShopOwner, shopMgmt.getShopOrders);
router.put('/my-shop/orders/:orderId/status', authenticate, requireShopOwner, shopMgmt.updateOrderStatus);
router.put('/my-shop/orders/:orderId/assign-rider', authenticate, requireShopOwner, shopMgmt.assignRiderToOrder);
router.get('/my-shop/ledger', authenticate, requireShopOwner, shopMgmt.getShopLedger);
router.get('/my-shop/leads', authenticate, requireShopOwner, shopMgmt.getShopLeads);
router.put('/my-shop/leads/:leadId/status', authenticate, requireShopOwner, shopMgmt.updateLeadStatus);

// ─── APPOINTMENT MANAGEMENT (Shop Owner) ──────────────────────────
router.get('/my-shop/appointments', authenticate, requireShopOwner, shopMgmt.getShopAppointments);
router.put('/my-shop/appointments/:appointmentId/status', authenticate, requireShopOwner, shopMgmt.updateAppointmentStatus);

// ─── STAFF MANAGEMENT (Shop Owner) ──────────────────────────
router.get('/my-shop/staff', authenticate, requireShopOwner, shopMgmt.getShopStaff);
router.post('/my-shop/staff', authenticate, requireShopOwner, shopMgmt.addShopStaff);
// PUT /my-shop/staff/:staffId was registered twice. This first registration won,
// and it pointed at updateShopStaff, which writes every column unconditionally:
// a request sending only { status } also wrote NULL over the staff member's
// name, role, phone, email, shift and commission. The surviving registration
// below uses updateStaff, which builds a partial UPDATE from the fields actually
// supplied.
router.delete('/my-shop/staff/:staffId', authenticate, requireShopOwner, shopMgmt.removeShopStaff);

// ─── REVIEWS MANAGEMENT (Shop Owner) ──────────────────────────
router.get('/my-shop/reviews', authenticate, requireShopOwner, shopMgmt.getShopReviews);
router.post('/my-shop/reviews/:reviewId/reply', authenticate, requireShopOwner, shopMgmt.replyToShopReview);

// ─── ANALYTICS (Shop Owner) ──────────────────────────
router.get('/my-shop/analytics-data', authenticate, requireShopOwner, shopMgmt.getShopAnalyticsData);

// â”€â”€â”€ PRODUCT & INVENTORY MANAGEMENT (Shop Owner) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/my-shop/products', authenticate, requireShopOwner, shopMgmt.addProduct);
router.put('/my-shop/products/:productId', authenticate, requireShopOwner, shopMgmt.updateProduct);
router.delete('/my-shop/products/:productId', authenticate, requireShopOwner, shopMgmt.deleteProduct);

// Service Slot management
router.post('/my-shop/service-slots', authenticate, requireShopOwner, shopMgmt.addServiceSlot);
router.delete('/my-shop/service-slots/:slotId', authenticate, requireShopOwner, shopMgmt.deleteServiceSlot);

// â”€â”€â”€ STAFF MANAGEMENT (Shop Owner) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.put('/my-shop/staff/:staffId', authenticate, requireShopOwner, shopMgmt.updateStaff);
router.put('/my-shop/staff/:staffId/availability', authenticate, requireShopOwner, shopMgmt.updateStaffAvailability);

// â”€â”€â”€ DISPUTES (Visitor + Shop Owner) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/disputes', authenticate, shopMgmt.createDispute);

// â”€â”€â”€ RETURNS (Visitor) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/returns', authenticate, shopMgmt.createReturn);

// â”€â”€â”€ CHAT (Visitor â†” Shop Owner) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/chat/:shopId/:userId', authenticate, shopMgmt.getChatMessages);
router.post('/chat/:shopId/:userId', authenticate, shopMgmt.sendChatMessage);

// â”€â”€â”€ JOB CARDS (Garage, Repair, Laundry — Shop Owner) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/my-shop/job-cards', authenticate, requireShopOwner, shopMgmt.getJobCards);
router.post('/my-shop/job-cards', authenticate, requireShopOwner, shopMgmt.createJobCard);
router.put('/my-shop/job-cards/:jobCardId', authenticate, requireShopOwner, shopMgmt.updateJobCard);

// ─── POINT OF SALE (counter sales) ───
const pos = require('../controllers/pos.controller');
router.post('/my-shop/pos-sales', authenticate, requireShopOwner, pos.createSale);
router.get('/my-shop/pos-sales', authenticate, requireShopOwner, pos.listSales);

// â”€â”€â”€ QUOTATIONS (Home Service, Events — Shop Owner) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/my-shop/quotations', authenticate, requireShopOwner, shopMgmt.createQuotation);

// â”€â”€â”€ KDS — Kitchen Display System (Restaurant — Shop Owner) â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/my-shop/kds', authenticate, requireShopOwner, shopMgmt.getKDSTickets);
router.post('/my-shop/kds', authenticate, requireShopOwner, shopMgmt.createKDSTicket);
router.put('/my-shop/kds/:ticketId', authenticate, requireShopOwner, shopMgmt.updateKDSTicket);

// â”€â”€â”€ TABLE MANAGEMENT (Restaurant — Shop Owner) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/my-shop/tables', authenticate, requireShopOwner, shopMgmt.getRestaurantTables);
router.put('/my-shop/tables/:tableId', authenticate, requireShopOwner, shopMgmt.updateTableStatus);

// â”€â”€â”€ VISITOR: ORDER HISTORY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/visitor/order-history', authenticate, shopMgmt.getVisitorOrderHistory);

// â”€â”€â”€ NOTIFICATIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/notifications', authenticate, shopMgmt.getNotifications);
router.put('/notifications/:notificationId/read', authenticate, shopMgmt.markNotificationRead);

// â”€â”€â”€ FILE UPLOAD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// The same endpoint as POST /upload (upload.service.js), at the paths the
// merchant screens have used. The response also carries `uploads` / `upload`,
// the names these two answered with.
const shopUpload = (req, res, next) => {
  const send = res.json.bind(res);
  res.json = (body) => send(body && body.files ? { ...body, uploads: body.files, upload: body.files[0] } : body);
  return uploadService.handleUpload(req, res, next);
};
router.post('/upload', authenticate, uploadLimiter, uploadService.receive, shopUpload);
router.post('/upload/single', authenticate, uploadLimiter, uploadService.receive, shopUpload);

// Shop offers endpoint — queries shop_offers table
router.get('/:id/offers', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(`SELECT id, title, description, discount_percentage, valid_until, is_active, created_at
       FROM shop_offers
       WHERE shop_id = $1 AND is_active = '1' AND (valid_until IS NULL OR valid_until > NOW())
       ORDER BY created_at DESC`,
      [id]
    );
    const offers = result.rows || result || [];
    res.json({ success: true, data: offers });
  } catch (error) { next(error); }
});

// Shop reviews endpoint — queries shop_reviews table with user info
router.get('/:id/reviews', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(`SELECT sr.id, sr.rating, sr.review_text, sr.photo_urls, sr.created_at,
              u.full_name as user_name, u.avatar_url as user_avatar
       FROM shop_reviews sr
       LEFT JOIN users u ON sr.user_id = u.id
       WHERE sr.shop_id = $1
       ORDER BY sr.created_at DESC
       LIMIT 50`,
      [id]
    );
    const reviews = result.rows || result || [];
    
    // Calculate aggregate rating
    let avgRating = 0;
    if (reviews.length > 0) {
      const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
      avgRating = parseFloat((sum / reviews.length).toFixed(1));
    }
    
    res.json({ success: true, data: reviews, meta: { averageRating: avgRating, totalReviews: reviews.length } });
  } catch (error) { next(error); }
});

// ─── SHOP CREATION ───────────────────────────────────────────────────────────
// The mobile dashboard submits new shops here; only GET / existed.
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { name, category, description, address, phone_number, pincode, latitude, longitude } = req.body;
    if (!name || !category) {
      return res.status(400).json({ error: 'name and category are required' });
    }

    // The same rules as POST /register, for the same reason: a shop with no
    // address or position is stored and then appears in no nearby search.
    //
    // This route accepted a name and a category alone and then ran an INSERT
    // that could not succeed — address and coordinate are NOT NULL, the id had
    // no value on PostgreSQL, and `phone_number` is not the column's name there
    // — so every submission answered 500. Saying which fields are missing is
    // the most this can do until the form that posts here collects them.
    const problems = validateShopRegistration({
      name, address, latitude, longitude, phoneNumber: phone_number,
    });
    if (problems.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'This shop cannot be registered yet.',
        problems,
      });
    }

    const lat = Number(latitude);
    const lng = Number(longitude);

    // New shops are unverified and inactive until an admin approves them, so a
    // self-serve submission cannot put an unvetted shop in front of customers.
    const created = await queryOne(
      `INSERT INTO local_shops
         (id, owner_id, region_id, name, category, description, address, phone, pincode,
          coordinate, latitude, longitude, approval_status, is_verified, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9,
               ST_GeomFromText('POINT(${lng} ${lat})', 4326), $10, $11, 'pending', false, false)
       RETURNING id, name, category, approval_status`,
      [
        crypto.randomUUID(),
        req.user.id,
        req.user.region_id || null,
        String(name).trim(),
        String(category).trim(),
        description || null,
        String(address).trim(),
        phone_number || null,
        pincode || null,
        lat,
        lng,
      ]
    );

    res.status(201).json({ success: true, ...created, status: 'pending' });
  } catch (error) {
    next(error);
  }
});

// ─── SHOP CHAT ───────────────────────────────────────────────────────────────
// Conversation between the signed-in customer and the shop owner.
router.get('/:id/chat', authenticate, async (req, res, next) => {
  try {
    const shop = await queryOne('SELECT id, owner_id FROM local_shops WHERE id = $1', [req.params.id]);
    if (!shop) return res.status(404).json({ error: 'Shop not found' });

    const isOwner = String(shop.owner_id) === String(req.user.id);
    // The owner reads the whole shop inbox; a customer sees only their thread.
    const rows = await query(
      isOwner
        ? `SELECT * FROM shop_chat_messages WHERE shop_id = $1 ORDER BY created_at ASC LIMIT 200`
        : `SELECT * FROM shop_chat_messages
            WHERE shop_id = $1 AND (sender_id = $2 OR receiver_id = $2)
            ORDER BY created_at ASC LIMIT 200`,
      isOwner ? [req.params.id] : [req.params.id, req.user.id]
    );

    res.json(rows.rows || rows);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/chat', authenticate, async (req, res, next) => {
  try {
    const { message, messageType, referenceId } = req.body;
    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: 'message is required' });
    }

    const shop = await queryOne('SELECT id, owner_id FROM local_shops WHERE id = $1', [req.params.id]);
    if (!shop) return res.status(404).json({ error: 'Shop not found' });

    // A customer writes to the owner; the owner replies to the named customer.
    const isOwner = String(shop.owner_id) === String(req.user.id);
    const receiverId = isOwner ? (req.body.receiverId || null) : shop.owner_id;
    if (isOwner && !receiverId) {
      return res.status(400).json({ error: 'receiverId is required when the shop owner replies' });
    }

    const id = crypto.randomUUID();
    await query(
      `INSERT INTO shop_chat_messages
         (id, shop_id, sender_id, receiver_id, message, message_type, reference_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, req.params.id, req.user.id, receiverId, message, messageType || 'text', referenceId || null]
    );

    const io = req.app.get('io');
    if (io) {
      io.to(`room:shop:${req.params.id}`).emit('SHOP_CHAT_MESSAGE', {
        id, shopId: req.params.id, senderId: req.user.id, receiverId, message,
      });
    }

    res.status(201).json({ success: true, id });
  } catch (error) {
    next(error);
  }
});

// ─── ORDER HISTORY, REVIEW, RIDER ASSIGNMENT ────────────────────────────────
router.get('/:id/orders/history', authenticate, async (req, res, next) => {
  try {
    const shop = await queryOne('SELECT id, owner_id FROM local_shops WHERE id = $1', [req.params.id]);
    if (!shop) return res.status(404).json({ error: 'Shop not found' });

    // Owners see every order for the shop; customers see only their own.
    const isOwner = String(shop.owner_id) === String(req.user.id);
    const rows = await query(
      isOwner
        ? `SELECT o.*, u.full_name AS customer_name
             FROM orders o LEFT JOIN users u ON o.user_id = u.id
            WHERE o.shop_id = $1 ORDER BY o.created_at DESC LIMIT 100`
        : `SELECT o.* FROM orders o
            WHERE o.shop_id = $1 AND o.user_id = $2
            ORDER BY o.created_at DESC LIMIT 100`,
      isOwner ? [req.params.id] : [req.params.id, req.user.id]
    );

    const orders = rows.rows || rows;
    if (orders.length === 0) return res.json({ success: true, orders: [] });

    // Single batched item fetch rather than one query per order.
    const itemRows = await query(
      `SELECT order_id, product_id, name, price, quantity
         FROM order_items WHERE order_id IN (${placeholders(orders.length)})`,
      orders.map((o) => o.id)
    );
    const byOrder = new Map();
    for (const it of itemRows.rows || itemRows) {
      if (!byOrder.has(it.order_id)) byOrder.set(it.order_id, []);
      byOrder.get(it.order_id).push(it);
    }
    for (const o of orders) o.items = byOrder.get(o.id) || [];

    res.json({ success: true, orders });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/orders/:orderId/review', authenticate, async (req, res, next) => {
  try {
    const rating = parseInt(req.body.rating, 10);
    const review = req.body.review || req.body.review_text || null;

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'rating must be an integer between 1 and 5' });
    }

    // Only the buyer of a delivered order may review it.
    const order = await queryOne(
      'SELECT id, user_id, order_status FROM orders WHERE id = $1 AND shop_id = $2',
      [req.params.orderId, req.params.id]
    );
    if (!order) return res.status(404).json({ error: 'Order not found for this shop' });
    if (String(order.user_id) !== String(req.user.id)) {
      return res.status(403).json({ error: 'You can only review your own orders' });
    }
    if (order.order_status !== 'delivered') {
      return res.status(400).json({ error: 'Only delivered orders can be reviewed' });
    }

    // shop_reviews is unique per (shop_id, user_id), so a second review from the
    // same customer updates their existing rating rather than failing.
    await query(
      `INSERT INTO shop_reviews (shop_id, user_id, rating, review_text)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (shop_id, user_id) DO UPDATE
         SET rating = EXCLUDED.rating, review_text = EXCLUDED.review_text`,
      [req.params.id, req.user.id, rating, review]
    );

    res.status(201).json({ success: true, message: 'Review saved' });
  } catch (error) {
    next(error);
  }
});

router.put('/:id/orders/:orderId/assign-rider', authenticate, async (req, res, next) => {
  try {
    const { riderId } = req.body;
    if (!riderId) return res.status(400).json({ error: 'riderId is required' });

    const shop = await queryOne('SELECT owner_id FROM local_shops WHERE id = $1', [req.params.id]);
    if (!shop) return res.status(404).json({ error: 'Shop not found' });
    if (String(shop.owner_id) !== String(req.user.id) && !req.user.is_admin) {
      return res.status(403).json({ error: 'Only the shop owner can assign a rider' });
    }

    const order = await queryOne(
      'SELECT id FROM orders WHERE id = $1 AND shop_id = $2',
      [req.params.orderId, req.params.id]
    );
    if (!order) return res.status(404).json({ error: 'Order not found for this shop' });

    // order_tracking holds one row per order, created at checkout.
    await query(
      `INSERT INTO order_tracking (order_id, runner_id)
       VALUES ($1, $2)
       ON CONFLICT (order_id) DO UPDATE SET runner_id = EXCLUDED.runner_id`,
      [req.params.orderId, riderId]
    );

    await query(
      `UPDATE orders SET order_status = 'assigned', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [req.params.orderId]
    );

    const io = req.app.get('io');
    if (io) {
      io.to(`order_${req.params.orderId}`).emit('ORDER_RIDER_ASSIGNED', {
        orderId: req.params.orderId, riderId,
      });
    }

    res.json({ success: true, orderId: req.params.orderId, riderId });
  } catch (error) {
    next(error);
  }
});

// ─── SHOP-SCOPED LOYALTY ─────────────────────────────────────────────────────
const shopLoyalty = require('../services/shop-loyalty.service');

// A customer's standing at this shop. Returns a zeroed summary for a first-time
// visitor rather than 404, so the shop page renders without special-casing.
router.get('/:id/loyalty', authenticate, async (req, res, next) => {
  try {
    const shop = await queryOne('SELECT id FROM local_shops WHERE id = $1', [req.params.id]);
    if (!shop) return res.status(404).json({ error: 'Shop not found' });

    res.json(await shopLoyalty.getSummary(req.params.id, req.user.id));
  } catch (error) {
    next(error);
  }
});

router.post('/:id/loyalty/redeem', authenticate, async (req, res, next) => {
  try {
    const points = parseInt(req.body.points, 10);
    if (!Number.isInteger(points) || points <= 0) {
      return res.status(400).json({ error: 'points must be a positive integer' });
    }

    const result = await shopLoyalty.redeem({
      shopId: req.params.id,
      userId: req.user.id,
      points,
    });

    res.json({ success: true, ...result });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    next(error);
  }
});

// Shop owners configure their own earn and burn rates.
router.put('/:id/loyalty/program', authenticate, async (req, res, next) => {
  try {
    const shop = await queryOne('SELECT owner_id FROM local_shops WHERE id = $1', [req.params.id]);
    if (!shop) return res.status(404).json({ error: 'Shop not found' });
    if (String(shop.owner_id) !== String(req.user.id) && !req.user.is_admin) {
      return res.status(403).json({ error: 'Only the shop owner can change the loyalty programme' });
    }

    const d = shopLoyalty.DEFAULT_PROGRAM;
    const b = req.body || {};
    const saved = await queryOne(
      `INSERT INTO shop_loyalty_programs
         (shop_id, is_enabled, points_per_hundred, point_value, min_order_amount,
          min_redeem_points, welcome_bonus, points_expire_days)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (shop_id) DO UPDATE SET
         is_enabled         = EXCLUDED.is_enabled,
         points_per_hundred = EXCLUDED.points_per_hundred,
         point_value        = EXCLUDED.point_value,
         min_order_amount   = EXCLUDED.min_order_amount,
         min_redeem_points  = EXCLUDED.min_redeem_points,
         welcome_bonus      = EXCLUDED.welcome_bonus,
         points_expire_days = EXCLUDED.points_expire_days,
         updated_at         = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        req.params.id,
        b.isEnabled ?? d.is_enabled,
        b.pointsPerHundred ?? d.points_per_hundred,
        b.pointValue ?? d.point_value,
        b.minOrderAmount ?? d.min_order_amount,
        b.minRedeemPoints ?? d.min_redeem_points,
        b.welcomeBonus ?? d.welcome_bonus,
        b.pointsExpireDays ?? d.points_expire_days,
      ]
    );

    res.json({ success: true, program: saved });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /:id/settings — the shop-manager settings screen.
 *
 * apps/mobile/app/shop-manager/components/NativeSettingsManager.js reads this
 * to populate the settings form; only the PUT half (/my-shop/settings)
 * existed, so the form always opened blank and a save silently overwrote
 * fields the owner had never seen.
 *
 * Returns the same columns updateShopSettings writes. Note that shop settings
 * live on local_shops columns, not in the shop_settings JSON table — that
 * table is used by a different surface.
 */
router.get('/:id/settings', authenticate, async (req, res, next) => {
  try {
    const shop = await queryOne(
      `SELECT id, owner_id, description, address, phone_number, opening_hours,
              delivery_available AS is_delivery_available,
              pickup_available   AS is_pickup_available,
              dine_in_available, self_delivery_available, accepts_walkin,
              busy_status, estimated_delivery_time,
              COALESCE(is_active, 1) AS is_live
         FROM local_shops
        WHERE id = $1`,
      [req.params.id]
    );

    if (!shop) {
      return res.status(404).json({ success: false, error: 'Shop not found' });
    }

    // Settings are owner-only: they include contact details and operational
    // configuration that the public shop endpoint deliberately omits.
    const isOwner = String(shop.owner_id) === String(req.user.id);
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(String(req.user.role || '').toUpperCase());
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, error: 'You do not manage this shop' });
    }

    const { owner_id: _ownerId, ...settings } = shop;
    res.json({ success: true, data: settings, ...settings });
  } catch (error) {
    next(error);
  }
});


/**
 * GET /shops/:id — a shop's public page.
 *
 * Declared last, so that every literal single-segment path above (/search,
 * /categories, /nearby, /my-shop, /notifications …) is matched first.
 * A deactivated shop is not shown.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const shop = await queryOne(
      "SELECT * FROM local_shops WHERE CAST(id AS TEXT) = $1 AND COALESCE(is_active, 1) = 1",
      [String(req.params.id)]
    );
    if (!shop) return res.status(404).json({ error: 'Shop not found' });

    const category = shop.category_id
      ? await queryOne('SELECT * FROM shop_categories WHERE id = $1', [shop.category_id])
      : null;
    res.json({ ...publicShop(shop), category_details: category });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

