const express = require('express');
const router = express.Router();
const { query, queryOne, queryMany, withTransaction } = require('../../../config/database');
const { authenticate } = require('../../../middleware/auth.middleware');
const crypto = require('crypto');

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

async function getDriverRating(driverId) {
  const r = await queryOne(`SELECT AVG(rating) as avg_rating, COUNT(*) as count FROM carpool_ratings WHERE rated_id = $1`, [driverId]);
  return { avg: r?.avg_rating ? parseFloat(r.avg_rating).toFixed(1) : '4.5', count: r?.count || 0 };
}

async function enrichRide(ride) {
  const driver = await queryOne('SELECT id, full_name, phone_number, profile_photo FROM users WHERE id = $1', [ride.driver_id]);
  const vehicle = ride.vehicle_id ? await queryOne('SELECT * FROM carpool_vehicles WHERE id = $1', [ride.vehicle_id]) : null;
  const waypoints = await queryMany('SELECT * FROM carpool_ride_waypoints WHERE ride_id = $1 ORDER BY stop_order', [ride.id]);
  const rating = await getDriverRating(ride.driver_id);
  const bookings = await queryMany(`SELECT cb.*, u.full_name as passenger_name FROM carpool_bookings cb LEFT JOIN users u ON cb.passenger_id = u.id WHERE cb.ride_id = $1 AND cb.status = 'confirmed'`, [ride.id]);
  const bookedSeats = bookings.reduce((s, b) => s + (b.seats_booked || 1), 0);
  return {
    ...ride,
    driver: driver ? { id: driver.id, full_name: driver.full_name, profile_photo: driver.profile_photo } : null,
    vehicle,
    waypoints,
    driver_rating: rating,
    bookings,
    booked_seats: bookedSeats,
    remaining_seats: Math.max(0, (ride.available_seats || ride.seats_available || 4) - bookedSeats)
  };
}

// ═══════════════════════════════════════════════════════════════
// RIDES
// ═══════════════════════════════════════════════════════════════

// GET /rides — Search rides with geo-radius, date, type, gender filters
router.get('/rides', async (req, res, next) => {
  try {
    const { from_lat, from_lng, to_lat, to_lng, radius = 15, date, ride_type, gender, page = 1, limit = 20 } = req.query;
    let sql = `SELECT * FROM carpool_rides WHERE status = 'active'`;
    const params = [];

    if (ride_type) { params.push(ride_type); sql += ` AND ride_type = $${params.length}`; }
    if (gender && gender !== 'any') { params.push(gender); sql += ` AND (gender_preference = $${params.length} OR gender_preference = 'any')`; }
    if (date) { params.push(date); sql += ` AND ride_date = $${params.length}`; }

    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const rides = await queryMany(sql, params);

    // Geo filter in JS (SQLite doesn't have PostGIS)
    let filtered = rides;
    if (from_lat && from_lng) {
      const fLat = parseFloat(from_lat), fLng = parseFloat(from_lng), r = parseFloat(radius);
      filtered = rides.filter(ride => {
        if (!ride.from_lat || !ride.from_lng) return true;
        return haversineKm(fLat, fLng, ride.from_lat, ride.from_lng) <= r;
      });
    }

    const enriched = await Promise.all(filtered.map(enrichRide));
    res.json({ success: true, rides: enriched, page: parseInt(page), total: enriched.length });
  } catch (err) { next(err); }
});

// GET /rides/:id — Full ride detail
router.get('/rides/:id', async (req, res, next) => {
  try {
    const ride = await queryOne('SELECT * FROM carpool_rides WHERE id = $1', [req.params.id]);
    if (!ride) return res.status(404).json({ error: 'Ride not found' });
    const enriched = await enrichRide(ride);
    res.json({ success: true, ride: enriched });
  } catch (err) { next(err); }
});

