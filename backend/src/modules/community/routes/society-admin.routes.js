const express = require('express');
const router = express.Router();
const db = require('../../../config/database');
const { authenticate } = require('../../../middleware/auth.middleware');

// Pre-approve visitor
router.post('/visitors', authenticate, async (req, res, next) => {
  try {
    const { societyId, residentId, visitorName, visitorPhone, purpose, vehicleNumber, expectedAt } = req.body;
    const passCode = Math.random().toString(36).substring(2, 8).toUpperCase();
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
