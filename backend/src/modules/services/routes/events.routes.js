const express = require('express');
const router = express.Router();
const { query, queryOne, withTransaction } = require('../../../../config/database');
const { authenticate } = require('../../../../middleware/auth.middleware');
const { requireFeature } = require('../../../../middleware/feature.middleware');
const crypto = require('crypto');

// Apply GTM Feature Protection
router.use(requireFeature('events'));

// GET / - List upcoming local events with spatial geofence filter
router.get('/', async (req, res, next) => {
  try {
    const { category, lat, lng, radiusKm = 10 } = req.query;
    let sql = 'SELECT * FROM local_events WHERE is_active = 1';
    const params = [];

    if (category) {
      params.push(category);
      sql += ` AND category = $${params.length}`;
    }

    if (lat && lng) {
      const latDelta = parseFloat(radiusKm) / 111.0;
      const lngDelta = parseFloat(radiusKm) / (111.0 * Math.cos(parseFloat(lat) * Math.PI / 180));
      params.push(parseFloat(lat) - latDelta, parseFloat(lat) + latDelta, parseFloat(lng) - lngDelta, parseFloat(lng) + lngDelta);
      const idx = params.length;
      sql += ` AND (latitude BETWEEN $${idx-3} AND $${idx-2}) AND (longitude BETWEEN $${idx-1} AND $${idx})`;
    }

    sql += ' ORDER BY event_date ASC';
    const events = await query(sql, params);
    res.json({ success: true, events: events.rows || events });
  } catch (err) {
    next(err);
  }
});

// POST /rsvp - Atomic Event Ticket Purchase
router.post('/rsvp', authenticate, async (req, res, next) => {
  try {
    const { eventId, quantity = 1 } = req.body;
    if (!eventId) {
      return res.status(400).json({ error: 'Missing required eventId field' });
    }

    const event = await queryOne('SELECT * FROM local_events WHERE id = $1', [eventId]);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    if (event.available_tickets < quantity) {
      return res.status(409).json({ error: 'Not enough tickets available for this event' });
    }

    const totalAmount = (event.ticket_price || 0.0) * quantity;
    const ticketRef = `TKT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const ticketId = crypto.randomUUID();

    await withTransaction(async (txClient) => {
      // 1. Atomic Decrement Seat Capacity
      const updateRes = await txClient.query(`
        UPDATE local_events 
        SET available_tickets = available_tickets - $1 
        WHERE id = $2 AND available_tickets >= $1
      `, [quantity, eventId]);

      // 2. Insert Ticket Record
      await txClient.query(`
        INSERT INTO event_tickets (id, ticket_ref, event_id, user_id, quantity, total_amount, status)
        VALUES ($1, $2, $3, $4, $5, $6, 'confirmed')
      `, [ticketId, ticketRef, eventId, req.user.id, quantity, totalAmount]);

      // 3. Deduct Wallet Balance
      if (totalAmount > 0) {
        await txClient.query('UPDATE user_wallets SET balance = balance - $1 WHERE user_id = $2', [totalAmount, req.user.id]);
        await txClient.query(`
          INSERT INTO wallet_transactions (id, wallet_id, user_id, amount, transaction_type, reference_id, description)
          VALUES ($1, $2, $3, $4, 'debit', $5, 'Event Ticket Purchase')
        `, [crypto.randomUUID(), req.user.id, req.user.id, totalAmount, ticketRef]);
      }
    });

    res.status(201).json({
      success: true,
      message: 'Event ticket booked successfully!',
      ticket: { id: ticketId, ticket_ref: ticketRef, quantity, total_amount: totalAmount }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
