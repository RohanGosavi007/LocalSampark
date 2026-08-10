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
            } catch(e) {}
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

module.exports = router;
