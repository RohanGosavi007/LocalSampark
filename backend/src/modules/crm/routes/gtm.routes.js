const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../../../../config/database');
const { authenticate, requireAdmin } = require('../../../../middleware/auth.middleware');
const FeatureFlagService = require('../../../../services/FeatureFlagService');

// GET /api/v1/gtm/features - Public evaluation for mobile app / frontend
router.get('/features', async (req, res, next) => {
  try {
    const pincode = req.query.pincode || null;
    const flags = await FeatureFlagService.getAllFlags();
    
    // Process flags with pincode evaluation for client
    const clientMatrix = {};
    for (const [key, flag] of Object.entries(flags)) {
      const evalRes = await FeatureFlagService.isFeatureAvailable(key, pincode);
      clientMatrix[key] = {
        key,
        phase: flag.phase,
        title: flag.title,
        available: evalRes.available,
        isBeta: Boolean(evalRes.isBeta),
        coming_soon: evalRes.comingSoon || null
      };
    }

    res.json({ success: true, pincode, features: clientMatrix });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/gtm/admin/features - Admin full flag list
router.get('/admin/features', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const flags = await FeatureFlagService.getAllFlags(true);
    res.json({ success: true, features: Object.values(flags) });
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/gtm/admin/features/:key - Admin update flag configuration
router.put('/admin/features/:key', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { key } = req.params;
    const { is_enabled, allowed_pincodes, coming_soon_headline, coming_soon_message } = req.body;

    const existing = await queryOne('SELECT feature_key FROM feature_flags WHERE feature_key = $1', [key]);
    if (!existing) {
      return res.status(404).json({ error: 'Feature key not found' });
    }

    const pincodesJson = Array.isArray(allowed_pincodes) ? JSON.stringify(allowed_pincodes) : (typeof allowed_pincodes === 'string' ? allowed_pincodes : '[]');

    await query(`
      UPDATE feature_flags 
      SET is_enabled = COALESCE($1, is_enabled),
          allowed_pincodes_json = $2,
          coming_soon_headline = COALESCE($3, coming_soon_headline),
          coming_soon_message = COALESCE($4, coming_soon_message),
          updated_at = CURRENT_TIMESTAMP
      WHERE feature_key = $5
    `, [is_enabled !== undefined ? (is_enabled ? 1 : 0) : null, pincodesJson, coming_soon_headline, coming_soon_message, key]);

    // Invalidate service cache
    FeatureFlagService.invalidateCache();

    const updated = await FeatureFlagService.getAllFlags(true);
    res.json({ success: true, message: `Feature '${key}' updated successfully`, feature: updated[key] });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/gtm/interest-lead - Log user interest from ComingSoonModal
router.post('/interest-lead', async (req, res, next) => {
  try {
    const { feature_key, pincode } = req.body;
    const crypto = require('crypto');
    await query(`
      INSERT INTO feature_interest_leads (id, feature_key, pincode, user_id) 
      VALUES ($1, $2, $3, $4)
    `, [crypto.randomUUID(), feature_key, pincode || null, req.user?.id || null]);

    res.json({ success: true, message: 'Interest recorded successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
