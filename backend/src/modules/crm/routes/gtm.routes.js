const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../../../config/database');
const { authenticate, requireAdmin, optionalAuth } = require('../../../middleware/auth.middleware');
const { publicFormLimiter } = require('../../../middleware/rateLimit.middleware');
const FeatureFlagService = require('../../../services/FeatureFlagService');

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

// POST /api/v1/gtm/interest-lead - Log interest in a module that is not live
// yet (ComingSoon waitlist) or a franchise application.
//
// Anonymous, so rate limited per IP and every field is shape-checked. The
// contact fields are optional; when a phone is given it must look like one.
const FEATURE_KEY_RE = /^[a-z0-9_.:-]{1,80}$/i;
const PINCODE_RE = /^[1-9][0-9]{5}$/;
const PHONE_RE = /^\+?[0-9]{10,15}$/;

router.post('/interest-lead', publicFormLimiter, optionalAuth, async (req, res, next) => {
  try {
    const { feature_key, pincode, name, phone, details } = req.body || {};
    // feature_key is NOT NULL; a missing one was a 500 from the constraint.
    if (typeof feature_key !== 'string' || !FEATURE_KEY_RE.test(feature_key.trim())) {
      return res.status(400).json({ success: false, error: 'feature_key is required' });
    }
    const pin = pincode === undefined || pincode === null || pincode === '' ? null : String(pincode).trim();
    if (pin !== null && !PINCODE_RE.test(pin)) {
      return res.status(400).json({ success: false, error: 'pincode must be a 6-digit Indian pincode' });
    }
    const phoneClean = phone ? String(phone).replace(/[\s-]/g, '') : null;
    if (phoneClean && !PHONE_RE.test(phoneClean)) {
      return res.status(400).json({ success: false, error: 'phone must be a valid mobile number' });
    }
    if (name !== undefined && name !== null && (typeof name !== 'string' || name.length > 120)) {
      return res.status(400).json({ success: false, error: 'name must be at most 120 characters' });
    }
    let detailsText = null;
    if (details !== undefined && details !== null) {
      detailsText = typeof details === 'string' ? details : JSON.stringify(details);
      if (detailsText.length > 2000) {
        return res.status(400).json({ success: false, error: 'details must be at most 2000 characters' });
      }
    }

    const crypto = require('crypto');
    await query(`
      INSERT INTO feature_interest_leads (id, feature_key, pincode, user_id, contact_name, contact_phone, details)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [crypto.randomUUID(), feature_key.trim(), pin, req.user?.id || null,
        name ? name.trim() : null, phoneClean, detailsText]);

    res.json({ success: true, message: 'Interest recorded successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
