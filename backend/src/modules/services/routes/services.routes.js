const express = require('express');
const router = express.Router();
const { query } = require('../../../config/database');
const { authenticate } = require('../../../middleware/auth.middleware');
const crypto = require('crypto');

// GET nearby services
router.get('/nearby', authenticate, async (req, res, next) => {
    try {
        const { region_id } = req.query;
        let sql = 'SELECT * FROM local_services WHERE status = $1';
        const params = ['active'];

        if (region_id) {
            // Note: Ensuring region_id exists on local_services or related provider
            try {
                sql += ' AND region_id = $2';
                params.push(region_id);
            } catch (e) { next(e); }
        }

        const svcsData = await query(sql, params);
        res.json(svcsData.rows || svcsData);
    } catch (err) {
        next(err);
    }
});

// POST book service
router.post('/book', authenticate, async (req, res, next) => {
    try {
        const { service_id, scheduled_time } = req.body;
        const id = crypto.randomUUID();
        await query('INSERT INTO service_bookings (id, service_id, user_id, scheduled_time, status) VALUES ($1, $2, $3, $4, $5)',
            [id, service_id, req.user.id, scheduled_time, 'pending']);
        res.status(201).json({ success: true, id, message: 'Service booked successfully' });
    } catch (err) {
        next(err);
    }
});

// GET my bookings
router.get('/my-bookings', authenticate, async (req, res, next) => {
    try {
        const sql = `
            SELECT 
                b.id,
                b.scheduled_time,
                b.status,
                s.name as service_name,
                s.base_price as price,
                s.provider_name as provider
            FROM service_bookings b
            LEFT JOIN local_services s ON b.service_id = s.id
            WHERE b.user_id = $1
            ORDER BY b.scheduled_time DESC
        `;
        const result = await query(sql, [req.user.id]);
        res.json(result.rows || result);
    } catch (err) {
        next(err);
    }
});

// The services page lists providers from GET /services; only /nearby existed,
// so the unfiltered listing returned 404.
router.get('/', async (req, res, next) => {
  try {
    const { category, pincode } = req.query;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);

    const params = ['active'];
    const clauses = ['status = $1'];
    if (category) {
      params.push(category);
      clauses.push(`category = $${params.length}`);
    }
    if (pincode) {
      params.push(pincode);
      clauses.push(`pincode = $${params.length}`);
    }
    params.push(limit);

    const rows = await query(
      `SELECT id, name, category, description, provider_name, base_price,
              duration_mins, pincode, image_url, rating, total_ratings, status
         FROM local_services
        WHERE ${clauses.join(' AND ')}
        ORDER BY rating DESC, name ASC
        LIMIT $${params.length}`,
      params
    );

    const data = rows.rows || rows;
    res.json({ success: true, data, services: data });
  } catch (error) {
    next(error);
  }
});

// The admin Home Services tab has always called this; it was never implemented.
router.get('/home-services/bookings', authenticate, async (req, res, next) => {
  try {
    const { status, limit } = req.query;
    const params = [];
    let where = '';
    if (status) {
      params.push(status);
      where = `WHERE b.status = $${params.length}`;
    }
    params.push(Math.min(parseInt(limit, 10) || 100, 500));

    const rows = await query(
      `SELECT b.*, u.full_name AS customer_name, u.phone_number AS customer_phone
         FROM home_service_bookings b
         LEFT JOIN users u ON b.user_id = u.id
         ${where}
        ORDER BY b.created_at DESC
        LIMIT $${params.length}`,
      params
    );
    const bookings = rows.rows || rows;
    res.json({ success: true, bookings, data: bookings });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
