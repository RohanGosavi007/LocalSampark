const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../middleware/auth.middleware');
const pool = require('../../../config/database');

// POST /api/v1/group-buy/:shopId - Create deal
router.post('/:shopId', authenticate, async (req, res) => {
  try {
    const { shopId } = req.params;
    const { product_id, title, min_buyers, wholesale_price, end_datetime, scope, society_id } = req.body;
    
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

    // Simplified logic: Just increment the current_buyers
    const result = await pool.query(`UPDATE group_buying_deals 
       SET current_buyers = current_buyers + 1 
       WHERE id = $1 AND status = 'active' 
       RETURNING *`,
      [dealId]
    );

    if (result.rowCount === 0) return res.status(404).json({ error: 'Deal not active or found' });
    
    res.json({ message: 'Successfully joined deal', deal: result.rows[0] });
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
