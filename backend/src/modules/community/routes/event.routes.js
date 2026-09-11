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
    // SQLite returns a bare array from query(), so events.rows was undefined
    // there and the client received data: undefined.
    res.json({ success: true, data: events.rows || events || [] });
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

// ─── ORGANISER & MODERATION ─────────────────────────────────────────────────
//
// apps/mobile/app/modules/events/index.js calls /my-events, /pending,
// /:id/approve and /:id/reject. None existed, so the organiser and moderator
// tabs of that screen were permanently empty.
//
// Declared before '/:id'-shaped routes so the literal paths win.

const EVENT_MODERATOR_ROLES = ['ADMIN', 'SUPER_ADMIN', 'MODERATOR'];
const isEventModerator = (user) =>
  EVENT_MODERATOR_ROLES.includes(String(user?.role || '').toUpperCase());

router.get('/my-events', authenticate, async (req, res, next) => {
  try {
    const events = await query(
      `SELECT e.*,
              (SELECT COALESCE(SUM(ticket_count), 0)
                 FROM event_tickets t
                WHERE t.event_id = e.id AND t.status IN ('valid', 'used')) AS tickets_sold
         FROM events e
        WHERE e.organizer_id = $1
        ORDER BY e.event_date DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: events.rows || events || [] });
  } catch (error) {
    next(error);
  }
});

router.get('/pending', authenticate, async (req, res, next) => {
  try {
    if (!isEventModerator(req.user)) {
      return res.status(403).json({ success: false, error: 'Moderator access required' });
    }
    const events = await query(
      `SELECT e.*, u.full_name AS organizer_name
         FROM events e
         LEFT JOIN users u ON u.id = e.organizer_id
        WHERE COALESCE(e.is_approved, 0) = 0
        ORDER BY e.created_at DESC`
    );
    res.json({ success: true, data: events.rows || events || [] });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/approve', authenticate, async (req, res, next) => {
  try {
    if (!isEventModerator(req.user)) {
      return res.status(403).json({ success: false, error: 'Moderator access required' });
    }
    const updated = await query(
      `UPDATE events SET is_approved = 1, status = 'upcoming' WHERE id = $1`,
      [req.params.id]
    );
    if (!updated.rowCount) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }
    res.json({ success: true, message: 'Event approved' });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/reject', authenticate, async (req, res, next) => {
  try {
    if (!isEventModerator(req.user)) {
      return res.status(403).json({ success: false, error: 'Moderator access required' });
    }
    const updated = await query(
      `UPDATE events SET is_approved = 0, status = 'rejected' WHERE id = $1`,
      [req.params.id]
    );
    if (!updated.rowCount) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }
    res.json({ success: true, message: 'Event rejected' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /:id/book — the booking call the mobile screen actually makes.
 *
 * /:id/tickets already existed with the same capacity logic, but the client
 * posts `numTickets` here and reads back bookingRef / finalPricePaid /
 * coinsDeducted, so it 404'd. This shares the oversell guard and adds the
 * wallet debit and the optional coin discount.
 */
router.post('/:id/book', authenticate, async (req, res, next) => {
  try {
    const count = parseInt(req.body.numTickets, 10) || 1;
    if (count < 1 || count > 20) {
      return res.status(400).json({ success: false, error: 'numTickets must be between 1 and 20' });
    }

    const event = await queryOne('SELECT * FROM events WHERE id = $1', [req.params.id]);
    if (!event) return res.status(404).json({ success: false, error: 'Event not found' });

    const capacity = event.capacity ?? event.max_attendees ?? null;
    const unitPrice = Number(event.ticket_price ?? event.price ?? 0);
    const gross = unitPrice * count;

    // The discount is only honoured when the organiser enabled it on the event.
    const useCoins = Boolean(req.body.applyDiscount) && Boolean(event.allow_coin_discount);
    const coinsDeducted = useCoins ? Math.round(gross * 0.10) : 0;
    const finalPrice = gross - coinsDeducted;

    const { withTransaction } = require('../../../config/database');

    const outcome = await withTransaction(async (client) => {
      if (capacity !== null) {
        const sold = await client.query(
          `SELECT COALESCE(SUM(ticket_count), 0) AS taken
             FROM event_tickets
            WHERE event_id = $1 AND status IN ('valid', 'used')`,
          [req.params.id]
        );
        const taken = parseInt((sold.rows || [])[0]?.taken, 10) || 0;
        if (taken + count > capacity) {
          return { soldOut: Math.max(capacity - taken, 0) };
        }
      }

      if (finalPrice > 0) {
        const debit = await client.query(
          'UPDATE wallets SET balance = balance - $1 WHERE user_id = $2 AND balance >= $1',
          [finalPrice, req.user.id]
        );
        if (!debit.rowCount) return { insufficient: true };

        await client.query(
          `INSERT INTO wallet_transactions (id, wallet_id, amount, type, purpose, status)
           VALUES ($1, (SELECT id FROM wallets WHERE user_id = $2), $3, 'debit', 'event_ticket', 'completed')`,
          [crypto.randomUUID(), req.user.id, finalPrice]
        );
      }

      const ticketId = crypto.randomUUID();
      const bookingRef = `EVT-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      await client.query(
        `INSERT INTO event_tickets
             (id, event_id, user_id, ticket_count, total_price, qr_code, status, ticket_ref)
         VALUES ($1, $2, $3, $4, $5, $6, 'valid', $7)`,
        [ticketId, req.params.id, req.user.id, count, finalPrice, crypto.randomUUID(), bookingRef]
      );

      return { ok: true, bookingRef };
    });

    if (outcome.soldOut !== undefined) {
      return res.status(409).json({
        success: false,
        error: `Only ${outcome.soldOut} ticket(s) remain`,
      });
    }
    if (outcome.insufficient) {
      return res.status(402).json({ success: false, error: 'Insufficient wallet balance' });
    }

    res.status(201).json({
      success: true,
      data: {
        bookingRef: outcome.bookingRef,
        finalPricePaid: finalPrice,
        coinsDeducted,
      },
      message: 'Tickets booked',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
console.log('--- DEBUG: event.routes.js successfully loaded ---');
