/**
 * ═══════════════════════════════════════════════════════════════════════
 * Fraud Detection Service — 3-Layer Engine
 * 10x Plan: Section 22.3 — Automated Fraud Prevention
 * ═══════════════════════════════════════════════════════════════════════
 */
const { query, queryOne, withTransaction } = require('../config/database');
const logger = require('../config/logger');
const crypto = require('crypto');

class FraudDetectionService {

  // ─── LAYER 1: REAL-TIME RULES ENGINE ─────────────────────────

  /**
   * Rule 1: Fake shop detection
   */
  static async checkFakeShop(shopId, ownerId, phone) {
    const signals = [];

    // Check if same phone used for 3+ shop registrations
    const phoneShops = await queryOne(
      `SELECT COUNT(*) as cnt FROM local_shops ls
       JOIN users u ON ls.owner_id = u.id
       WHERE u.phone_number = $1 AND ls.id != $2`, [phone, shopId]
    );
    if (phoneShops && parseInt(phoneShops.cnt) >= 3) {
      signals.push({
        signal_type: 'multi_shop_same_phone',
        severity: 'high',
        details: { phone_shops_count: parseInt(phoneShops.cnt) + 1, phone },
      });
    }

    // Check if no products added within 48 hours of registration
    const shop = await queryOne(
      `SELECT created_at FROM local_shops WHERE id = $1`, [shopId]
    );
    if (shop) {
      const createdAt = new Date(shop.created_at);
      const hoursSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceCreation > 48) {
        const products = await queryOne(
          `SELECT COUNT(*) as cnt FROM shop_products WHERE shop_id = $1`, [shopId]
        );
        if (products && parseInt(products.cnt) === 0) {
          signals.push({
            signal_type: 'empty_shop_48h',
            severity: 'medium',
            details: { hours_since_creation: Math.round(hoursSinceCreation), products: 0 },
          });
        }
      }
    }

    // Record all signals
    for (const signal of signals) {
      await this.recordSignal('shop', shopId, signal);
    }

