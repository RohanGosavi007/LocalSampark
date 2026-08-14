/**
 * ═══════════════════════════════════════════════════════════════════════
 * DPDP Compliance Service — India's Digital Personal Data Protection Act
 * 10x Plan: Section 22.2 — Consent, Erasure, Data Export
 * ═══════════════════════════════════════════════════════════════════════
 */
const { query, queryOne, queryMany, withTransaction } = require('../config/database');
const { cacheInvalidate } = require('../config/redis');
const logger = require('../config/logger');
const crypto = require('crypto');

class DPDPComplianceService {

  // ─── CONSENT MANAGEMENT ──────────────────────────────────────

  static CONSENT_TYPES = {
    REGISTRATION: { type: 'registration', purpose: 'Account creation and authentication' },
    LOCATION: { type: 'location', purpose: 'Location access for hyperlocal services and zone detection' },
    MARKETING: { type: 'marketing', purpose: 'Promotional communications via push, SMS, and email' },
    ANALYTICS: { type: 'analytics', purpose: 'Usage analytics for app improvement' },
    CONTACTS: { type: 'contacts', purpose: 'Contact list access for referral features' },
    CAMERA: { type: 'camera', purpose: 'Camera access for profile photos and KYC documents' },
  };

  /**
   * Grant consent for a specific type
   */
  static async grantConsent(userId, consentType, metadata = {}) {
    const id = crypto.randomUUID();
    const consent = this.CONSENT_TYPES[consentType.toUpperCase()];
    if (!consent) throw new Error(`Unknown consent type: ${consentType}`);

    const existing = await queryOne(
      `SELECT id FROM user_consents WHERE user_id = $1 AND consent_type = $2`,
      [userId, consent.type]
    );

    if (existing) {
      await query(
        `UPDATE user_consents SET granted = 1, granted_at = datetime('now'), revoked_at = NULL,
         consent_version = $1, ip_address = $2, updated_at = datetime('now')
         WHERE id = $3`,
        [metadata.version || '1.0', metadata.ipAddress || null, existing.id]
      );
      return existing.id;
    }

    await query(
      `INSERT INTO user_consents (id, user_id, consent_type, consent_purpose, granted, granted_at, consent_version, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, 1, datetime('now'), $5, $6, $7)`,
      [id, userId, consent.type, consent.purpose, metadata.version || '1.0',
       metadata.ipAddress || null, metadata.userAgent || null]
    );
    return id;
  }

  /**
   * Revoke consent
   */
  static async revokeConsent(userId, consentType) {
    const consent = this.CONSENT_TYPES[consentType.toUpperCase()];
    if (!consent) throw new Error(`Unknown consent type: ${consentType}`);

    // Registration consent cannot be revoked without account deletion
    if (consent.type === 'registration') {
      throw new Error('Registration consent can only be revoked by deleting your account');
    }

    await query(
      `UPDATE user_consents SET granted = 0, revoked_at = datetime('now'), updated_at = datetime('now')
       WHERE user_id = $1 AND consent_type = $2`,
      [userId, consent.type]
    );

    logger.info(`Consent revoked: user=${userId}, type=${consent.type}`);
  }

  /**
   * Get all consents for a user
   */
  static async getUserConsents(userId) {
    return queryMany(
      `SELECT consent_type, consent_purpose, granted, granted_at, revoked_at, consent_version
       FROM user_consents WHERE user_id = $1 ORDER BY consent_type`,
      [userId]
    );
  }

  // ─── RIGHT TO ERASURE (Delete Account) ───────────────────────

