const express = require('express');
const router = express.Router();
const { query } = require('../../../config/database');
const { authenticate } = require('../../../middleware/auth.middleware');
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

// ─── BOOKING ─────────────────────────────────────────────────────────────────
// The carpool page has always posted here; it was never implemented.
router.post('/rides/:id/book', authenticate, async (req, res, next) => {
  try {
    const seats = parseInt(req.body.seats_booked, 10) || 1;
    if (seats < 1 || seats > 8) {
      return res.status(400).json({ error: 'seats_booked must be between 1 and 8' });
    }

    const { queryOne, withTransaction } = require('../../../config/database');
    const ride = await queryOne('SELECT * FROM carpool_rides WHERE id = $1', [req.params.id]);
    if (!ride) return res.status(404).json({ error: 'Ride not found' });
    if (String(ride.driver_id) === String(req.user.id)) {
      return res.status(400).json({ error: 'You cannot book your own ride' });
    }

    const capacity = ride.available_seats ?? ride.seats_available ?? ride.total_seats ?? null;

    // Seat availability is evaluated inside the transaction so concurrent
    // bookings cannot together oversell the ride.
    const bookingId = await withTransaction(async (client) => {
      if (capacity !== null) {
        const taken = await client.query(
          `SELECT COALESCE(SUM(seats_booked), 0) AS booked
             FROM carpool_bookings
            WHERE ride_id = $1 AND status = 'confirmed'`,
          [req.params.id]
        );
        const booked = parseInt(taken.rows[0].booked, 10) || 0;
        if (booked + seats > capacity) {
          throw Object.assign(
            new Error(`Only ${Math.max(capacity - booked, 0)} seat(s) remain`),
            { status: 409 }
          );
        }
      }

      const inserted = await client.query(
        `INSERT INTO carpool_bookings (ride_id, passenger_id, seats_booked, status)
         VALUES ($1, $2, $3, 'confirmed')
         ON CONFLICT (ride_id, passenger_id) DO UPDATE
           SET seats_booked = EXCLUDED.seats_booked, status = 'confirmed'
         RETURNING id`,
        [req.params.id, req.user.id, seats]
      );
      return inserted.rows[0].id;
    });

    res.status(201).json({ success: true, bookingId, seatsBooked: seats, message: 'Ride booked' });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    next(error);
  }
});

module.exports = router;
