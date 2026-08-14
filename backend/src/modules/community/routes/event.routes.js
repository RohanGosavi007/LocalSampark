const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { query, queryOne } = require('../../../config/database');
const { authenticate } = require('../../../middleware/auth.middleware');

router.get('/', async (req, res, next) => {
  try {
    const events = await query(`
      SELECT e.*, u.full_name as organizer_name
      FROM events e
      JOIN users u ON e.organizer_id = u.id
      WHERE e.status = 'upcoming' 
      ORDER BY e.event_date ASC
    `);
    res.json({ success: true, data: events.rows });
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticate, async (req, res, next) => {
  try {
    const { title, description, category, venue, eventDate, startTime, endTime, maxAttendees, isPaid, ticketPrice, coverImageUrl } = req.body;
    const eventId = crypto.randomUUID();
    const event = await queryOne(`INSERT INTO events (id, organizer_id, title, description, category, venue, event_date, start_time, end_time, max_attendees, is_paid, ticket_price, cover_image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [eventId, req.user.id, title, description, category || 'other', venue, eventDate, startTime, endTime, maxAttendees || null, isPaid || false, ticketPrice || 0.00, coverImageUrl || null]
    );
    res.status(201).json({ success: true, data: event, message: 'Event created successfully' });
  } catch (error) {
    next(error);
  }
});

// ─── TICKETS ─────────────────────────────────────────────────────────────────
// The events page has always posted here; it was never implemented.
router.post('/:id/tickets', authenticate, async (req, res, next) => {
  try {
    const count = parseInt(req.body.ticket_count, 10) || 1;
    if (count < 1 || count > 20) {
      return res.status(400).json({ error: 'ticket_count must be between 1 and 20' });
    }

    const event = await queryOne('SELECT * FROM events WHERE id = $1', [req.params.id]);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const capacity = event.capacity ?? event.max_attendees ?? null;
    const price = Number(event.ticket_price ?? event.price ?? 0);

    // Capacity is checked inside the transaction so two simultaneous bookings
    // cannot together oversell the last seats.
    const { withTransaction } = require('../../../config/database');
    const ticketId = await withTransaction(async (client) => {
      if (capacity !== null) {
        const sold = await client.query(
          `SELECT COALESCE(SUM(ticket_count), 0) AS taken
             FROM event_tickets
            WHERE event_id = $1 AND status IN ('valid', 'used')`,
          [req.params.id]
        );
        const taken = parseInt(sold.rows[0].taken, 10) || 0;
        if (taken + count > capacity) {
          throw Object.assign(
            new Error(`Only ${Math.max(capacity - taken, 0)} ticket(s) remain`),
            { status: 409 }
          );
        }
      }

      const inserted = await client.query(
        `INSERT INTO event_tickets (event_id, user_id, ticket_count, total_price, qr_code, status)
         VALUES ($1, $2, $3, $4, $5, 'valid')
         RETURNING id`,
        [req.params.id, req.user.id, count, price * count, crypto.randomUUID()]
      );
      return inserted.rows[0].id;
    });

    res.status(201).json({
      success: true,
      ticketId,
      ticketCount: count,
      totalPrice: price * count,
      message: 'Tickets booked',
    });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    next(error);
  }
});

module.exports = router;
console.log('--- DEBUG: event.routes.js successfully loaded ---');