  /**
   * Delete user account — DPDP Section 12
   * Soft-deletes user, anonymizes PII, retains transaction records
   */
  static async deleteAccount(userId, reason = '') {
    const requestId = crypto.randomUUID();

    // Record the data subject request
    await query(
      `INSERT INTO data_subject_requests (id, user_id, request_type, status, reason)
       VALUES ($1, $2, 'erasure', 'processing', $3)`,
      [requestId, userId, reason]
    );

    try {
      // 1. Anonymize user PII
      const anonName = 'Deleted User';
      const anonPhone = `deleted_${crypto.randomBytes(8).toString('hex')}`;
      const anonEmail = `deleted_${crypto.randomBytes(8).toString('hex')}@removed.local`;

      await query(
        `UPDATE users SET full_name = $1, phone_number = $2, email = $3, avatar_url = NULL,
         bio = NULL, is_active = false, updated_at = datetime('now')
         WHERE id = $4`,
        [anonName, anonPhone, anonEmail, userId]
      );

      // 2. Delete personal data from related tables
      await query(`DELETE FROM user_consents WHERE user_id = $1`, [userId]);
      await query(`DELETE FROM device_fingerprints WHERE user_id = $1`, [userId]);
      await query(`DELETE FROM sync_watermarks WHERE user_id = $1`, [userId]);

      // 3. Anonymize reviews (keep content, remove user link)
      await query(
        `UPDATE shop_reviews SET user_id = NULL WHERE user_id = $1`, [userId]
      );

      // 4. Anonymize posts
      await query(
        `UPDATE posts SET user_id = NULL WHERE user_id = $1`, [userId]
      );

      // 5. Delete stories
      await query(`DELETE FROM stories WHERE user_id = $1`, [userId]);

      // 6. Retain order/transaction data (legal requirement - GST/tax)
      // Orders, wallet_transactions are NOT deleted but user reference is anonymized
      logger.info(`Account deletion completed: user=${userId}, request=${requestId}`);

      // 7. Invalidate all cached data for this user
      await cacheInvalidate(`user:${userId}:*`);

      // 8. Mark request as completed
      await query(
        `UPDATE data_subject_requests SET status = 'completed', completed_at = datetime('now')
         WHERE id = $1`,
        [requestId]
      );

      return { requestId, status: 'completed' };
    } catch (error) {
      await query(
        `UPDATE data_subject_requests SET status = 'failed', rejection_reason = $1
         WHERE id = $2`,
        [error.message, requestId]
      );
      throw error;
    }
  }

  // ─── RIGHT TO ACCESS (Data Export) ───────────────────────────

  /**
   * Export all user data — DPDP Section 11
   */
  static async exportUserData(userId) {
    const requestId = crypto.randomUUID();

    await query(
      `INSERT INTO data_subject_requests (id, user_id, request_type, status)
       VALUES ($1, $2, 'access', 'processing')`,
      [requestId, userId]
    );

    try {
      const user = await queryOne(`SELECT * FROM users WHERE id = $1`, [userId]);
      const wallet = await queryOne(`SELECT * FROM wallets WHERE user_id = $1`, [userId]);
      const orders = await queryMany(
        `SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1000`, [userId]
      );
      const reviews = await queryMany(
        `SELECT * FROM shop_reviews WHERE user_id = $1 ORDER BY created_at DESC`, [userId]
      );
      const consents = await this.getUserConsents(userId);
      const referrals = await queryMany(
        `SELECT * FROM referrals WHERE referrer_id = $1 OR referred_id = $1`, [userId]
      );
      const devices = await queryMany(
        `SELECT device_id, device_model, os_name, first_seen_at, last_seen_at
         FROM device_fingerprints WHERE user_id = $1`, [userId]
      );

      // Remove sensitive internal fields
      if (user) {
        delete user.password_hash;
      }

      const exportData = {
        exportDate: new Date().toISOString(),
        requestId,
        dataSubject: {
          profile: user,
          wallet,
        },
        activity: {
          orders: orders.map(o => ({ id: o.id, date: o.created_at, amount: o.total_amount, status: o.order_status })),
          reviews,
        },
        privacy: {
          consents,
          devices,
          referrals,
        },
        metadata: {
          totalOrders: orders.length,
          totalReviews: reviews.length,
          accountCreated: user?.created_at,
        }
      };

      // Update request status
      await query(
        `UPDATE data_subject_requests SET status = 'completed', completed_at = datetime('now'),
         requested_data = $1 WHERE id = $2`,
        [JSON.stringify({ tables: ['users', 'wallets', 'orders', 'reviews', 'consents', 'devices'] }), requestId]
      );

      return exportData;
    } catch (error) {
      await query(
        `UPDATE data_subject_requests SET status = 'failed', rejection_reason = $1 WHERE id = $2`,
        [error.message, requestId]
      );
      throw error;
    }
  }

  // ─── PRIVACY POLICY ──────────────────────────────────────────

  static async getCurrentPolicy() {
    return queryOne(
      `SELECT * FROM privacy_policy_versions ORDER BY effective_date DESC LIMIT 1`
    );
  }
}

module.exports = DPDPComplianceService;
