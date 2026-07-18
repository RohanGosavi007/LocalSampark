const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { query, queryOne } = require('../config/database');
const { authenticate } = require('../middleware/auth.middleware');

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
    const event = await queryOne(
      `INSERT INTO events (id, organizer_id, title, description, category, venue, event_date, start_time, end_time, max_attendees, is_paid, ticket_price, cover_image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [eventId, req.user.id, title, description, category || 'other', venue, eventDate, startTime, endTime, maxAttendees || null, isPaid || false, ticketPrice || 0.00, coverImageUrl || null]
    );
    res.status(201).json({ success: true, data: event, message: 'Event created successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
