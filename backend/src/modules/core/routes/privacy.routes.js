/**
 * ═══════════════════════════════════════════════════════════════════════
 * Privacy & DPDP Routes — Data Subject Rights API
 * 10x Plan: Section 22.2.3 — Privacy API Endpoints
 * ═══════════════════════════════════════════════════════════════════════
 */
const express = require('express');
const router = express.Router();
const DPDPComplianceService = require('../../../services/dpdpCompliance.service');
const { authenticate, optionalAuth } = require('../../../middleware/auth.middleware');
const logger = require('../../../config/logger');

/**
 * POST /api/v1/users/me/consent
 * Grant or revoke consent for a specific type
 */
router.post('/me/consent', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { consent_type, granted } = req.body;

    if (!consent_type) {
      return res.status(400).json({ error: 'consent_type is required' });
    }

    if (granted === false || granted === 0) {
      await DPDPComplianceService.revokeConsent(userId, consent_type);
      return res.json({ success: true, message: `Consent '${consent_type}' revoked` });
    }

    const id = await DPDPComplianceService.grantConsent(userId, consent_type, {
      version: req.body.version || '1.0',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ success: true, consentId: id, message: `Consent '${consent_type}' granted` });
  } catch (error) { next(error); }
});

/**
 * GET /api/v1/users/me/consent
 * View all consent records for the authenticated user
 */
router.get('/me/consent', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id || req.user.userId;
    const consents = await DPDPComplianceService.getUserConsents(userId);

    // Also return available consent types for UI rendering
    const availableTypes = Object.entries(DPDPComplianceService.CONSENT_TYPES).map(([key, val]) => ({
      key: key.toLowerCase(),
      type: val.type,
      purpose: val.purpose,
    }));

    res.json({ success: true, consents, availableTypes });
  } catch (error) { next(error); }
});

/**
 * POST /api/v1/users/me/delete-account
 * Right to Erasure — DPDP Section 12
 */
router.post('/me/delete-account', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { reason, confirmation } = req.body;

    // Require explicit confirmation
    if (confirmation !== 'DELETE_MY_ACCOUNT') {
      return res.status(400).json({
        error: 'Please send { confirmation: "DELETE_MY_ACCOUNT" } to confirm account deletion',
      });
    }

    logger.warn(`🗑️ Account deletion requested: user=${userId}, reason=${reason || 'not specified'}`);

    const result = await DPDPComplianceService.deleteAccount(userId, reason || '');

    res.json({
      success: true,
      message: 'Your account has been deleted. All personal data has been anonymized.',
      requestId: result.requestId,
      note: 'Transaction records are retained as required by Indian tax law (GST Act).',
    });
  } catch (error) { next(error); }
});

/**
 * GET /api/v1/users/me/data-export
 * Right to Access — DPDP Section 11
 * Rate limited: 1 export per 24 hours
 */
router.get('/me/data-export', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id || req.user.userId;

    // Check rate limit: 1 export per 24 hours
    const { queryOne } = require('../../../config/database');
    const recentExport = await queryOne(
      `SELECT id FROM data_subject_requests
       WHERE user_id = $1 AND request_type = 'access' AND status = 'completed'
       AND created_at > datetime('now', '-24 hours')`,
      [userId]
    );

    if (recentExport) {
      return res.status(429).json({
        error: 'Data export is limited to once per 24 hours. Please try again later.',
      });
    }

    const exportData = await DPDPComplianceService.exportUserData(userId);

    res.json({
      success: true,
      message: 'Your data export is ready',
      data: exportData,
    });
  } catch (error) { next(error); }
});

/**
 * GET /api/v1/privacy-policy
 * Current privacy policy (versioned)
 */
router.get('/privacy-policy', async (req, res, next) => {
  try {
    const policy = await DPDPComplianceService.getCurrentPolicy();
    res.json({
      success: true,
      policy: policy || {
        version: '1.0',
        effective_date: '2026-08-01',
        content_url: 'https://localsampark.in/privacy-policy',
        summary: 'LocalSampark Privacy Policy — DPDP Act 2023 Compliant',
      },
    });
  } catch (error) { next(error); }
});

module.exports = router;