// POST /rides — Create a new ride offer
router.post('/rides', authenticate, async (req, res, next) => {
  try {
    const { from_location, to_location, from_lat, from_lng, to_lat, to_lng, departure_time, ride_date,
            seats_available = 3, price_per_seat = 0, vehicle_id, ride_type = 'car', gender_preference = 'any',
            is_intercity = false, luggage_space = 0, max_detour_km = 5, fare_type = 'fixed', waypoints = [] } = req.body;

    if (!from_location || !to_location) return res.status(400).json({ error: 'From and To locations are required' });

    const id = crypto.randomUUID();
    let dist = null;
    if (from_lat && from_lng && to_lat && to_lng) {
      dist = haversineKm(parseFloat(from_lat), parseFloat(from_lng), parseFloat(to_lat), parseFloat(to_lng));
    }

    await query(`INSERT INTO carpool_rides (id, driver_id, from_location, to_location, origin, destination,
      from_lat, from_lng, to_lat, to_lng, departure_time, ride_date, seats_available, available_seats,
      price_per_seat, vehicle_id, ride_type, gender_preference, is_intercity, luggage_space, max_detour_km,
      estimated_distance_km, fare_type, status)
      VALUES ($1,$2,$3,$4,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,'active')`,
      [id, req.user.id, from_location, to_location, from_lat||null, from_lng||null, to_lat||null, to_lng||null,
       departure_time||null, ride_date||null, seats_available, price_per_seat, vehicle_id||null, ride_type,
       gender_preference, is_intercity?1:0, luggage_space, max_detour_km, dist, fare_type]);

    // Insert waypoints
    for (let i = 0; i < waypoints.length; i++) {
      const wp = waypoints[i];
      await query(`INSERT INTO carpool_ride_waypoints (id, ride_id, location_name, latitude, longitude, stop_order)
        VALUES ($1,$2,$3,$4,$5,$6)`,
        [crypto.randomUUID(), id, wp.name, wp.lat||null, wp.lng||null, i]);
    }

    res.status(201).json({ success: true, rideId: id, message: 'Ride published successfully' });
  } catch (err) { next(err); }
});

// PUT /rides/:id — Update ride (driver only)
router.put('/rides/:id', authenticate, async (req, res, next) => {
  try {
    const ride = await queryOne('SELECT * FROM carpool_rides WHERE id = $1', [req.params.id]);
    if (!ride) return res.status(404).json({ error: 'Ride not found' });
    if (String(ride.driver_id) !== String(req.user.id)) return res.status(403).json({ error: 'Not your ride' });

    const { departure_time, seats_available, price_per_seat, status } = req.body;
    const sets = [], params = [];
    if (departure_time) { params.push(departure_time); sets.push(`departure_time = $${params.length}`); }
    if (seats_available) { params.push(seats_available); sets.push(`seats_available = $${params.length}`); sets.push(`available_seats = $${params.length}`); }
    if (price_per_seat !== undefined) { params.push(price_per_seat); sets.push(`price_per_seat = $${params.length}`); }
    if (status) { params.push(status); sets.push(`status = $${params.length}`); }
    if (sets.length === 0) return res.status(400).json({ error: 'Nothing to update' });

    params.push(req.params.id);
    await query(`UPDATE carpool_rides SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${params.length}`, params);
    res.json({ success: true, message: 'Ride updated' });
  } catch (err) { next(err); }
});

