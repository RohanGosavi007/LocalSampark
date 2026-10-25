const express = require('express');
const router = express.Router();
const db = require('../../../config/database');
const { authenticate } = require('../../../middleware/auth.middleware');
const crypto = require('crypto');
const { requireCapability, requireMembership, hasSocietyCapability, CAPABILITIES } = require('../middleware/society-capability');

/*
 * These four routes were `authenticate` only and took the society, and the
 * person being acted for, from the request body. Any signed-in account could
 * issue itself a visitor pass for any society — the pass code is what the gate
 * guard admits people on — read every visitor's name and phone number for any
 * society, and book facilities or file complaints in someone else's name.
 *
 * Each is now answered against the caller's membership of the society named,
 * and acts for the caller.
 */

// Pre-approve visitor: a resident for their own flat, or the society office.
router.post('/visitors', authenticate, requireCapability(CAPABILITIES.APPROVE_VISITOR), async (req, res, next) => {
  try {
    const { residentId, visitorName, visitorPhone, purpose, vehicleNumber, expectedAt } = req.body || {};
    if (!visitorName || !String(visitorName).trim()) {
      return res.status(400).json({ success: false, error: 'visitorName is required' });
    }
    // The office may pre-approve on a resident's behalf; a resident only for themselves.
    const manages = await hasSocietyCapability(req, req.societyId, CAPABILITIES.MANAGE_SOCIETY);
    const host = manages && residentId ? residentId : req.user.id;

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
      [req.societyId, host, String(visitorName).trim(), visitorPhone, purpose, vehicleNumber, passCode, expectedAt]
    );
    res.status(201).json({ success: true, visitor: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// List visitors: the gate desk and the office see everyone; a resident sees
// their own guests.
router.get('/visitors/:societyId', authenticate, requireMembership(), async (req, res, next) => {
  try {
    const seesAll = (await hasSocietyCapability(req, req.societyId, CAPABILITIES.LOG_GATE_ENTRY))
      || (await hasSocietyCapability(req, req.societyId, CAPABILITIES.MANAGE_SOCIETY));
    const visitors = seesAll
      ? await db.queryMany(`SELECT * FROM society_visitors WHERE society_id = $1 ORDER BY created_at DESC`, [req.societyId])
      : await db.queryMany(
        `SELECT * FROM society_visitors WHERE society_id = $1 AND resident_id = $2 ORDER BY created_at DESC`,
        [req.societyId, req.user.id]
      );
    res.json(visitors);
  } catch (error) {
    next(error);
  }
});

// Book facility
router.post('/bookings', authenticate, requireMembership(), async (req, res, next) => {
  try {
    const { facility, bookingDate, startTime, endTime, purpose } = req.body || {};
    if (!facility || !bookingDate || !startTime || !endTime) {
      return res.status(400).json({ success: false, error: 'facility, bookingDate, startTime and endTime are required' });
    }
    const result = await db.query(`INSERT INTO society_bookings (society_id, user_id, facility, booking_date, start_time, end_time, purpose, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'confirmed') RETURNING *`,
      [req.societyId, req.user.id, facility, bookingDate, startTime, endTime, purpose]
    );
    res.status(201).json({ success: true, booking: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// File complaint
router.post('/complaints', authenticate, requireMembership(), async (req, res, next) => {
  try {
    const { category, title, description, priority } = req.body || {};
    if (!title || !String(title).trim()) {
      return res.status(400).json({ success: false, error: 'title is required' });
    }
    const result = await db.query(`INSERT INTO society_complaints (society_id, user_id, category, title, description, priority, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'open') RETURNING *`,
      [req.societyId, req.user.id, category, String(title).trim(), description, priority]
    );
    res.status(201).json({ success: true, complaint: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
