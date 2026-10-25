const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../middleware/auth.middleware');
const { requireShopParam } = require('../../../middleware/shop-owner.middleware');
const pool = require('../../../config/database');

// POST /api/v1/group-buy/:shopId - Create deal
// Any signed-in account could publish a deal in any shop's name, at any price.
router.post('/:shopId', authenticate, requireShopParam(), async (req, res) => {
  try {
    const { shopId } = req.params;
    const { product_id, title, end_datetime, society_id } = req.body || {};
    const min_buyers = Number((req.body || {}).min_buyers);
    const wholesale_price = Number((req.body || {}).wholesale_price);
    const scope = (req.body || {}).scope === 'society' ? 'society' : 'zone';

    if (!title || !String(title).trim()) return res.status(400).json({ error: 'title is required' });
    if (!Number.isInteger(min_buyers) || min_buyers < 2) return res.status(400).json({ error: 'min_buyers must be a whole number of at least 2' });
    if (!Number.isFinite(wholesale_price) || wholesale_price <= 0) return res.status(400).json({ error: 'wholesale_price must be more than zero' });
    const ends = new Date(end_datetime);
    if (!end_datetime || Number.isNaN(ends.getTime()) || ends.getTime() <= Date.now()) {
      return res.status(400).json({ error: 'end_datetime must be a time in the future' });
    }

    
    // scope = 'zone' or 'society'
    const result = await pool.query(`INSERT INTO group_buying_deals 
       (shop_id, product_id, title, min_buyers, current_buyers, wholesale_price, end_datetime, scope, society_id, status)
       VALUES ($1, $2, $3, $4, 0, $5, $6, $7, $8, 'active') RETURNING *`,
      [shopId, product_id, title, min_buyers, wholesale_price, end_datetime, scope, society_id || null]
    );

    res.status(201).json({ message: 'Group deal created', deal: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create deal' });
  }
});

// POST /api/v1/group-buy/:dealId/join - Join deal
router.post('/:dealId/join', authenticate, async (req, res) => {
  try {
    const { dealId } = req.params;
    const userId = req.user.id;

    const deal = await pool.queryOne('SELECT * FROM group_buying_deals WHERE id = $1', [dealId]);
    if (!deal || deal.status !== 'active' || new Date(deal.end_datetime).getTime() <= Date.now()) {
      return res.status(404).json({ error: 'Deal not active or found' });
    }
    // A society deal is for that society's residents.
    if (deal.scope === 'society' && deal.society_id) {
      const member = await pool.queryOne(
        "SELECT 1 AS ok FROM society_members WHERE society_id = $1 AND user_id = $2 AND COALESCE(status, 'active') = 'active'",
        [deal.society_id, userId]
      );
      if (!member) return res.status(403).json({ error: 'This deal is for residents of its society' });
    }

    // One join per account. This only incremented current_buyers, so one
    // account could join as often as it liked and unlock the group price
    // alone. The participant row is unique per deal; the count moves only when
    // a new one is written.
    const joined = await pool.withTransaction(async (client) => {
      const added = await client.query(
        'INSERT INTO group_buying_participants (id, deal_id, user_id) VALUES ($1, $2, $3) ON CONFLICT (deal_id, user_id) DO NOTHING',
        [require('crypto').randomUUID(), String(dealId), String(userId)]
      );
      if (!added.rowCount) return null;
      return (await client.query(
        `UPDATE group_buying_deals SET current_buyers = COALESCE(current_buyers, 0) + 1 WHERE id = $1 AND status = 'active' RETURNING *`,
        [dealId]
      )).rows[0];
    });

    if (!joined) return res.status(409).json({ error: 'You have already joined this deal' });
    res.json({ message: 'Successfully joined deal', deal: joined });
  } catch (err) {
    res.status(500).json({ error: 'Failed to join deal' });
  }
});

// GET /api/v1/group-buy/active - List active deals
router.get('/active', authenticate, async (req, res) => {
  try {
    const { zoneId, societyId } = req.query;
    // We would filter by zone or society depending on user scope
    const result = await pool.query(`SELECT * FROM group_buying_deals WHERE status = 'active' AND end_datetime > NOW()`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch deals' });
  }
});

module.exports = router;
