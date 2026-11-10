const express = require('express');
const router = express.Router();
const { query, queryOne, withTransaction } = require('../../../config/database');
const { authenticate } = require('../../../middleware/auth.middleware');
const { requireFeature } = require('../../../middleware/feature.middleware');
const crypto = require('crypto');

// Apply GTM Feature Protection
router.use(requireFeature('home_services'));

// GET /categories - Fetch active home service categories
router.get('/categories', async (req, res, next) => {
  try {
    const categories = await query('SELECT * FROM home_service_categories WHERE is_active = \'1\' ORDER BY name ASC');
    res.json({ success: true, categories: categories.rows || categories });
  } catch (err) {
    next(err);
  }
});

// GET /providers - Search technicians using spatial Bounding Box or Category
router.get('/providers', async (req, res, next) => {
  try {
    const { categoryId, lat, lng, radiusKm = 5 } = req.query;
    let sql = 'SELECT * FROM home_service_providers WHERE is_available = \'1\'';
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
          id, booking_ref, user_id, customer_id, provider_id, category_id, booking_date, time_slot, service_address, pincode, problem_description, inspection_fee, status
        ) VALUES ($1, $2, $3, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending')
      `, [bookingId, bookingRef, req.user.id, providerId, categoryId, bookingDate, timeSlot, serviceAddress, pincode || '411015', problemDescription || null, inspectionFee]);

      // 2. Ledger balance deduction (if balance exists)
      const wallet = await txClient.queryOne('SELECT balance FROM wallets WHERE user_id = $1', [req.user.id]);
      if (wallet && wallet.balance >= inspectionFee) {
        await txClient.query('UPDATE wallets SET balance = balance - $1 WHERE user_id = $2', [inspectionFee, req.user.id]);
        await txClient.query(`
          -- wallet_transactions has no user_id or description column, and the
          -- wallet id argument silently fell back to a user id.
          INSERT INTO wallet_transactions (id, wallet_id, amount, type, reference_id, purpose, status)
          VALUES ($1, (SELECT id FROM wallets WHERE user_id = $2), $3, 'debit', $4, 'Home Service Inspection Escrow Deposit', 'completed')
        `, [crypto.randomUUID(), req.user.id, inspectionFee, bookingRef]);
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
    
    // The booking insert above writes customer_id, and that is the only one of
    // the two columns ever populated -- filtering on user_id matched nothing, so
    // a non-admin saw an empty list however many bookings they had made.
    if (req.user.role !== 'admin') {
      sql += ' WHERE customer_id = $1';
      params.push(req.user.id);
    }
    
    sql += ' ORDER BY created_at DESC';
    const bookings = await query(sql, params);
    res.json({ success: true, bookings: bookings.rows || bookings });
  } catch (err) {
    next(err);
  }
});

// ─── PROVIDER SIDE ──────────────────────────────────────────────────────────
// The web service dashboard was a static placeholder because a provider had no
// way to see or act on the bookings made with them. A provider is any user
// with a home_service_providers profile; bookings reference that profile's id.

async function providerIdsFor(userId) {
  const rows = await query('SELECT id FROM home_service_providers WHERE user_id = $1', [userId]);
  return (rows.rows || rows || []).map((r) => r.id);
}

// Which status a provider may move a booking to from each state.
const PROVIDER_TRANSITIONS = {
  pending: ['confirmed', 'rejected'],
  confirmed: ['in_progress', 'cancelled'],
  in_progress: ['completed'],
};

// GET /home-services/provider/me — the caller's provider profile(s).
router.get('/provider/me', authenticate, async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT p.id, p.name, p.phone, p.category_id, c.name AS category_name, p.hourly_rate, p.rating,
              p.total_jobs, p.is_verified, p.is_available, p.serviced_pincodes_json
         FROM home_service_providers p
         LEFT JOIN home_service_categories c ON c.id = p.category_id
        WHERE p.user_id = $1`,
      [req.user.id]
    );
    const flag = (v) => v === true || v === 1 || v === '1';
    const providers = (rows.rows || rows || []).map((p) => {
      let pincodes = [];
      try { pincodes = JSON.parse(p.serviced_pincodes_json || '[]'); } catch { pincodes = []; }
      return {
        id: p.id, name: p.name, phone: p.phone, categoryId: p.category_id, categoryName: p.category_name,
        hourlyRate: Number(p.hourly_rate) || 0, rating: Number(p.rating) || 0, totalJobs: Number(p.total_jobs) || 0,
        verified: flag(p.is_verified), available: flag(p.is_available), servicedPincodes: Array.isArray(pincodes) ? pincodes : [],
      };
    });
    res.json({ success: true, providers });
  } catch (err) {
    next(err);
  }
});