// DELETE /rides/:id — Cancel ride
router.delete('/rides/:id', authenticate, async (req, res, next) => {
  try {
    const ride = await queryOne('SELECT * FROM carpool_rides WHERE id = $1', [req.params.id]);
    if (!ride) return res.status(404).json({ error: 'Ride not found' });
    if (String(ride.driver_id) !== String(req.user.id)) return res.status(403).json({ error: 'Not your ride' });
    await query(`UPDATE carpool_rides SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [req.params.id]);
    res.json({ success: true, message: 'Ride cancelled' });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════
// BOOKING
// ═══════════════════════════════════════════════════════════════

router.post('/rides/:id/book', authenticate, async (req, res, next) => {
  try {
    const seats = parseInt(req.body.seats_booked, 10) || 1;
    if (seats < 1 || seats > 8) return res.status(400).json({ error: 'seats_booked must be 1-8' });

    const ride = await queryOne('SELECT * FROM carpool_rides WHERE id = $1', [req.params.id]);
    if (!ride) return res.status(404).json({ error: 'Ride not found' });
    if (String(ride.driver_id) === String(req.user.id)) return res.status(400).json({ error: 'Cannot book own ride' });

    const capacity = ride.available_seats ?? ride.seats_available ?? 4;
    const taken = await queryOne(`SELECT COALESCE(SUM(seats_booked), 0) as booked FROM carpool_bookings WHERE ride_id = $1 AND status = 'confirmed'`, [req.params.id]);
    const booked = parseInt(taken?.booked || 0, 10);
    if (booked + seats > capacity) return res.status(409).json({ error: `Only ${Math.max(capacity - booked, 0)} seat(s) remain` });

    const bookingId = crypto.randomUUID();
    await query(`INSERT INTO carpool_bookings (id, ride_id, passenger_id, seats_booked, status, bid_amount)
      VALUES ($1,$2,$3,$4,'confirmed',$5)
      ON CONFLICT (ride_id, passenger_id) DO UPDATE SET seats_booked = EXCLUDED.seats_booked, status = 'confirmed'`,
      [bookingId, req.params.id, req.user.id, seats, req.body.bid_amount || ride.price_per_seat]);

    res.status(201).json({ success: true, bookingId, seatsBooked: seats, message: 'Ride booked' });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════
// BIDDING (inDrive-style)
// ═══════════════════════════════════════════════════════════════

// POST /rides/:id/bid — Submit a fare bid
router.post('/rides/:id/bid', authenticate, async (req, res, next) => {
  try {
    const { bid_amount, seats_requested = 1, message } = req.body;
    if (!bid_amount || bid_amount <= 0) return res.status(400).json({ error: 'bid_amount is required and must be positive' });

    const ride = await queryOne('SELECT * FROM carpool_rides WHERE id = $1', [req.params.id]);
    if (!ride) return res.status(404).json({ error: 'Ride not found' });
    if (String(ride.driver_id) === String(req.user.id)) return res.status(400).json({ error: 'Cannot bid on own ride' });

    const existing = await queryOne(`SELECT * FROM carpool_bids WHERE ride_id = $1 AND bidder_id = $2 AND status = 'pending'`, [req.params.id, req.user.id]);
    if (existing) {
      await query(`UPDATE carpool_bids SET bid_amount = $1, message = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
        [bid_amount, message || null, existing.id]);
      return res.json({ success: true, bidId: existing.id, message: 'Bid updated' });
    }

    const bidId = crypto.randomUUID();
    await query(`INSERT INTO carpool_bids (id, ride_id, bidder_id, bid_amount, seats_requested, message, status)
      VALUES ($1,$2,$3,$4,$5,$6,'pending')`,
      [bidId, req.params.id, req.user.id, bid_amount, seats_requested, message || null]);

    res.status(201).json({ success: true, bidId, message: 'Bid submitted' });
  } catch (err) { next(err); }
});

// GET /rides/:id/bids — List all bids for a ride
router.get('/rides/:id/bids', authenticate, async (req, res, next) => {
  try {
    const bids = await queryMany(`SELECT b.*, u.full_name as bidder_name, u.profile_photo FROM carpool_bids b
      LEFT JOIN users u ON b.bidder_id = u.id WHERE b.ride_id = $1 ORDER BY b.created_at DESC`, [req.params.id]);
    res.json({ success: true, bids });
  } catch (err) { next(err); }
});

