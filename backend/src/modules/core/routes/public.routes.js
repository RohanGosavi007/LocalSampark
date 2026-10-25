const express = require('express');
const { query, queryOne } = require('../../../config/database');

const router = express.Router();

// Counts shown on the public landing page. They are the database's, not marketing's: the page
// used to animate a counter up to 12,450 neighbours, 347 shops and "₹120k commission saved"
// whatever the real numbers were.
const TTL_MS = 10 * 60 * 1000;
let cached = null;

router.get('/stats', async (req, res, next) => {
  try {
    if (cached && Date.now() - cached.at < TTL_MS) return res.json(cached.body);

    const users = await queryOne("SELECT COUNT(*) AS n FROM users WHERE COALESCE(is_banned, 0) = 0 AND COALESCE(is_active, 1) = 1");
    const shops = await queryOne("SELECT COUNT(*) AS n FROM local_shops WHERE approval_status = 'approved' AND COALESCE(is_active, 1) = 1");
    const zones = await query("SELECT name FROM regions WHERE is_active = '1' ORDER BY name ASC LIMIT 50");

    const body = {
      success: true,
      neighbors: Number(users && users.n) || 0,
      shops: Number(shops && shops.n) || 0,
      zones: (zones.rows || zones || []).map((z) => z.name),
    };
    cached = { at: Date.now(), body };
    res.json(body);
  } catch (error) {
    next(error);
  }
});

// test hook
router.__resetCache = () => { cached = null; };

module.exports = router;
