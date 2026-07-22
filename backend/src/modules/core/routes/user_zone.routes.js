const express = require('express');
const router = express.Router();
const { query } = require('../../../config/database');
const { authenticate } = require('../../../middleware/auth.middleware');
const crypto = require('crypto');

// PUT /api/v1/users/zone - User switches their active zone
router.put('/zone', authenticate, async (req, res, next) => {
  try {
    const { zoneId } = req.body;
    if (!zoneId) return res.status(400).json({ error: 'zoneId is required' });
    
    await query(`UPDATE users SET active_zone_id = $1, region_id = $1 WHERE id = $2`, [zoneId, req.user.id]);
    res.json({ success: true, message: 'Active zone updated successfully' });
  } catch (error) { next(error); }
});

// GET /api/v1/users/saved-zones - Get user's saved/favorite zones
router.get('/saved-zones', authenticate, async (req, res, next) => {
  try {
    const zones = await query(`
      SELECT usz.id as saved_id, usz.label, r.* 
      FROM user_saved_zones usz 
      JOIN regions r ON usz.region_id = r.id 
      WHERE usz.user_id = $1
    `, [req.user.id]);
    res.json({ success: true, data: zones.rows || zones });
  } catch (error) { next(error); }
});

// POST /api/v1/users/saved-zones - Save a zone to favorites
router.post('/saved-zones', authenticate, async (req, res, next) => {
  try {
    const { regionId, label } = req.body;
    if (!regionId) return res.status(400).json({ error: 'regionId is required' });
    
    const id = crypto.randomUUID();
    await query(`
      INSERT INTO user_saved_zones (id, user_id, region_id, label) 
      VALUES ($1, $2, $3, $4)
    `, [id, req.user.id, regionId, label || 'Saved Zone']);
    
    res.json({ success: true, message: 'Zone saved successfully', id });
  } catch (error) { 
    if (error.message && error.message.includes('UNIQUE')) {
        return res.status(400).json({ error: 'Zone is already saved' });
    }
    next(error); 
  }
});

module.exports = router;