    return signals;
  }

  /**
   * Rule 2: Review manipulation detection
   */
  static async checkReviewManipulation(shopId, userId, reviewText, ipAddress) {
    const signals = [];

    // Check if user reviewed without placing an order
    const hasOrder = await queryOne(
      `SELECT id FROM orders WHERE shop_id = $1 AND user_id = $2 AND order_status = 'delivered' LIMIT 1`,
      [shopId, userId]
    );
    if (!hasOrder) {
      signals.push({
        signal_type: 'review_without_order',
        severity: 'medium',
        details: { shop_id: shopId, user_id: userId },
      });
    }

    // Check for multiple reviews from same IP in 24 hours
    if (ipAddress) {
      const recentFromIP = await queryOne(
        `SELECT COUNT(*) as cnt FROM shop_reviews sr
         JOIN fraud_signals fs ON fs.entity_id = sr.id
         WHERE fs.details LIKE $1
         AND sr.created_at > datetime('now', '-24 hours')`,
        [`%${ipAddress}%`]
      );
      if (recentFromIP && parseInt(recentFromIP.cnt) >= 5) {
        signals.push({
          signal_type: 'ip_review_flood',
          severity: 'high',
          details: { ip: ipAddress, reviews_24h: parseInt(recentFromIP.cnt) },
        });
      }
    }

    // Check if reviewer account is very new (< 7 days)
    const user = await queryOne(`SELECT created_at FROM users WHERE id = $1`, [userId]);
    if (user) {
      const accountAgeDays = (Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24);
      if (accountAgeDays < 7) {
        signals.push({
          signal_type: 'new_account_review',
          severity: 'low',
          details: { account_age_days: Math.round(accountAgeDays) },
        });
      }
    }

    for (const signal of signals) {
      await this.recordSignal('review', `${shopId}:${userId}`, signal);
    }

    return signals;
  }

  /**
   * Rule 3: GPS spoofing detection for delivery agents
   */
  static async checkGPSSpoofing(agentId, lat, lng, previousLat, previousLng, timeDiffSeconds) {
    const signals = [];

    if (previousLat && previousLng && timeDiffSeconds > 0) {
      // Calculate distance using Haversine
      const distance = this.haversineDistance(previousLat, previousLng, lat, lng);
      const speedKmH = (distance / timeDiffSeconds) * 3600;

      // Flag if agent "moved" >5km in <60 seconds (>300 km/h)
      if (speedKmH > 300 && timeDiffSeconds < 60) {
        signals.push({
          signal_type: 'gps_teleport',
          severity: 'critical',
          details: { distance_km: distance.toFixed(2), speed_kmh: speedKmH.toFixed(0), time_seconds: timeDiffSeconds },
        });
      }

      // Flag if altitude is consistently 0 (emulator)
      if (lat === 0 && lng === 0) {
        signals.push({
          signal_type: 'gps_null_island',
          severity: 'high',
          details: { lat, lng, note: 'Coordinates at Null Island — likely emulator' },
        });
      }
    }

    for (const signal of signals) {
      await this.recordSignal('delivery_agent', agentId, signal);
    }

    return signals;
  }

  /**
   * Rule 4: Referral abuse detection
   */
  static async checkReferralAbuse(referrerId, referredId, deviceId, ipAddress) {
    const signals = [];

    // Check if same device used for multiple accounts
    if (deviceId) {
      const deviceAccounts = await queryMany(
        `SELECT user_id FROM device_fingerprints WHERE device_id = $1`, [deviceId]
      );
      if (deviceAccounts.length >= 2) {
        signals.push({
          signal_type: 'multi_account_device',
          severity: 'high',
          details: { device_id: deviceId, accounts: deviceAccounts.map(d => d.user_id) },
        });
      }
    }

    // Check if referrer and referred share same IP
    if (ipAddress) {
      const referrerDevices = await queryMany(
        `SELECT ip_address FROM device_fingerprints WHERE user_id = $1`, [referrerId]
      );
      const sameIP = referrerDevices.some(d => d.ip_address === ipAddress);
      if (sameIP) {
        signals.push({
          signal_type: 'referral_same_ip',
          severity: 'high',
          details: { referrer: referrerId, referred: referredId, ip: ipAddress },
        });
      }
    }

    for (const signal of signals) {
      await this.recordSignal('user', referredId, signal);
    }

    return signals;
  }

  // ─── HELPERS ─────────────────────────────────────────────────

  /**
   * Record a fraud signal to the database
   */
  static async recordSignal(entityType, entityId, signal) {
    try {
      const id = crypto.randomUUID();
      const fraudScore = this.calculateFraudScore(signal.severity);

      await query(
        `INSERT INTO fraud_signals (id, entity_type, entity_id, signal_type, severity, details, fraud_score, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [id, entityType, entityId, signal.signal_type, signal.severity,
         JSON.stringify(signal.details), fraudScore, 'pending']
      );

      // Auto-action for critical signals
      if (signal.severity === 'critical') {
        logger.error(`🚨 CRITICAL FRAUD SIGNAL: ${signal.signal_type} on ${entityType}:${entityId}`);
      }

      return id;
    } catch (error) {
      logger.error('Failed to record fraud signal: ' + error.message);
    }
  }

  /**
   * Calculate aggregate fraud score for an entity
   */
  static async getEntityFraudScore(entityType, entityId) {
    const signals = await queryMany(
      `SELECT severity, signal_type FROM fraud_signals
       WHERE entity_type = $1 AND entity_id = $2 AND status != 'false_positive'
       ORDER BY created_at DESC LIMIT 50`,
      [entityType, entityId]
    );

    let score = 0;
    for (const s of signals) {
      score += this.calculateFraudScore(s.severity);
    }
    return Math.min(score, 100);
  }

  static calculateFraudScore(severity) {
    switch (severity) {
      case 'critical': return 40;
      case 'high': return 25;
      case 'medium': return 15;
      case 'low': return 5;
      default: return 0;
    }
  }

  /**
   * Register a device fingerprint
   */
  static async registerDevice(userId, deviceInfo) {
    try {
      const id = crypto.randomUUID();
      const existing = await queryOne(
        `SELECT id FROM device_fingerprints WHERE user_id = $1 AND device_id = $2`,
        [userId, deviceInfo.deviceId]
      );

      if (existing) {
        await query(
          `UPDATE device_fingerprints SET last_seen_at = datetime('now'), ip_address = $1, app_version = $2
           WHERE id = $3`,
          [deviceInfo.ipAddress, deviceInfo.appVersion, existing.id]
        );
      } else {
        await query(
          `INSERT INTO device_fingerprints (id, user_id, device_id, device_model, os_name, os_version, app_version, ip_address)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [id, userId, deviceInfo.deviceId, deviceInfo.deviceModel, deviceInfo.osName,
           deviceInfo.osVersion, deviceInfo.appVersion, deviceInfo.ipAddress]
        );
      }
    } catch (error) {
      logger.error('Device fingerprint registration failed: ' + error.message);
    }
  }

  /**
   * Haversine distance between two coordinates (returns km)
   */
  static haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}

module.exports = FraudDetectionService;
