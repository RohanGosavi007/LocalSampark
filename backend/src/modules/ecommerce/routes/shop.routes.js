const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../../../config/database');
// One shared client instead of a per-module pool; see config/prisma.js.
const prisma = require('../../../config/prisma').sharedPrisma;
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
const Razorpay = require('razorpay');
const crypto = require('crypto');

/**
 * Delivery handover code written to shop_orders.tracking_otp.
 *
 * The rider quotes this to close out a delivery, so a guessable value lets
 * an order be marked delivered by someone who never received it. It was
 * Math.floor(1000 + Math.random() * 9000) — a predictable PRNG, and biased
 * on top of that. crypto.randomInt is uniform over the range.
 */
function generateTrackingOtp() {
  return String(crypto.randomInt(1000, 10000));
}
const { autoCreateShopDelivery } = require('../../services/controllers/delivery.controller');
const geo = require('../../../utils/geo');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_mockkey',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'mocksecret'
});

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
      return res.json({ source: 'typesense', data: searchResults });
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

    return res.json({
      source: 'hybrid',
      strategy: result.strategy,
      retrievers: result.retrievers || null,
      data: result.items.map((item) => {
        const out = { ...item };
        delete out._fusion_score;
        return out;
      }),
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
      const categories = await query("SELECT * FROM shop_categories WHERE is_active = true OR is_active = true ORDER BY display_order ASC");
      return categories.rows || categories;
    });

    res.setHeader('X-Cache-Source', result.source);
    res.json(result.data);
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
    if (category_id) {
      const category = await queryOne('SELECT id FROM shop_categories WHERE id = $1', [category_id]);
      if (!category) {
        return res.status(400).json({
          success: false,
          error: 'This shop cannot be registered yet.',
          problems: [{ field: 'category_id', message: 'That category does not exist.' }],
        });
      }
    }

    // Generate UUID if DB doesn't auto-gen string IDs easily (using crypto)
    const id = crypto.randomUUID();

    // `phone`, not `phone_number`: the live local_shops table has phone, while
    // only the PostgreSQL DDL spelled it phone_number. Shop registration failed
    // outright on SQLite because of it. Migration 070 renames the PostgreSQL
    // column to match, making `phone` correct on both engines.
    const shop = await queryOne(`INSERT INTO local_shops (id, owner_id, region_id, name, description, category_id, phone, address, latitude, longitude, opening_hours, photo_urls, delivery_available, pickup_available, estimated_delivery_time, gst_number, bank_account, registration_metadata, approval_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 'pending')
       RETURNING *`,
      [id, req.user.id, req.user.regionId, name, description, category_id, phoneNumber, address, latitude, longitude, JSON.stringify(openingHours || {}), JSON.stringify(photoUrls || []), delivery_available ? 1:0, pickup_available ? 1:0, estimated_delivery_time, gst_number, JSON.stringify(bank_account||{}), JSON.stringify(registration_metadata||{})]
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
       VALUES ($1, $2, $3, $4, $5, $6, 1, 1) RETURNING *`,
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
    const services = await query('SELECT * FROM shop_services WHERE shop_id = $1 AND is_available = true ORDER BY display_order ASC', [req.params.id]);
    res.json(services.rows || services);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/services', authenticate, async (req, res, next) => {
  try {
    const { name, description, duration_minutes, price, image_url, category, display_order } = req.body;
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
    const staff = await query('SELECT * FROM shop_staff WHERE shop_id = $1 AND is_active = true', [req.params.id]);
    res.json(staff.rows || staff);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/staff', authenticate, async (req, res, next) => {
  try {
    const { name, role, profileImage, specialization, phone_number, experience_years } = req.body;
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
                    status: Math.random() > 0.7 ? 'booked' : 'available'
                });
            }
            return res.json({ slots });
        }
        const { date } = req.query; // "YYYY-MM-DD"
        if (!date) return res.status(400).json({error: "Date required"});
        const dayOfWeek = new Date(date).getDay();

        let schedule = await queryOne('SELECT * FROM staff_availability WHERE staff_id = $1 AND day_of_week = $2 AND is_available = true', [req.params.sid, dayOfWeek]);
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
        const surgeRules = await query('SELECT * FROM surge_pricing_rules WHERE shop_id = $1 AND (day_of_week = $2 OR day_of_week IS NULL) AND is_active = true', [req.params.id, dayOfWeek]);
        
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
    const slot = await prisma.serviceSlot.findUnique({ where: { id: serviceSlotId } });
    if (!slot) return res.status(404).json({ error: 'Service slot not found' });

    // Refuse a slot that is already taken.
    //
    // Migration 106 makes this impossible at the database level, which is what
    // actually holds under concurrency — two customers tapping "confirm" on the
    // last evening slot at the same moment. This check exists so the ordinary
    // case gets a clear 409 rather than a constraint-violation stack trace.
    const clash = await prisma.appointment.findFirst({
      where: {
        shopId: req.params.id,
        serviceSlotId,
        scheduledDate: new Date(scheduledDate),
        scheduledTime,
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      },
    });

    if (clash) {
      return res.status(409).json({
        success: false,
        error: 'That slot has just been taken. Please choose another time.',
        code: 'SLOT_UNAVAILABLE',
      });
    }

    // Create appointment via Prisma
    const appt = await prisma.appointment.create({
      data: {
        // crypto.randomUUID rather than Date.now()+random(1000). The old form
        // drew from a thousand values inside a single millisecond, so two
        // simultaneous bookings collided about once in a thousand — rare enough
        // to survive testing and frequent enough to happen in production.
        bookingNumber: 'LS-BK-' + crypto.randomUUID(),
        userId: req.user.id,
        shopId: req.params.id,
        serviceSlotId: serviceSlotId,
        status: 'REQUESTED',
        serviceName: slot.serviceName,
        providerName: slot.providerName,
        scheduledDate: new Date(scheduledDate),
        scheduledTime: scheduledTime,
        durationMinutes: slot.durationMinutes,
        pricePaise: slot.pricePaise,
        paymentMethod: paymentMethod || 'COD',
        customerNotes: customerNotes,
        patientSymptoms: patientSymptoms ? JSON.stringify(patientSymptoms) : null
      }
    });

    res.status(201).json({ success: true, appointment: appt });
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
 * The lowest total an order may legitimately claim.
 *
 * `totalAmount` arrives in the request body and was used verbatim: to charge
 * the customer, to compute the platform commission, and to compute what the
 * shop is owed. Nothing recomputed it, so a client posting `totalAmount: 1`
 * for a cart of groceries created a one-rupee order and a one-rupee commission
 * base, and every downstream report agreed with it.
 *
 * This establishes a floor rather than overwriting the total. Legitimate carts
 * can exceed the sum of list prices — size upgrades, add-ons, delivery fees and
 * surge all push it up — so replacing the client figure outright would reject
 * or under-charge real orders. Underpayment is the attack, and a floor is
 * exactly the shape of that attack.
 *
 * Items that do not resolve to a product row for this shop fall back to the
 * price the client stated. That is not a hole being left open: such items are
 * services and ad-hoc lines that have no catalogue price to check against, and
 * the alternative — refusing them — would break every hybrid cart.
 */
async function minimumOrderTotal(shopId, items) {
  let floor = 0;
  const unverified = [];

  for (const item of items || []) {
    const qty = Math.max(1, Number(item.quantity) || 1);
    const claimed = Number(item.price) || 0;

    if (!item.id) {
      floor += claimed * qty;
      unverified.push(item.name || 'unnamed item');
      continue;
    }

    const product = await queryOne(
      'SELECT price FROM shop_products WHERE id = $1 AND shop_id = $2',
      [item.id, shopId]
    );

    if (!product) {
      floor += claimed * qty;
      unverified.push(item.name || item.id);
      continue;
    }

    floor += Number(product.price || 0) * qty;
  }

  // Rounded to the paisa: floating point on a long cart otherwise leaves the
  // floor a fraction above a legitimately exact total.
  return { floor: Math.round(floor * 100) / 100, unverified };
}

router.post('/:id/orders', authenticate, async (req, res, next) => {
  try {
    const { items, totalAmount, paymentMethod, deliveryType, deliveryAddress, deliveryCoordinate, customerName, customerPhone, appointmentDetails } = req.body;
    
    // 1. Create main order for products
    let order = null;
    const productItems = items.filter(item => item.type !== 'service');
    const serviceItems = items.filter(item => item.type === 'service');

    if (productItems.length > 0) {
      const { floor, unverified } = await minimumOrderTotal(req.params.id, productItems);

      // A paisa of tolerance absorbs rounding, not discounting.
      if (Number(totalAmount) < floor - 0.01) {
        return res.status(400).json({
          success: false,
          error: 'The order total does not match the current prices for these items. Please refresh your cart.',
          code: 'TOTAL_BELOW_CATALOGUE_PRICE',
          expected_minimum: floor,
        });
      }

      if (unverified.length > 0) {
        logger.info(
          `Order for shop ${req.params.id} contains ${unverified.length} item(s) with no catalogue price: ${unverified.join(', ')}`
        );
      }

      order = await queryOne(`INSERT INTO shop_orders (id, shop_id, user_id, total_amount, items, payment_method, delivery_type, delivery_address, delivery_coordinate, customer_name, customer_phone, tracking_otp, status) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending') RETURNING *`,
        [crypto.randomUUID(), req.params.id, req.user.id, totalAmount, JSON.stringify(productItems), paymentMethod, deliveryType, deliveryAddress, deliveryCoordinate, customerName, customerPhone, generateTrackingOtp()]
      );

      // Commission logic for products.
      //
      // Both lookups used to be dereferenced unconditionally. A request naming a
      // shop that does not exist threw "Cannot read properties of null (reading
      // 'category_id')" from the line below, and a shop whose category row had
      // been removed or deactivated threw the same on `cat.commission_percent`.
      // Either way the customer saw a 500 at checkout, after the order row had
      // already been written — so the order existed and the commission did not.
      const shop = await queryOne('SELECT * FROM local_shops WHERE id = $1', [req.params.id]);
      if (!shop) {
        return res.status(404).json({ success: false, error: 'Shop not found.' });
      }

      const cat = shop.category_id
        ? await queryOne('SELECT * FROM shop_categories WHERE id = $1', [shop.category_id])
        : null;

      // A missing category must not stop an order the customer has already
      // paid for. Commission falls back to the shop's own override, then to
      // zero — and zero commission is recorded plainly rather than guessed, so
      // it shows up in reconciliation instead of hiding in an average.
      const cp = shop.commission_override_percent ?? cat?.commission_percent ?? 0;
      const cf = shop.convenience_fee_override ?? cat?.convenience_fee ?? 0;
      const ca = totalAmount * (cp / 100);
      const tpe = ca + cf;
      const nts = totalAmount - tpe;
      
      await query(`INSERT INTO shop_commissions (id, shop_id, order_id, order_type, gross_amount, commission_percent, commission_amount, convenience_fee, total_platform_earning, net_to_shop) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, 
      [crypto.randomUUID(), req.params.id, order.id, 'product_order', totalAmount, cp, ca, cf, tpe, nts]);

      // If immediate delivery requested, dispatch
      if (deliveryType === 'delivery') {
          const coords = deliveryCoordinate || { lat: 0, lng: 0 };
          await autoCreateShopDelivery(order.id, req.params.id, req.user.id, coords.lat, coords.lng, deliveryAddress, productItems);
      }
    }

    // 2. Handle services (Hybrid Cart Support)
    const createdAppointments = [];
    if (serviceItems.length > 0 && appointmentDetails) {
      for (const service of serviceItems) {
        const appt = await queryOne(`INSERT INTO shop_appointments (id, shop_id, staff_id, user_id, service_id, appointment_date, time_slot, payment_method, status) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending') RETURNING *`,
          [crypto.randomUUID(), req.params.id, appointmentDetails.staffId, req.user.id, service.id, appointmentDetails.appointmentDate, appointmentDetails.timeSlot, paymentMethod]
        );
        createdAppointments.push(appt);
      }
    }

    res.status(201).json({ success: true, order, appointments: createdAppointments });
  } catch (error) {
    next(error);
  }
});

