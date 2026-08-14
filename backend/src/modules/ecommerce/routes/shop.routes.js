const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../../../config/database');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { apiCache } = require('../../../middleware/cache.middleware');
const { generateMockProducts, generateMockServices, generateMockStaff } = require('../../../utils/mockDataGenerator');
const { authenticate } = require('../../../middleware/auth.middleware');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { autoCreateShopDelivery } = require('../../services/controllers/delivery.controller');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_mockkey',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'mocksecret'
});

// Helper for Haversine distance (in JS if DB doesn't support ACOS natively)
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(lat2 - lat1);
  var dLon = deg2rad(lon2 - lon1);
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = R * c; // Distance in km
  return d;
}
function deg2rad(deg) { return deg * (Math.PI / 180) }

const CacheService = require('../../../services/cache.service');
const AuditLogger = require('../../../services/audit.logger');
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

    res.status(503).json({ error: 'Search Engine Offline' });
  } catch (error) { next(error); }
});
router.get('/categories', async (req, res, next) => {
  try {
    if (process.env.NODE_ENV !== 'production') {
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
    
    let where = {};
    
    if (search) {
        where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } }
        ];
    }
    
    if (status) {
        where.approvalStatus = status;
    }
    
    const queryOpts = {
        where,
        take: parseInt(limit),
        orderBy: { id: 'desc' }
    };
    
    if (cursor) {
        queryOpts.cursor = { id: cursor };
        queryOpts.skip = 1;
    }
    
    const shops = await prisma.shop.findMany(queryOpts);
    
    const nextCursor = shops.length === parseInt(limit) ? shops[shops.length - 1].id : null;

    res.json({
        data: shops,
        nextCursor,
        limit: parseInt(limit)
    });
  } catch (error) {
    next(error);
  }
});

