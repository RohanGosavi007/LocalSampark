/**
 * ═══════════════════════════════════════════════════════════════════════
 * Offline Sync Routes — Delta Sync API for Mobile Clients
 * 10x Plan: Section 22.1.4 — Sync API Endpoint
 * ═══════════════════════════════════════════════════════════════════════
 */
const express = require('express');
const router = express.Router();
const OfflineSyncService = require('../../../services/offlineSync.service');
const FraudDetectionService = require('../../../services/fraudDetection.service');
const { authenticate } = require('../../../middleware/auth.middleware');

/**
 * GET /api/v1/sync
 * Delta sync — returns only changed records since last sync timestamp
 * 
 * Query params:
 *   since       - ISO timestamp of last sync (required)
 *   territory_id - Territory to sync data for (required for shops/products)
 *   tables      - Comma-separated table names (optional, defaults to all)
 *   device_id   - Device identifier for watermark tracking
 *   limit       - Max records per table (default: 500)
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id || req.user.userId;
    const {
      since,
      territory_id,
      tables,
      device_id = '',
      limit = 500,
    } = req.query;

    const tableList = tables ? tables.split(',').map(t => t.trim()) : [];

    const result = await OfflineSyncService.deltaSync(
      userId,
      territory_id,
      since,
      tableList,
      device_id,
      Math.min(parseInt(limit), 1000) // Cap at 1000 records per sync
    );

    // Register device fingerprint on sync
    if (device_id && req.headers['x-device-model']) {
      await FraudDetectionService.registerDevice(userId, {
        deviceId: device_id,
        deviceModel: req.headers['x-device-model'] || '',
        osName: req.headers['x-os-name'] || '',
        osVersion: req.headers['x-os-version'] || '',
        appVersion: req.headers['x-app-version'] || '',
        ipAddress: req.ip,
      });
    }

    res.json({ success: true, ...result });
  } catch (error) { next(error); }
});

/**
 * POST /api/v1/sync/mutations
 * Process offline mutations queued on the device
 * 
 * Body: {
 *   device_id: string,
 *   mutations: [
 *     { clientId: string, type: 'create_order', table: 'orders', payload: {...} },
 *     { clientId: string, type: 'create_review', table: 'reviews', payload: {...} },
 *   ]
 * }
 */
router.post('/mutations', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { device_id, mutations = [] } = req.body;

    if (!device_id) {
      return res.status(400).json({ error: 'device_id is required' });
    }

    if (!Array.isArray(mutations) || mutations.length === 0) {
      return res.status(400).json({ error: 'mutations array is required and must not be empty' });
    }

    // Cap at 50 mutations per request to prevent abuse
    if (mutations.length > 50) {
      return res.status(400).json({ error: 'Maximum 50 mutations per request' });
    }

    const result = await OfflineSyncService.processMutations(userId, device_id, mutations);
    res.json({ success: true, ...result });
  } catch (error) { next(error); }
});

/**
 * GET /api/v1/sync/status
 * Get sync status for the authenticated user's devices
 */
router.get('/status', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { queryMany } = require('../../../config/database');

    const watermarks = await queryMany(
      `SELECT device_id, table_name, territory_id, last_synced_at
       FROM sync_watermarks WHERE user_id = $1 ORDER BY last_synced_at DESC`,
      [userId]
    );

    const pendingMutations = await queryMany(
      `SELECT id, mutation_type, table_name, status, created_at
       FROM offline_mutations WHERE user_id = $1 AND status IN ('pending', 'processing')
       ORDER BY created_at ASC LIMIT 20`,
      [userId]
    );

    res.json({
      success: true,
      watermarks,
      pendingMutations,
    });
  } catch (error) { next(error); }
});

module.exports = router;
