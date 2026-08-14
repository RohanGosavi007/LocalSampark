/**
 * ═══════════════════════════════════════════════════════════════════════
 * Vendor KYC Routes — Digital Onboarding API
 * 10x Plan: Section 20.1 — Vendor Onboarding Flow
 * ═══════════════════════════════════════════════════════════════════════
 */
const express = require('express');
const router = express.Router();
const GSTVerificationService = require('../../../services/gstVerification.service');
const { authenticate } = require('../../../middleware/auth.middleware');
const { query, queryOne, queryMany } = require('../../../config/database');
const crypto = require('crypto');
const logger = require('../../../config/logger');

const requireAdmin = (req, res, next) => {
  const role = req.user?.role;
  if (!role || !['ADMIN', 'SUPER_ADMIN'].includes(role)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

/**
 * POST /api/v1/shops/:shopId/kyc
 * Submit KYC documents for a shop
 */
router.post('/:shopId/kyc', authenticate, async (req, res, next) => {
  try {
    const { shopId } = req.params;
    const userId = req.user.id || req.user.userId;
    const {
      aadhaar_front_url, aadhaar_back_url,
      pan_number, pan_url,
      gst_number,
      fssai_number, fssai_expiry, fssai_url,
      drug_license_number, drug_license_url,
      bank_account_number, bank_ifsc, bank_name, bank_branch,
    } = req.body;

    // Check shop ownership
    const shop = await queryOne(`SELECT id, owner_id FROM local_shops WHERE id = $1`, [shopId]
    );
    if (!shop) return res.status(404).json({ error: 'Shop not found' });
    if (shop.owner_id !== userId) {
      return res.status(403).json({ error: 'Only the shop owner can submit KYC' });
    }

    // Check if KYC already exists
    const existing = await queryOne(`SELECT id, kyc_status FROM vendor_kyc WHERE shop_id = $1`, [shopId]
    );

    if (existing && existing.kyc_status === 'verified') {
      return res.status(400).json({ error: 'KYC already verified. Contact support to update.' });
    }

    const id = existing?.id || crypto.randomUUID();

    // Encrypt sensitive fields
    const encryptField = (value) => {
      if (!value) return null;
      // Simple base64 encoding for now — replace with AES-256 in production
      return Buffer.from(value).toString('base64');
    };

    if (existing) {
      await query(`UPDATE vendor_kyc SET
          aadhaar_front_url = COALESCE($1, aadhaar_front_url),
          aadhaar_back_url = COALESCE($2, aadhaar_back_url),
          pan_number = COALESCE($3, pan_number),
          pan_url = COALESCE($4, pan_url),
          gst_number = COALESCE($5, gst_number),
          fssai_number = COALESCE($6, fssai_number),
          fssai_expiry = COALESCE($7, fssai_expiry),
          fssai_url = COALESCE($8, fssai_url),
          drug_license_number = COALESCE($9, drug_license_number),
          drug_license_url = COALESCE($10, drug_license_url),
          bank_account_number_encrypted = COALESCE($11, bank_account_number_encrypted),
          bank_ifsc = COALESCE($12, bank_ifsc),
          bank_name = COALESCE($13, bank_name),
          bank_branch = COALESCE($14, bank_branch),
          kyc_status = 'submitted',
          submitted_at = datetime('now'),
          updated_at = datetime('now')
         WHERE id = $15`,
        [aadhaar_front_url, aadhaar_back_url, pan_number, pan_url,
         gst_number, fssai_number, fssai_expiry, fssai_url,
         drug_license_number, drug_license_url,
         encryptField(bank_account_number), bank_ifsc, bank_name, bank_branch, id]
      );
    } else {
      await query(`INSERT INTO vendor_kyc (id, shop_id, owner_id,
          aadhaar_front_url, aadhaar_back_url, pan_number, pan_url,
          gst_number, fssai_number, fssai_expiry, fssai_url,
          drug_license_number, drug_license_url,
          bank_account_number_encrypted, bank_ifsc, bank_name, bank_branch,
          kyc_status, submitted_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'submitted', datetime('now'))`,
        [id, shopId, userId,
         aadhaar_front_url, aadhaar_back_url, pan_number, pan_url,
         gst_number, fssai_number, fssai_expiry, fssai_url,
         drug_license_number, drug_license_url,
         encryptField(bank_account_number), bank_ifsc, bank_name, bank_branch]
      );
    }

    res.json({ success: true, kycId: id, status: 'submitted', message: 'KYC documents submitted for review' });
  } catch (error) { next(error); }
});

/**
 * GET /api/v1/shops/:shopId/kyc
 * Get KYC status for a shop
 */
router.get('/:shopId/kyc', authenticate, async (req, res, next) => {
  try {
    const kyc = await queryOne(`SELECT id, kyc_status, gst_number, gst_status, gst_type,
              fssai_number, fssai_expiry,
              bank_name, bank_ifsc, bank_verified,
              rejection_reason, submitted_at, verified_at
       FROM vendor_kyc WHERE shop_id = $1`,
      [req.params.shopId]
    );

    res.json({ success: true, kyc: kyc || { kyc_status: 'not_started' } });
  } catch (error) { next(error); }
});

/**
 * POST /api/v1/shops/:shopId/kyc/verify-gst
 * Verify GST number via public API
 */
router.post('/:shopId/kyc/verify-gst', authenticate, async (req, res, next) => {
  try {
    const { gst_number } = req.body;
    if (!gst_number) return res.status(400).json({ error: 'gst_number is required' });

    const result = await GSTVerificationService.verify(gst_number);

    // Update KYC record
    if (result.isValid) {
      await query(`UPDATE vendor_kyc SET gst_status = 'verified', gst_verified_at = datetime('now'),
         gst_type = $1, gst_legal_name = $2, gst_trade_name = $3
         WHERE shop_id = $4`,
        [result.type, result.legalName, result.tradeName, req.params.shopId]
      );
    }

    res.json({ success: true, gst: result });
  } catch (error) { next(error); }
});

/**
 * PUT /api/v1/admin/kyc/:kycId/review
 * Admin: Approve or reject KYC submission
 */
router.put('/admin/:kycId/review', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { kycId } = req.params;
    const { action, rejection_reason } = req.body;
    const adminId = req.user.id || req.user.userId;

    if (!['verified', 'rejected'].includes(action)) {
      return res.status(400).json({ error: 'action must be: verified or rejected' });
    }

    await query(`UPDATE vendor_kyc SET kyc_status = $1, verified_by = $2, verified_at = datetime('now'),
       rejection_reason = $3, updated_at = datetime('now')
       WHERE id = $4`,
      [action, adminId, action === 'rejected' ? rejection_reason : null, kycId]
    );

    // If verified, activate the shop
    if (action === 'verified') {
      const kyc = await queryOne(`SELECT shop_id FROM vendor_kyc WHERE id = $1`, [kycId]);
      if (kyc) {
        await query(`UPDATE local_shops SET is_verified = true, is_active = true WHERE id = $1`,
          [kyc.shop_id]
        );
        logger.info(`✅ Shop ${kyc.shop_id} activated after KYC verification by admin ${adminId}`);
      }
    }

    res.json({ success: true, message: `KYC ${action}` });
  } catch (error) { next(error); }
});

/**
 * GET /api/v1/admin/kyc/pending
 * Admin: List all pending KYC submissions
 */
router.get('/admin/pending', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const submissions = await queryMany(`SELECT vk.*, ls.name as shop_name, ls.category, u.full_name as owner_name, u.phone_number as owner_phone
       FROM vendor_kyc vk
       JOIN local_shops ls ON vk.shop_id = ls.id
       JOIN users u ON vk.owner_id = u.id
       WHERE vk.kyc_status IN ('submitted', 'pending')
       ORDER BY vk.submitted_at ASC
       LIMIT $1 OFFSET $2`,
      [parseInt(limit), offset]
    );

    const total = await queryOne(`SELECT COUNT(*) as cnt FROM vendor_kyc WHERE kyc_status IN ('submitted', 'pending')`
    );

    res.json({
      success: true,
      submissions,
      total: parseInt(total?.cnt || 0),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error) { next(error); }
});

module.exports = router;
