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
const { publicFormLimiter } = require('../../../middleware/rateLimit.middleware');

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
 * POST /api/v1/users/account-deletion-request   { identifier, reason? }
 * POST /api/v1/users/account-deletion-request/verify   { requestId, code }
 *
 * Public account deletion (Google Play "delete your account" requirement) for
 * people who cannot sign in.
 *
 * Step 1 queues nothing. If the phone number or email belongs to an account, a
 * six-digit code is sent to that phone or address; the response is identical
 * whether or not an account exists, so the endpoint cannot be used to find out
 * who has one. Step 2 takes the code and only then records the erasure request
 * in data_subject_requests for staff to process. Before this, anyone who knew
 * someone's phone number could queue their account for deletion.
 *
 * Codes live in the shared OTP store (single use, five-minute life, attempts
 * capped by verifyAndConsume), keyed by the requestId returned from step 1.
 */
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[0-9]{10,15}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DSR_TTL_SECONDS = 10 * 60;

const otpStore = require('../services/otpStore.service');
const { generateOTP, sendOTP } = require('../services/sms.service');
const { sendEmail } = require('../services/email.service');

const UNIFORM_MESSAGE =
  'If an account is registered with this phone number or email, we have sent it a 6-digit code. ' +
  'Enter the code to confirm the deletion request. The code expires in 10 minutes.';

const mask = (value) => (value.length > 4 ? `***${value.slice(-4)}` : '***');

router.post('/account-deletion-request', publicFormLimiter, async (req, res, next) => {
  try {
    const { identifier, reason } = req.body || {};
    if (!identifier || !String(identifier).trim()) {
      return res.status(400).json({ success: false, error: 'Phone number or email is required' });
    }
    // Validate shape before touching the database: this route is anonymous, so
    // the identifier must look like a phone number or an email address and the
    // free-text reason is capped.
    const trimmed = String(identifier).trim();
    const compactPhone = trimmed.replace(/[\s-]/g, '');
    const isEmail = EMAIL_RE.test(trimmed);
    if (trimmed.length > 254 || !(isEmail || PHONE_RE.test(compactPhone))) {
      return res.status(400).json({ success: false, error: 'Enter a valid phone number or email address' });
    }
    if (reason !== undefined && (typeof reason !== 'string' || reason.length > 1000)) {
      return res.status(400).json({ success: false, error: 'Reason must be text of at most 1000 characters' });
    }

    // Checked before the account lookup so the answer does not depend on
    // whether the account exists.
    if (!otpStore.isAvailable()) {
      logger.error(`[Privacy] Deletion verification unavailable: ${otpStore.unavailableReason()}`);
      return res.status(503).json({ success: false, error: 'Verification is temporarily unavailable. Please try again shortly.' });
    }

    const { queryOne } = require('../../../config/database');
    const crypto = require('crypto');
    const cleanId = isEmail ? trimmed.toLowerCase() : compactPhone;
    const plus91 = /^[0-9]{10}$/.test(cleanId) ? `+91${cleanId}` : cleanId;

    const user = await queryOne(
      'SELECT id, phone_number, email FROM users WHERE phone_number = $1 OR phone_number = $2 OR LOWER(email) = $1 LIMIT 1',
      [cleanId, plus91]
    );

    const requestId = crypto.randomUUID();

    if (user) {
      // Sent to the contact the caller typed, which belongs to this account.
      const destination = isEmail ? cleanId : (user.phone_number || plus91);
      if (await otpStore.allowSend(`dsr:${destination}`)) {
        const code = generateOTP();
        await otpStore.setOtp(`dsr_otp:${requestId}`, code, DSR_TTL_SECONDS);
        await otpStore.setOtp(`dsr_pending:${requestId}`, JSON.stringify({
          userId: user.id,
          reason: reason || 'Public web deletion request',
          channel: isEmail ? 'email' : 'phone',
        }), DSR_TTL_SECONDS);

        let sent;
        if (isEmail) {
          sent = await sendEmail(
            destination,
            'Confirm your LocalSampark account deletion request',
            `<p>We received a request to delete the LocalSampark account linked to this email address.</p>
             <p>Your confirmation code is <strong>${code}</strong>. It expires in 10 minutes.</p>
             <p>If you did not ask for this, ignore this email; nothing will be deleted.</p>`
          );
        } else {
          sent = await sendOTP(destination, code);
        }
        if (!sent || !sent.success) {
          // Not reported to the caller: a different answer here would reveal
          // that the account exists.
          logger.error(`[Privacy] Deletion code could not be sent to ${mask(destination)} (request ${requestId})`);
        }
      } else {
        logger.warn(`[Privacy] Deletion code send limit reached for ${mask(destination)}`);
      }
    }

    logger.info(`[Privacy] Public account deletion verification started: ${mask(cleanId)} (Request ID: ${requestId})`);

    res.json({
      success: true,
      verificationRequired: true,
      message: UNIFORM_MESSAGE,
      requestId,
    });
  } catch (error) { next(error); }
});

router.post('/account-deletion-request/verify', publicFormLimiter, async (req, res, next) => {
  try {
    const { requestId, code } = req.body || {};
    if (typeof requestId !== 'string' || !UUID_RE.test(requestId)) {
      return res.status(400).json({ success: false, error: 'requestId is required' });
    }
    if (typeof code !== 'string' || !/^[0-9]{6}$/.test(code)) {
      return res.status(400).json({ success: false, error: 'Enter the 6-digit code' });
    }
    if (!otpStore.isAvailable()) {
      return res.status(503).json({ success: false, error: 'Verification is temporarily unavailable. Please try again shortly.' });
    }

    // The same answer for an unknown request, an expired code and a wrong one.
    const valid = await otpStore.verifyAndConsume(`dsr_otp:${requestId}`, code);
    const pendingRaw = valid ? await otpStore.getOtp(`dsr_pending:${requestId}`) : null;
    if (!valid || !pendingRaw) {
      return res.status(400).json({ success: false, error: 'The code is invalid or has expired. Please request a new one.' });
    }
    await otpStore.deleteOtp(`dsr_pending:${requestId}`);

    let pending;
    try { pending = JSON.parse(pendingRaw); } catch { pending = null; }
    if (!pending || !pending.userId) {
      return res.status(400).json({ success: false, error: 'The code is invalid or has expired. Please request a new one.' });
    }

    const { query } = require('../../../config/database');
    const NOW = process.env.USE_SQLITE === 'true' ? 'CURRENT_TIMESTAMP' : 'NOW()';
    await query(
      `INSERT INTO data_subject_requests (id, user_id, request_type, status, reason, ip_address, created_at, updated_at)
       VALUES ($1, $2, 'erasure', 'pending', $3, $4, ${NOW}, ${NOW})`,
      [requestId, pending.userId,
       JSON.stringify({ reason: pending.reason, verified_via: pending.channel, requested_at: new Date().toISOString() }),
       req.ip || null]
    );

    logger.info(`[Privacy] Verified account deletion request queued (Request ID: ${requestId})`);

    res.json({
      success: true,
      message: 'Your deletion request is confirmed. Personal data will be erased within the statutory timeline.',
      requestId,
      note: 'Financial tax transaction records will be retained in anonymized form as required by Indian tax law (GST Act).',
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
    const { sqlTimestamp, DAY_MS } = require('../../../utils/sqlTime');
    const recentExport = await queryOne(`SELECT id FROM data_subject_requests
       WHERE user_id = $1 AND request_type = 'access' AND status = 'completed'
       AND created_at > $2`,
      [userId, sqlTimestamp(-DAY_MS)]
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
