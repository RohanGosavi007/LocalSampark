const express = require('express');
const router = express.Router();
const db = require('../../../config/database');
const { authenticate } = require('../../../middleware/auth.middleware');
const crypto = require('crypto');

// Pre-approve visitor
router.post('/visitors', authenticate, async (req, res, next) => {
  try {
    const { societyId, residentId, visitorName, visitorPhone, purpose, vehicleNumber, expectedAt } = req.body;
    // This value is stored as the visitor qr_code and is what the gate guard
    // checks to admit someone into the society, so it is a physical-access
    // credential. Math.random() made it guessable from other issued passes.
    // Base32-ish alphabet with I/O/0/1 removed so a guard reading it off a
    // phone screen cannot confuse characters.
    const PASS_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const passCode = Array.from(crypto.randomBytes(8))
      .map((byte) => PASS_ALPHABET[byte % PASS_ALPHABET.length])
      .join('');
    const result = await db.query(`INSERT INTO society_visitors (society_id, resident_id, visitor_name, visitor_phone, purpose, vehicle_number, qr_code, status, expected_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'expected', $8) RETURNING *`,
      [societyId, residentId, visitorName, visitorPhone, purpose, vehicleNumber, passCode, expectedAt]
    );
    res.status(201).json({ success: true, visitor: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// List visitors
router.get('/visitors/:societyId', authenticate, async (req, res, next) => {
  try {
    const { societyId } = req.params;
    const visitors = await db.queryMany(`SELECT * FROM society_visitors WHERE society_id = $1 ORDER BY created_at DESC`,
      [societyId]
    );
    res.json(visitors);
  } catch (error) {
    next(error);
  }
});

// Book facility
router.post('/bookings', authenticate, async (req, res, next) => {
  try {
    const { societyId, userId, facility, bookingDate, startTime, endTime, purpose } = req.body;
    const result = await db.query(`INSERT INTO society_bookings (society_id, user_id, facility, booking_date, start_time, end_time, purpose, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'confirmed') RETURNING *`,
      [societyId, userId, facility, bookingDate, startTime, endTime, purpose]
    );
    res.status(201).json({ success: true, booking: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// File complaint
router.post('/complaints', authenticate, async (req, res, next) => {
  try {
    const { societyId, userId, category, title, description, priority } = req.body;
    const result = await db.query(`INSERT INTO society_complaints (society_id, user_id, category, title, description, priority, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'open') RETURNING *`,
      [societyId, userId, category, title, description, priority]
    );
    res.status(201).json({ success: true, complaint: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
