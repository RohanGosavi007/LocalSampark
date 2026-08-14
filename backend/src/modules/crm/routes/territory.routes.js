const express = require('express');
const router = express.Router();
const { getTerritoryMap } = require('../controllers/territory.controller');
const { query } = require('../../../config/database');
const { authenticate } = require('../../../middleware/auth.middleware');

// Admin / Franchise Routes
router.get('/map', getTerritoryMap);

// The mobile auth context reads pending territory approvals on sign-in; this
// was never implemented, so the call 404'd on every launch.
router.get('/pending-approvals', authenticate, async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT id, name, category, approval_status, pincode, created_at
         FROM local_shops
        WHERE approval_status = 'pending'
        ORDER BY created_at DESC
        LIMIT 100`
    );
    const data = rows.rows || rows;
    res.json({ success: true, data, count: data.length });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