// GET nearby shops
router.get('/nearby', async (req, res, next) => {
  try {
    let { lat, lng, radius = 10, pincode, category, region_id, topRated, deliveryOnly, sortBy } = req.query;
    let fallbackUsed = false;
    
    // IP Fallback logic
    if (!lat || !lng) {
        lat = 18.5913; 
        lng = 73.8987;
        fallbackUsed = true;
    }

    if (process.env.NODE_ENV !== 'production') {
      try {
        const fs = require('fs'); const path = require('path');
        const mockPath = path.resolve(__dirname, '../../../../../packages/mock-data/seeds/shops_directory.json');
        if (fs.existsSync(mockPath)) {
          const sData = JSON.parse(fs.readFileSync(mockPath, 'utf8'));
          let filteredShops = sData.shops;
          if (category && category !== 'all') {
             const catSlug = category.toLowerCase().replace(/ /g, '-');
             filteredShops = filteredShops.filter(s => s.category.toLowerCase().replace(/ /g, '-') === catSlug);
          }
          return res.json({ shops: filteredShops, userLocation: { lat, lng }, fallbackUsed, strictRegion: !!region_id });
        }
      } catch (e) { next(e); }
    }
    
    // Check Redis cache first if no specific filters that change frequently
    const cacheKey = `shops:nearby:${Math.round(lat*100)}:${Math.round(lng*100)}:${radius}:${category||'all'}:${region_id||'all'}:${topRated||'f'}:${deliveryOnly||'f'}:${sortBy||'distance'}`;
    const cached = await CacheService.get(cacheKey);
    if (cached) {
        return res.json({ shops: cached, userLocation: { lat, lng }, fallbackUsed, strictRegion: !!region_id, source: 'cache' });
    }

    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const radKm = parseFloat(radius);

    // Build Prisma raw query
    let conditions = ["status = 'ACTIVE'", '"isLive" = true'];
    if (category) {
        conditions.push(`categoryId = (SELECT id FROM categories WHERE slug = '${category}' LIMIT 1)`);
    }
    if (region_id) {
        conditions.push(`regionId = '${region_id}'`);
    }

    // Pillar 5: Strict Geo-Fencing & Pincode Mapping
    if (pincode) {
        conditions.push(`pincode = '${pincode}'`);
    }
    
    // Distance must be strictly within the Shop's own defined coverageRadiusKm
    conditions.push(`(earth_distance(ll_to_earth(${userLat}, ${userLng}), ll_to_earth(latitude, longitude)) / 1000) <= "coverageRadiusKm"`);

    if (topRated === 'true') {
        conditions.push(`rating >= 4.0`);
    }
    if (deliveryOnly === 'true') {
        conditions.push(`deliveryAvailable = true`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    let orderClause = `ORDER BY distance_km ASC`;
    if (sortBy === 'rating') {
        orderClause = `ORDER BY rating DESC NULLS LAST, distance_km ASC`;
    } else if (sortBy === 'newest') {
        orderClause = `ORDER BY createdAt DESC, distance_km ASC`;
    } else if (sortBy === 'name') {
        orderClause = `ORDER BY name ASC, distance_km ASC`;
    }

    const rawQuery = `
        SELECT *,
        earth_distance(ll_to_earth(${userLat}, ${userLng}), ll_to_earth(latitude, longitude)) / 1000 AS distance_km
        FROM local_shops
        ${whereClause}
        ${orderClause}
        LIMIT 200
    `;

    const shopsWithDistance = await prisma.$queryRawUnsafe(rawQuery);

    // Calculate AdBid/Score for featured shops and sort if sortBy is not explicitly overriding
    let processedShops = shopsWithDistance.map(shop => {
        let adScore = 0;
        if (shop.isFeatured) {
            const rating = shop.rating || 4.5;
            adScore = (10 * 0.6) + (rating * 0.3) + ((1 / ((shop.distance_km||0) + 0.1)) * 0.1);
        }
        return { 
            ...shop, 
            distance_km: parseFloat((shop.distance_km || 0).toFixed(2)),
            ad_score: Math.round(adScore * 100) / 100 
        };
    });

    if (!sortBy || sortBy === 'distance') {
        // Sort priority: 1. Premium Shops (SaaS), 2. High AdScore (Boosted), 3. Distance
        processedShops.sort((a, b) => {
            if (b.isPremium !== a.isPremium) return (b.isPremium ? 1 : 0) - (a.isPremium ? 1 : 0);
            if (b.ad_score !== a.ad_score) return b.ad_score - a.ad_score;
            return a.distance_km - b.distance_km;
        });
    }
    
    await CacheService.set(cacheKey, processedShops, 300); // 5 minute cache

    res.json({ shops: processedShops, userLocation: { lat, lng }, fallbackUsed, strictRegion: !!region_id });
  } catch (error) {
    next(error);
  }
});

// GET /my-shop details (For vendor dashboard)
router.get('/my-shop', authenticate, async (req, res, next) => {
  try {
    const shop = await queryOne('SELECT * FROM local_shops WHERE owner_id = $1 LIMIT 1', [req.user.id]);
    if (!shop) return res.status(404).json({ error: 'No shop registered for this account' });
    
    const category = await queryOne('SELECT * FROM shop_categories WHERE id = $1', [shop.category_id]);
    
    // Fetch related data
    let products = [];
    let services = [];
    let staff = [];
    let orders = [];
    let appointments = [];
    
    if (category.business_model === 'product' || category.business_model === 'both' || category.business_model === 'hybrid') {
        const prodRes = await query('SELECT * FROM shop_products WHERE shop_id = $1', [shop.id]);
        products = prodRes.rows || prodRes;
        
        const ordRes = await query('SELECT * FROM orders WHERE shop_id = $1 ORDER BY created_at DESC LIMIT 50', [shop.id]);
        orders = ordRes.rows || ordRes;
    }
    
    if (category.business_model === 'appointment' || category.business_model === 'both' || category.business_model === 'hybrid') {
        const servRes = await query('SELECT * FROM shop_services WHERE shop_id = $1', [shop.id]);
        services = servRes.rows || servRes;
        
        // Ensure appointments table exists or fail gracefully
        try {
            const apptRes = await query('SELECT * FROM appointments WHERE shop_id = $1 ORDER BY appointment_date DESC LIMIT 50', [shop.id]);
            appointments = apptRes.rows || apptRes;
        } catch (e) {
            console.log('Appointments table might not exist yet', e.message);
        }
    }
    
    res.json({ 
        shop: { ...shop, category_details: category },
        products,
        services,
        staff,
        orders,
        appointments
    });
  } catch (error) {
    next(error);
  }
});

// GET /:id details
router.get('/:id', async (req, res, next) => {
  try {
    if (process.env.NODE_ENV !== 'production') {
      try {
        const fs = require('fs'); const path = require('path');
        const mockPath = path.resolve(__dirname, '../../../../../packages/mock-data/seeds/shops_directory.json');
        if (fs.existsSync(mockPath)) {
          const sData = JSON.parse(fs.readFileSync(mockPath, 'utf8'));
          let mockShop = sData.shops.find(s => s.id === req.params.id || s.slug === req.params.id);
          if (mockShop) {
            // Fake category details to match UI expectation
            mockShop.category_details = { name: mockShop.category, business_model: 'hybrid', slug: mockShop.category.toLowerCase().replace(/ /g, '-') };
            return res.json(mockShop);
          }
        }
      } catch (e) { next(e); }
    }
    const shop = await queryOne('SELECT * FROM local_shops WHERE id = $1', [req.params.id]);
    if (!shop) return res.status(404).json({ error: 'Shop not found' });
    
    const category = await queryOne('SELECT * FROM shop_categories WHERE id = $1', [shop.category_id]);
    res.json({ ...shop, category_details: category });
  } catch (error) {
    next(error);
  }
});

// POST register
router.post('/register', authenticate, async (req, res, next) => {
  try {
    const { name, description, category_id, phoneNumber, address, latitude, longitude, openingHours, photoUrls, delivery_available, pickup_available, estimated_delivery_time, gst_number, bank_account, registration_metadata } = req.body;
    
    // Generate UUID if DB doesn't auto-gen string IDs easily (using crypto)
    const id = crypto.randomUUID();

    const shop = await queryOne(`INSERT INTO local_shops (id, owner_id, region_id, name, description, category_id, phone_number, address, latitude, longitude, opening_hours, photo_urls, delivery_available, pickup_available, estimated_delivery_time, gst_number, bank_account, registration_metadata, approval_status)
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
    if (process.env.NODE_ENV !== 'production') {
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
    const { name, description, price, imageUrl } = req.body;
    const product = await queryOne(`INSERT INTO shop_products (shop_id, name, description, price, image_url) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.params.id, name, description, price, imageUrl]
    );
    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
});

// --- SERVICES ---
router.get('/:id/services', async (req, res, next) => {
  try {
    if (process.env.NODE_ENV !== 'production') {
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
    if (process.env.NODE_ENV !== 'production') {
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
        if (process.env.NODE_ENV !== 'production') {
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

    // Create appointment via Prisma
    const appt = await prisma.appointment.create({
      data: {
        bookingNumber: 'LS-BK-' + Date.now() + '-' + Math.floor(Math.random()*1000),
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
    next(error);
  }
});

router.post('/:id/orders', authenticate, async (req, res, next) => {
  try {
    const { items, totalAmount, paymentMethod, deliveryType, deliveryAddress, deliveryCoordinate, customerName, customerPhone, appointmentDetails } = req.body;
    
    // 1. Create main order for products
    let order = null;
    const productItems = items.filter(item => item.type !== 'service');
    const serviceItems = items.filter(item => item.type === 'service');

    if (productItems.length > 0) {
      order = await queryOne(`INSERT INTO shop_orders (id, shop_id, user_id, total_amount, items, payment_method, delivery_type, delivery_address, delivery_coordinate, customer_name, customer_phone, tracking_otp, status) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending') RETURNING *`,
        [crypto.randomUUID(), req.params.id, req.user.id, totalAmount, JSON.stringify(productItems), paymentMethod, deliveryType, deliveryAddress, deliveryCoordinate, customerName, customerPhone, Math.floor(1000+Math.random()*9000).toString()]
      );

      // Commission logic for products
      const shop = await queryOne('SELECT * FROM local_shops WHERE id = $1', [req.params.id]);
      const cat = await queryOne('SELECT * FROM shop_categories WHERE id = $1', [shop.category_id]);
      const cp = shop.commission_override_percent ?? cat.commission_percent;
      const cf = shop.convenience_fee_override ?? cat.convenience_fee;
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
router.get('/highlights/feed', async (req, res, next) => {
    try {
        const stories = await query(`
            SELECT st.*, s.name as shop_name 
            FROM stories st
            JOIN local_shops s ON st.shop_id = s.id
            ORDER BY st.created_at DESC
            LIMIT 20
        `);
        res.json(stories.rows || stories);
    } catch (err) {
        next(err);
    }
});

// Phase 13: Batch Checkout
router.post('/cart/batch-checkout', authenticate, async (req, res, next) => {
    try {
        const { items, use_coins } = req.body;
        // Mock implementation of batch checkout and loyalty coin burning
        const batchId = crypto.randomUUID();
        
        let total = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        let coinsUsed = 0;
        
        if (use_coins) {
            const loyalty = await queryOne('SELECT sampark_coins_balance FROM loyalty_accounts WHERE user_id = $1', [req.user.id]);
            if (loyalty && loyalty.sampark_coins_balance > 0) {
                const maxDiscount = total * 0.1; // Max 10% off
                coinsUsed = Math.min(loyalty.sampark_coins_balance, maxDiscount);
                total -= coinsUsed;
                
                await query('UPDATE loyalty_accounts SET sampark_coins_balance = sampark_coins_balance - $1 WHERE user_id = $2', [coinsUsed, req.user.id]);
                await query('INSERT INTO loyalty_transactions (id, user_id, amount, transaction_type, description) VALUES ($1, $2, $3, $4, $5)', [crypto.randomUUID(), req.user.id, coinsUsed, 'Burn', 'Used on Batch Order']);
            }
        }
        
        const combined_delivery_fee = 25.0; // Optimized delivery fee
        total += combined_delivery_fee;
        
        await query('INSERT INTO batch_orders (id, user_id, total_batch_amount, combined_delivery_fee, status) VALUES ($1, $2, $3, $4, $5)', [batchId, req.user.id, total, combined_delivery_fee, 'pending']);
        
        // Earn coins (1% of order value)
        const earnedCoins = Math.floor(total * 0.01);
        await query('INSERT INTO loyalty_accounts (user_id, sampark_coins_balance) VALUES ($1, $2) ON CONFLICT(user_id) DO UPDATE SET sampark_coins_balance = sampark_coins_balance + $2', [req.user.id, earnedCoins]);
        await query('INSERT INTO loyalty_transactions (id, user_id, amount, transaction_type, description) VALUES ($1, $2, $3, $4, $5)', [crypto.randomUUID(), req.user.id, earnedCoins, 'Earn', 'Earned from Batch Order']);

        res.status(201).json({ success: true, batchId, total, coinsUsed, earnedCoins, message: 'Batch order placed successfully!' });
    } catch (err) {
        next(err);
    }
});

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
router.put('/my-shop/staff/:staffId', authenticate, requireShopOwner, shopMgmt.updateShopStaff);
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
              u.name as user_name, u.avatar_url as user_avatar
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

module.exports = router;

