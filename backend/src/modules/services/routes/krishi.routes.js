/**
 * Public Krishi (rural marketplace) listings — read-only.
 *
 * GET /api/v1/krishi/listings?type=&limit=
 *
 * Krishi is off at launch (packages/shared/src/features.js, scope "later"),
 * so this router is mounted behind requireFeature('krishi') and answers 403
 * FEATURE_DISABLED until the flag is turned on. Listings are created and
 * moderated in the admin console (/api/v1/admin/krishi); only active ones are
 * served here, with the columns a visitor may see.
 */
const express = require('express');
const { query } = require('../../../config/database');

const router = express.Router();
const TYPE_RE = /^[a-z_]{1,32}$/;

router.get('/listings', async (req, res, next) => {
  try {
    const params = [];
    const where = ["LOWER(COALESCE(status, 'active')) = 'active'"];
    if (req.query.type !== undefined && req.query.type !== '') {
      const type = String(req.query.type);
      if (!TYPE_RE.test(type)) {
        return res.status(400).json({ success: false, error: 'type must be a short lowercase identifier' });
      }
      params.push(type);
      where.push(`type = $${params.length}`);
    }
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
    params.push(limit);

    const result = await query(
      `SELECT id, title, description, price, type, verified_farmer, created_at
         FROM admin_krishi_listings
        WHERE ${where.join(' AND ')}
        ORDER BY created_at DESC
        LIMIT $${params.length}`,
      params
    );
    const listings = (result.rows || result || []).map((row) => ({
      ...row,
      verified_farmer: row.verified_farmer === 1 || row.verified_farmer === true || row.verified_farmer === '1',
    }));
    res.json({ success: true, listings });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