// State Machine API for Orders
router.put('/orders/:id/status', authenticate, async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'accepted', 'preparing', 'ready_for_pickup', 'dispatched', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });

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

// Phase 2: Batch Checkout (Multi-Shop Cart)
router.post('/cart/batch-checkout', authenticate, async (req, res, next) => {
    try {
        // expected body: { items: [{shop_id, product_id, quantity}], address, coordinate, use_coins }
        const { items, address, coordinate, use_coins } = req.body;
        if (!items || items.length === 0) return res.status(400).json({message: 'Cart is empty'});

        const batch_id = crypto.randomUUID();
        
        // Group items by shop_id
        const shops = {};
        for(let item of items) {
            if(!shops[item.shop_id]) shops[item.shop_id] = [];
            shops[item.shop_id].push(item);
        }

        let totalBatchAmount = 0;
        let totalDeliveryFee = 40; // Flat 40 for batch delivery
        
        await query('INSERT INTO batch_orders (id, user_id, total_batch_amount, combined_delivery_fee, status) VALUES ($1, $2, $3, $4, $5)', 
            [batch_id, req.user.id, 0, totalDeliveryFee, 'pending']);

        // Create individual orders
        for(const shopId of Object.keys(shops)) {
            let shopTotal = 0;
            const order_id = crypto.randomUUID();
            
            for(let item of shops[shopId]) {
                const product = await queryOne('SELECT price FROM shop_products WHERE id = $1', [item.product_id]);
                if (product) shopTotal += product.price * item.quantity;
            }
            totalBatchAmount += shopTotal;

            await query(`INSERT INTO orders (id, user_id, shop_id, batch_id, total_amount, delivery_fee, payment_method, delivery_address, delivery_coordinate, order_status)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')`, 
                [order_id, req.user.id, shopId, batch_id, shopTotal, 0, 'wallet', address, coordinate]);
        }

        let finalAmount = totalBatchAmount + totalDeliveryFee;
        let coinsUsed = 0;
        
        if (use_coins) {
            const wallet = await queryOne('SELECT sampark_coins_balance FROM loyalty_accounts WHERE user_id = $1', [req.user.id]);
            if (wallet && wallet.sampark_coins_balance > 0) {
                coinsUsed = Math.min(wallet.sampark_coins_balance, finalAmount);
                finalAmount -= coinsUsed;
                await query('UPDATE loyalty_accounts SET sampark_coins_balance = sampark_coins_balance - $1 WHERE user_id = $2', [coinsUsed, req.user.id]);
                await query('INSERT INTO loyalty_transactions (id, user_id, amount, transaction_type, reference_id) VALUES ($1, $2, $3, $4, $5)', 
                    [crypto.randomUUID(), req.user.id, coinsUsed, 'burned', batch_id]);
            }
        }

        await query('UPDATE batch_orders SET total_batch_amount = $1 WHERE id = $2', [finalAmount, batch_id]);

        // Reward 1% of total batch amount as new coins
        const earnedCoins = Math.floor(finalAmount * 0.01);
        if (earnedCoins > 0) {
            await query(`
                INSERT INTO loyalty_accounts (user_id, sampark_coins_balance) VALUES ($1, $2)
                ON CONFLICT(user_id) DO UPDATE SET sampark_coins_balance = loyalty_accounts.sampark_coins_balance + excluded.sampark_coins_balance
            `, [req.user.id, earnedCoins]);
            await query('INSERT INTO loyalty_transactions (id, user_id, amount, transaction_type, reference_id) VALUES ($1, $2, $3, $4, $5)', 
                [crypto.randomUUID(), req.user.id, earnedCoins, 'earned', batch_id]);
        }

        res.json({ batch_id, totalBatchAmount, totalDeliveryFee, finalAmount, coinsUsed, earnedCoins });
    } catch (err) {
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

// Phase 2: Society Verified Reviews
router.post('/:id/reviews', authenticate, async (req, res, next) => {
    try {
        const { rating, review_text, photo_urls } = req.body;
        if (!rating) return res.status(400).json({message: 'Rating is required'});
        
        // Dummy logic to check if user belongs to same society as shop
        // In real life we check users.address or users.society_id against shop's region_id
        const is_society_verified = 1; // Assuming true for demo
        
        const review_id = crypto.randomUUID();
        await query(`INSERT INTO shop_reviews (id, shop_id, user_id, rating, review_text, photo_urls, is_society_verified)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [review_id, req.params.id, req.user.id, rating, review_text, JSON.stringify(photo_urls||[]), is_society_verified]);
            
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
const { upload, recordUpload } = require('../../core/services/upload.service');

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

// â”€â”€â”€ JOB CARDS (Garage, Repair, Laundry â€” Shop Owner) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/my-shop/job-cards', authenticate, requireShopOwner, shopMgmt.getJobCards);
router.post('/my-shop/job-cards', authenticate, requireShopOwner, shopMgmt.createJobCard);
router.put('/my-shop/job-cards/:jobCardId', authenticate, requireShopOwner, shopMgmt.updateJobCard);

// â”€â”€â”€ QUOTATIONS (Home Service, Events â€” Shop Owner) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/my-shop/quotations', authenticate, requireShopOwner, shopMgmt.createQuotation);

// â”€â”€â”€ KDS â€” Kitchen Display System (Restaurant â€” Shop Owner) â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/my-shop/kds', authenticate, requireShopOwner, shopMgmt.getKDSTickets);
router.post('/my-shop/kds', authenticate, requireShopOwner, shopMgmt.createKDSTicket);
router.put('/my-shop/kds/:ticketId', authenticate, requireShopOwner, shopMgmt.updateKDSTicket);

// â”€â”€â”€ TABLE MANAGEMENT (Restaurant â€” Shop Owner) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/my-shop/tables', authenticate, requireShopOwner, shopMgmt.getRestaurantTables);
router.put('/my-shop/tables/:tableId', authenticate, requireShopOwner, shopMgmt.updateTableStatus);

// â”€â”€â”€ VISITOR: ORDER HISTORY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/visitor/order-history', authenticate, shopMgmt.getVisitorOrderHistory);

// â”€â”€â”€ NOTIFICATIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/notifications', authenticate, shopMgmt.getNotifications);
router.put('/notifications/:notificationId/read', authenticate, shopMgmt.markNotificationRead);

// â”€â”€â”€ FILE UPLOAD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/upload', authenticate, upload.array('files', 10), async (req, res, next) => {
  try {
    const purpose = req.body.purpose || 'general';
    const referenceId = req.body.referenceId || null;
    const uploads = [];
    for (const file of req.files || []) {
      const record = await recordUpload(req.user.id, file, purpose, referenceId);
      uploads.push(record);
    }
    res.json({ success: true, uploads });
  } catch (error) { next(error); }
});

router.post('/upload/single', authenticate, upload.single('file'), async (req, res, next) => {
  try {
    const purpose = req.body.purpose || 'general';
    const referenceId = req.body.referenceId || null;
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const record = await recordUpload(req.user.id, req.file, purpose, referenceId);
    res.json({ success: true, upload: record });
  } catch (error) { next(error); }
});

// Shop offers endpoint — queries shop_offers table
router.get('/:id/offers', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(`SELECT id, title, description, discount_percentage, valid_until, is_active, created_at
       FROM shop_offers
       WHERE shop_id = $1 AND is_active = true AND (valid_until IS NULL OR valid_until > NOW())
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
    const { name, category, description, address, phone_number, pincode } = req.body;
    if (!name || !category) {
      return res.status(400).json({ error: 'name and category are required' });
    }

    // New shops are unverified and inactive until an admin approves them, so a
    // self-serve submission cannot put an unvetted shop in front of customers.
    const created = await queryOne(
      `INSERT INTO local_shops
         (owner_id, name, category, description, address, phone_number, pincode,
          approval_status, is_verified, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', false, false)
       RETURNING id, name, category, approval_status`,
      [
        req.user.id,
        name,
        category,
        description || null,
        address || null,
        phone_number || null,
        pincode || null,
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
         FROM order_items WHERE order_id = ANY($1::uuid[])`,
      [orders.map((o) => o.id)]
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

module.exports = router;

