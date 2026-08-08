const express = require('express');
const router = express.Router();
const { query, queryOne, withTransaction } = require('../../../../config/database');
const { authenticate } = require('../../../../middleware/auth.middleware');
const { requireFeature } = require('../../../../middleware/feature.middleware');
const crypto = require('crypto');

// Apply GTM Feature Protection
router.use(requireFeature('home_services'));

// GET /categories - Fetch active home service categories
router.get('/categories', async (req, res, next) => {
  try {
    const categories = await query('SELECT * FROM home_service_categories WHERE is_active = 1 ORDER BY name ASC');
    res.json({ success: true, categories: categories.rows || categories });
  } catch (err) {
    next(err);
  }
});

// GET /providers - Search technicians using spatial Bounding Box or Category
router.get('/providers', async (req, res, next) => {
  try {
    const { categoryId, lat, lng, radiusKm = 5 } = req.query;
    let sql = 'SELECT * FROM home_service_providers WHERE is_available = 1';
    const params = [];

    if (categoryId) {
      params.push(categoryId);
      sql += ` AND category_id = $${params.length}`;
    }

    // Spatial Bounding Box Filtering
    if (lat && lng) {
      const latDelta = parseFloat(radiusKm) / 111.0;
      const lngDelta = parseFloat(radiusKm) / (111.0 * Math.cos(parseFloat(lat) * Math.PI / 180));

      const minLat = parseFloat(lat) - latDelta;
      const maxLat = parseFloat(lat) + latDelta;
      const minLng = parseFloat(lng) - lngDelta;
      const maxLng = parseFloat(lng) + lngDelta;

      params.push(minLat, maxLat, minLng, maxLng);
      const idx = params.length;
      sql += ` AND (latitude BETWEEN $${idx-3} AND $${idx-2}) AND (longitude BETWEEN $${idx-1} AND $${idx})`;
    }

    const providers = await query(sql, params);
    res.json({ success: true, providers: providers.rows || providers });
  } catch (err) {
    next(err);
  }
});

// POST /bookings - Book a technician slot with atomic Wallet escrow
router.post('/bookings', authenticate, async (req, res, next) => {
  try {
    const { providerId, categoryId, bookingDate, timeSlot, serviceAddress, pincode, problemDescription } = req.body;

    if (!providerId || !categoryId || !bookingDate || !timeSlot || !serviceAddress) {
      return res.status(400).json({ error: 'Missing required booking fields' });
    }

    const category = await queryOne('SELECT base_inspection_fee FROM home_service_categories WHERE id = $1', [categoryId]);
    const inspectionFee = category?.base_inspection_fee || 199.00;
    const bookingRef = `HS-${Math.floor(100000 + Math.random() * 900000)}`;
    const bookingId = crypto.randomUUID();

    // Atomic Wallet Transaction for Inspection Escrow
    await withTransaction(async (txClient) => {
      // 1. Insert booking
      await txClient.query(`
        INSERT INTO home_service_bookings (
          id, booking_ref, user_id, provider_id, category_id, booking_date, time_slot, service_address, pincode, problem_description, inspection_fee, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending')
      `, [bookingId, bookingRef, req.user.id, providerId, categoryId, bookingDate, timeSlot, serviceAddress, pincode || '411015', problemDescription || null, inspectionFee]);

      // 2. Ledger balance deduction (if balance exists)
      const wallet = await txClient.queryOne('SELECT balance FROM user_wallets WHERE user_id = $1', [req.user.id]);
      if (wallet && wallet.balance >= inspectionFee) {
        await txClient.query('UPDATE user_wallets SET balance = balance - $1 WHERE user_id = $2', [inspectionFee, req.user.id]);
        await txClient.query(`
          INSERT INTO wallet_transactions (id, wallet_id, user_id, amount, transaction_type, reference_id, description)
          VALUES ($1, $2, $3, $4, 'debit', $5, 'Home Service Inspection Escrow Deposit')
        `, [crypto.randomUUID(), wallet.id || req.user.id, req.user.id, inspectionFee, bookingRef]);
      }
    });

    res.status(201).json({
      success: true,
      message: 'Technician booked & inspection slot confirmed!',
      booking: { id: bookingId, booking_ref: bookingRef, status: 'pending', inspection_fee: inspectionFee }
    });
  } catch (err) {
    next(err);
  }
});

// GET /bookings - List active bookings for Admin / User
router.get('/bookings', authenticate, async (req, res, next) => {
  try {
    let sql = 'SELECT * FROM home_service_bookings';
    const params = [];
    
    // If not admin, restrict to own user_id
    if (req.user.role !== 'admin') {
      sql += ' WHERE user_id = $1';
      params.push(req.user.id);
    }
    
    sql += ' ORDER BY created_at DESC';
    const bookings = await query(sql, params);
    res.json({ success: true, bookings: bookings.rows || bookings });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
