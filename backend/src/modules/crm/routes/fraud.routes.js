/**
 * ═══════════════════════════════════════════════════════════════════════
 * Fraud Review Routes — Admin God Mode Panel
 * 10x Plan: Section 22.3.2 — Layer 3 Admin Review Queue
 * ═══════════════════════════════════════════════════════════════════════
 */
const express = require('express');
const router = express.Router();
const FraudDetectionService = require('../../../services/fraudDetection.service');
const { authenticate } = require('../../../middleware/auth.middleware');
const { query, queryOne, queryMany } = require('../../../config/database');
const logger = require('../../../config/logger');

// Simple admin check middleware
const requireAdmin = (req, res, next) => {
  const role = req.user?.role;
  if (!role || !['ADMIN', 'SUPER_ADMIN'].includes(role)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

/**
 * GET /api/v1/admin/fraud/signals
 * List all fraud signals with filtering
 */
router.get('/signals', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { status = 'pending', severity, entity_type, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIdx = 1;

    if (status) {
      whereClause += ` AND status = $${paramIdx++}`;
      params.push(status);
    }
    if (severity) {
      whereClause += ` AND severity = $${paramIdx++}`;
      params.push(severity);
    }
    if (entity_type) {
      whereClause += ` AND entity_type = $${paramIdx++}`;
      params.push(entity_type);
    }

    params.push(parseInt(limit), offset);

    const signals = await queryMany(`SELECT * FROM fraud_signals ${whereClause}
       ORDER BY CASE severity
         WHEN 'critical' THEN 1 WHEN 'high' THEN 2
         WHEN 'medium' THEN 3 WHEN 'low' THEN 4 ELSE 5
       END, created_at DESC
       LIMIT $${paramIdx++} OFFSET $${paramIdx}`,
      params
    );

    const countParams = params.slice(0, -2);
    const total = await queryOne(`SELECT COUNT(*) as cnt FROM fraud_signals ${whereClause}`,
      countParams
    );

    res.json({
      success: true,
      signals,
      total: total ? parseInt(total.cnt) : 0,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error) { next(error); }
});

/**
 * GET /api/v1/admin/fraud/signals/:signalId
 * Get detailed fraud signal with entity info
 */
router.get('/signals/:signalId', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const signal = await queryOne(`SELECT * FROM fraud_signals WHERE id = $1`, [req.params.signalId]
    );
    if (!signal) return res.status(404).json({ error: 'Signal not found' });

    // Parse JSON details
    try { signal.details = JSON.parse(signal.details); } catch {}

    // Get entity fraud score
    const fraudScore = await FraudDetectionService.getEntityFraudScore(
      signal.entity_type, signal.entity_id
    );

    res.json({ success: true, signal, aggregateFraudScore: fraudScore });
  } catch (error) { next(error); }
});

/**
 * PUT /api/v1/admin/fraud/signals/:signalId/review
 * Review a fraud signal (approve as fraud / mark false positive)
 */
router.put('/signals/:signalId/review', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { signalId } = req.params;
    const { action, notes } = req.body;
    const adminId = req.user.id || req.user.userId;

    if (!['confirmed', 'false_positive', 'resolved'].includes(action)) {
      return res.status(400).json({ error: 'action must be: confirmed, false_positive, or resolved' });
    }

    await query(`UPDATE fraud_signals SET status = $1, reviewed_by = $2, reviewed_at = datetime('now'), review_notes = $3
       WHERE id = $4`,
      [action, adminId, notes || null, signalId]
    );

    // If confirmed fraud on a shop, suspend it
    if (action === 'confirmed') {
      const signal = await queryOne(`SELECT entity_type, entity_id FROM fraud_signals WHERE id = $1`, [signalId]);
      if (signal && signal.entity_type === 'shop') {
        await query(`UPDATE local_shops SET is_active = false WHERE id = $1`, [signal.entity_id]);
        logger.warn(`🚫 Shop ${signal.entity_id} suspended due to confirmed fraud signal ${signalId}`);
      }
      if (signal && signal.entity_type === 'user') {
        await query(`UPDATE users SET is_active = false WHERE id = $1`, [signal.entity_id]);
        logger.warn(`🚫 User ${signal.entity_id} suspended due to confirmed fraud signal ${signalId}`);
      }
    }

    res.json({ success: true, message: `Signal ${signalId} marked as ${action}` });
  } catch (error) { next(error); }
});

/**
 * GET /api/v1/admin/fraud/dashboard
 * Fraud overview dashboard for admin panel
 */
router.get('/dashboard', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const stats = {};

    stats.pending = await queryOne(`SELECT COUNT(*) as cnt FROM fraud_signals WHERE status = 'pending'`);
    stats.critical = await queryOne(`SELECT COUNT(*) as cnt FROM fraud_signals WHERE severity = 'critical' AND status = 'pending'`);
    stats.today = await queryOne(`SELECT COUNT(*) as cnt FROM fraud_signals WHERE created_at >= date('now')`);
    stats.confirmed = await queryOne(`SELECT COUNT(*) as cnt FROM fraud_signals WHERE status = 'confirmed'`);
    stats.falsePositive = await queryOne(`SELECT COUNT(*) as cnt FROM fraud_signals WHERE status = 'false_positive'`);

    const byType = await queryMany(`SELECT signal_type, COUNT(*) as count FROM fraud_signals
       WHERE created_at >= datetime('now', '-30 days')
       GROUP BY signal_type ORDER BY count DESC`
    );

    const blockedEntities = await queryOne(`SELECT COUNT(*) as cnt FROM fraud_blocklist WHERE is_active = true`
    );

    res.json({
      success: true,
      dashboard: {
        pendingReview: parseInt(stats.pending?.cnt || 0),
        criticalPending: parseInt(stats.critical?.cnt || 0),
        signalsToday: parseInt(stats.today?.cnt || 0),
        confirmedFraud: parseInt(stats.confirmed?.cnt || 0),
        falsePositives: parseInt(stats.falsePositive?.cnt || 0),
        blockedEntities: parseInt(blockedEntities?.cnt || 0),
        signalsByType: byType,
      },
    });
  } catch (error) { next(error); }
});

/**
 * POST /api/v1/admin/fraud/blocklist
 * Add entity to fraud blocklist
 */
router.post('/blocklist', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { entity_type, entity_value, reason, expires_at } = req.body;
    const adminId = req.user.id || req.user.userId;

    if (!entity_type || !entity_value || !reason) {
      return res.status(400).json({ error: 'entity_type, entity_value, and reason are required' });
    }

    const crypto = require('crypto');
    const id = crypto.randomUUID();

    await query(`INSERT OR REPLACE INTO fraud_blocklist (id, entity_type, entity_value, reason, blocked_by, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, entity_type, entity_value, reason, adminId, expires_at || null]
    );

    logger.warn(`🚫 Blocklist entry added: ${entity_type}=${entity_value} by admin ${adminId}`);
    res.json({ success: true, blockId: id });
  } catch (error) { next(error); }
});

module.exports = router;
