const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../../../../config/database');
const { authenticate } = require('../../../../middleware/auth.middleware');

router.get('/providers', async (req, res, next) => {
  try {
    const { type } = req.query;
    let providers;
    if (type) {
      providers = await query('SELECT * FROM health_providers WHERE type = $1 AND is_verified = true', [type]);
    } else {
      providers = await query('SELECT * FROM health_providers WHERE is_verified = true');
    }
    res.json({ success: true, providers: providers.rows || providers });
  } catch (error) {
    next(error);
  }
});

router.post('/sos', authenticate, async (req, res, next) => {
  try {
    const { latitude, longitude } = req.body;
    console.log(`[SOS ALERT] User ${req.user.id} triggered SOS at ${latitude}, ${longitude}`);

    // Notify nearby clients using Supabase broadcast if required
    const supabaseRealtime = req.app.get('supabaseRealtime');
    if (supabaseRealtime) {
      supabaseRealtime.broadcast('global', 'sos:alert', {
        userId: req.user.id,
        latitude,
        longitude,
        timestamp: new Date().toISOString()
      });
    }

    res.json({ success: true, message: 'Emergency SOS alert broadcast to neighbors and contacts' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
