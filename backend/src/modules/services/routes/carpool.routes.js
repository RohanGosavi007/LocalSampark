const express = require('express');
const router = express.Router();
const { query } = require('../../../../config/database');
const { authenticate } = require('../../../../middleware/auth.middleware');
const crypto = require('crypto');

// GET rides
router.get('/rides', authenticate, async (req, res, next) => {
    try {
        const rideData = await query('SELECT * FROM carpool_rides WHERE status = $1', ['active']);
        res.json({ success: true, rides: rideData.rows || rideData });
    } catch (err) {
        next(err);
    }
});

// POST rides
router.post('/rides', authenticate, async (req, res, next) => {
    try {
        const { origin, destination, departure_time, seats_available, price_per_seat } = req.body;
        const id = crypto.randomUUID();
        await query('INSERT INTO carpool_rides (id, driver_id, origin, destination, departure_time, seats_available, price_per_seat) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [id, req.user.id, origin, destination, departure_time, seats_available, price_per_seat]);
        res.status(201).json({ success: true, message: 'Ride offered successfully' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