// PUT /home-services/provider/availability { available } — take new bookings or pause.
router.put('/provider/availability', authenticate, async (req, res, next) => {
  try {
    const { available } = req.body || {};
    if (typeof available !== 'boolean') return res.status(400).json({ error: 'available must be true or false' });
    const ids = await providerIdsFor(req.user.id);
    if (!ids.length) return res.status(404).json({ error: 'No service provider profile for this account' });
    const flag = available ? "'1'" : "'0'";
    for (const id of ids) await query(`UPDATE home_service_providers SET is_available = ${flag} WHERE id = $1`, [id]);
    res.json({ success: true, available });
  } catch (err) {
    next(err);
  }
});

// GET /home-services/provider/bookings?status= — bookings made with the caller.
router.get('/provider/bookings', authenticate, async (req, res, next) => {
  try {
    const ids = await providerIdsFor(req.user.id);
    if (!ids.length) return res.json({ success: true, bookings: [] });
    const params = [...ids];
    const where = [`b.provider_id IN (${ids.map((_, i) => `$${i + 1}`).join(', ')})`];
    if (typeof req.query.status === 'string' && req.query.status) {
      if (!/^[a-z_]{1,20}$/.test(req.query.status)) return res.status(400).json({ error: 'Invalid status filter' });
      params.push(req.query.status);
      where.push(`b.status = $${params.length}`);
    }
    const rows = await query(
      `SELECT b.id, b.booking_ref, b.booking_date, b.time_slot, b.service_address, b.pincode,
              b.problem_description, b.status, b.inspection_fee, b.total_amount, b.payment_status, b.created_at,
              c.name AS category_name, u.full_name AS customer_name
         FROM home_service_bookings b
         LEFT JOIN home_service_categories c ON c.id = b.category_id
         LEFT JOIN users u ON CAST(u.id AS TEXT) = b.customer_id
        WHERE ${where.join(' AND ')}
        ORDER BY b.booking_date DESC, b.created_at DESC
        LIMIT 200`,
      params
    );
    res.json({ success: true, bookings: rows.rows || rows || [] });
  } catch (err) {
    next(err);
  }
});

// PUT /home-services/provider/bookings/:id/status { status, totalAmount? }
router.put('/provider/bookings/:id/status', authenticate, async (req, res, next) => {
  try {
    const { status, totalAmount } = req.body || {};
    const booking = await queryOne('SELECT id, provider_id, status FROM home_service_bookings WHERE id = $1', [req.params.id]);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const ids = await providerIdsFor(req.user.id);
    if (!ids.includes(booking.provider_id)) return res.status(403).json({ error: 'This booking is not assigned to you' });

    const allowed = PROVIDER_TRANSITIONS[booking.status] || [];
    if (!allowed.includes(status)) {
      return res.status(409).json({ error: `A ${booking.status} booking cannot be moved to ${status}`, allowed });
    }

    let amount = null;
    if (status === 'completed') {
      amount = Number(totalAmount);
      if (!Number.isFinite(amount) || amount < 0 || amount > 1000000) {
        return res.status(400).json({ error: 'totalAmount (the final bill) is required to complete a booking' });
      }
    }

    // Conditional on the status read above, so two concurrent updates cannot
    // both apply.
    const result = await query(
      `UPDATE home_service_bookings
          SET status = $1, total_amount = COALESCE($2, total_amount)
        WHERE id = $3 AND status = $4`,
      [status, amount, booking.id, booking.status]
    );
    const changed = result && (result.rowCount ?? result.changes ?? 1);
    if (!changed) return res.status(409).json({ error: 'The booking changed while you were updating it. Reload and try again.' });

    if (status === 'completed') {
      await query('UPDATE home_service_providers SET total_jobs = COALESCE(total_jobs, 0) + 1 WHERE id = $1', [booking.provider_id]);
    }
    res.json({ success: true, id: booking.id, status });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