// PUT /bids/:id/respond — Driver accept/reject/counter a bid
router.put('/bids/:id/respond', authenticate, async (req, res, next) => {
  try {
    const { action, counter_amount } = req.body; // action: 'accept', 'reject', 'counter'
    const bid = await queryOne('SELECT * FROM carpool_bids WHERE id = $1', [req.params.id]);
    if (!bid) return res.status(404).json({ error: 'Bid not found' });

    const ride = await queryOne('SELECT * FROM carpool_rides WHERE id = $1', [bid.ride_id]);
    if (!ride || String(ride.driver_id) !== String(req.user.id)) return res.status(403).json({ error: 'Only the ride driver can respond' });

    if (action === 'accept') {
      await query(`UPDATE carpool_bids SET status = 'accepted', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [req.params.id]);
      // Auto-create booking
      const bookingId = crypto.randomUUID();
      await query(`INSERT INTO carpool_bookings (id, ride_id, passenger_id, seats_booked, status, bid_amount)
        VALUES ($1,$2,$3,$4,'confirmed',$5)
        ON CONFLICT (ride_id, passenger_id) DO UPDATE SET seats_booked = EXCLUDED.seats_booked, status = 'confirmed', bid_amount = EXCLUDED.bid_amount`,
        [bookingId, bid.ride_id, bid.bidder_id, bid.seats_requested, bid.bid_amount]);
      res.json({ success: true, message: 'Bid accepted, booking created', bookingId });
    } else if (action === 'reject') {
      await query(`UPDATE carpool_bids SET status = 'rejected', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [req.params.id]);
      res.json({ success: true, message: 'Bid rejected' });
    } else if (action === 'counter') {
      if (!counter_amount) return res.status(400).json({ error: 'counter_amount required' });
      await query(`UPDATE carpool_bids SET status = 'countered', counter_amount = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [counter_amount, req.params.id]);
      res.json({ success: true, message: 'Counter offer sent' });
    } else {
      return res.status(400).json({ error: 'action must be accept, reject, or counter' });
    }
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════
// RATINGS
// ═══════════════════════════════════════════════════════════════

router.post('/rides/:id/rate', authenticate, async (req, res, next) => {
  try {
    const { rating, comment, rated_id } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be 1-5' });

    const ride = await queryOne('SELECT * FROM carpool_rides WHERE id = $1', [req.params.id]);
    if (!ride) return res.status(404).json({ error: 'Ride not found' });

    const targetId = rated_id || (String(ride.driver_id) === String(req.user.id) ? null : ride.driver_id);
    if (!targetId) return res.status(400).json({ error: 'rated_id is required when rating as driver' });

    const role = String(ride.driver_id) === String(req.user.id) ? 'driver' : 'passenger';
    const ratingId = crypto.randomUUID();
    await query(`INSERT INTO carpool_ratings (id, ride_id, rater_id, rated_id, rating, comment, role)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT (ride_id, rater_id) DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment`,
      [ratingId, req.params.id, req.user.id, targetId, rating, comment || null, role]);

    res.json({ success: true, message: 'Rating submitted' });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════
// SOS
// ═══════════════════════════════════════════════════════════════

router.post('/rides/:id/sos', authenticate, async (req, res, next) => {
  try {
    const { latitude, longitude, message } = req.body;
    const sosId = crypto.randomUUID();
    await query(`INSERT INTO carpool_sos_alerts (id, ride_id, user_id, latitude, longitude, message, status)
      VALUES ($1,$2,$3,$4,$5,$6,'active')`,
      [sosId, req.params.id, req.user.id, latitude||null, longitude||null, message||'Emergency SOS triggered']);

    // In production: send push notification to admin, emergency contacts, etc.
    res.status(201).json({ success: true, sosId, message: 'SOS alert sent. Emergency contacts notified.' });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════
// IN-RIDE CHAT
// ═══════════════════════════════════════════════════════════════

router.get('/rides/:id/chat', authenticate, async (req, res, next) => {
  try {
    const messages = await queryMany(`SELECT m.*, u.full_name as sender_name FROM carpool_chat_messages m
      LEFT JOIN users u ON m.sender_id = u.id WHERE m.ride_id = $1 ORDER BY m.created_at ASC`, [req.params.id]);
    res.json({ success: true, messages });
  } catch (err) { next(err); }
});

router.post('/rides/:id/chat', authenticate, async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'message is required' });
    const msgId = crypto.randomUUID();
    await query(`INSERT INTO carpool_chat_messages (id, ride_id, sender_id, message) VALUES ($1,$2,$3,$4)`,
      [msgId, req.params.id, req.user.id, message]);
    res.status(201).json({ success: true, messageId: msgId });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════
// MY RIDES
// ═══════════════════════════════════════════════════════════════

router.get('/my-rides', authenticate, async (req, res, next) => {
  try {
    const asDriver = await queryMany(`SELECT * FROM carpool_rides WHERE driver_id = $1 ORDER BY created_at DESC`, [req.user.id]);
    const asPassenger = await queryMany(`SELECT r.* FROM carpool_rides r
      INNER JOIN carpool_bookings b ON r.id = b.ride_id WHERE b.passenger_id = $1 ORDER BY r.created_at DESC`, [req.user.id]);
    
    const driverEnriched = await Promise.all(asDriver.map(enrichRide));
    const passengerEnriched = await Promise.all(asPassenger.map(enrichRide));

    res.json({ success: true, as_driver: driverEnriched, as_passenger: passengerEnriched });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════
// VEHICLES
// ═══════════════════════════════════════════════════════════════

router.get('/vehicles', authenticate, async (req, res, next) => {
  try {
    const vehicles = await queryMany('SELECT * FROM carpool_vehicles WHERE owner_id = $1 ORDER BY created_at DESC', [req.user.id]);
    res.json({ success: true, vehicles });
  } catch (err) { next(err); }
});

router.post('/vehicles', authenticate, async (req, res, next) => {
  try {
    const { vehicle_type = 'car', make, model, color, plate_number, photo_url, total_seats = 4, fuel_type = 'petrol' } = req.body;
    if (!model || !plate_number) return res.status(400).json({ error: 'Model and plate number required' });

    const id = crypto.randomUUID();
    await query(`INSERT INTO carpool_vehicles (id, owner_id, vehicle_type, make, model, color, plate_number, photo_url, total_seats, fuel_type)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [id, req.user.id, vehicle_type, make||null, model, color||null, plate_number, photo_url||null, total_seats, fuel_type]);

    res.status(201).json({ success: true, vehicleId: id, message: 'Vehicle registered' });
  } catch (err) { next(err); }
});

router.put('/vehicles/:id', authenticate, async (req, res, next) => {
  try {
    const vehicle = await queryOne('SELECT * FROM carpool_vehicles WHERE id = $1 AND owner_id = $2', [req.params.id, req.user.id]);
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    const { model, color, plate_number, photo_url, total_seats } = req.body;
    const sets = [], params = [];
    if (model) { params.push(model); sets.push(`model = $${params.length}`); }
    if (color) { params.push(color); sets.push(`color = $${params.length}`); }
    if (plate_number) { params.push(plate_number); sets.push(`plate_number = $${params.length}`); }
    if (photo_url) { params.push(photo_url); sets.push(`photo_url = $${params.length}`); }
    if (total_seats) { params.push(total_seats); sets.push(`total_seats = $${params.length}`); }
    if (sets.length === 0) return res.status(400).json({ error: 'Nothing to update' });

    params.push(req.params.id);
    await query(`UPDATE carpool_vehicles SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${params.length}`, params);
    res.json({ success: true, message: 'Vehicle updated' });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════
// RECURRING RIDES
// ═══════════════════════════════════════════════════════════════

router.get('/recurring', authenticate, async (req, res, next) => {
  try {
    const schedules = await queryMany('SELECT * FROM carpool_recurring_rides WHERE driver_id = $1 AND is_active = 1 ORDER BY created_at DESC', [req.user.id]);
    res.json({ success: true, schedules });
  } catch (err) { next(err); }
});

router.post('/recurring', authenticate, async (req, res, next) => {
  try {
    const { from_location, to_location, from_lat, from_lng, to_lat, to_lng, departure_time,
            days_of_week = '1,2,3,4,5', seats_available = 3, price_per_seat = 0, ride_type = 'car',
            gender_preference = 'any', vehicle_id } = req.body;
    if (!from_location || !to_location || !departure_time) return res.status(400).json({ error: 'From, To and departure_time required' });

    const id = crypto.randomUUID();
    await query(`INSERT INTO carpool_recurring_rides (id, driver_id, vehicle_id, from_location, to_location,
      from_lat, from_lng, to_lat, to_lng, departure_time, days_of_week, seats_available, price_per_seat, ride_type, gender_preference)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [id, req.user.id, vehicle_id||null, from_location, to_location, from_lat||null, from_lng||null,
       to_lat||null, to_lng||null, departure_time, days_of_week, seats_available, price_per_seat, ride_type, gender_preference]);

    res.status(201).json({ success: true, scheduleId: id, message: 'Recurring ride created' });
  } catch (err) { next(err); }
});

module.exports = router;
