/**
 * Territory and franchise territory management.
 *
 * Three audiences, three postures:
 *
 *   - **Public resolution** (`/resolve`, `/interest`) answers where someone is
 *     and who serves it. Never fails the caller: an unresolvable location is a
 *     normal state on an expanding platform, and a 500 here would break every
 *     client's first screen.
 *
 *   - **Franchise-scoped reads** (`/mine`) are restricted by
 *     attachFranchiseScope, which denies by default.
 *
 *   - **Administration** (boundary edits, assignment, transfer) requires an
 *     administrator, and anything that moves money — assigning, transferring or
 *     releasing a territory — additionally requires a super admin and is
 *     audited. Those operations change who gets paid.
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');

const { authenticate, requireAdmin, optionalAuth } = require('../middleware/auth.middleware');
const { attachFranchiseScope, requireFranchise } = require('../middleware/franchiseScope.middleware');
const territoryService = require('../services/territoryResolution.service');
const spatial = require('../repositories/spatial.repository');
const pincodeUtil = require('../utils/pincode');
const { query, queryOne } = require('../config/database');
const logger = require('../config/logger');

const adminOnly = [authenticate, requireAdmin];

/** Mirrors the gate used elsewhere; roles are stored lower case. */
function requireSuperAdmin(req, res, next) {
  const role = String(req.user?.role || '').toLowerCase();
  if (role === 'super_admin' || role === 'superadmin') return next();
  return res.status(403).json({
    success: false,
    message: 'This operation changes franchise revenue attribution and requires a super admin.',
  });
}

async function audit(req, action, detail) {
  try {
    await query(
      `INSERT INTO admin_audit_log (id, admin_id, action, entity_type, entity_id, changes)
       VALUES ($1, $2, $3, 'territory', $4, $5)`,
      [
        crypto.randomUUID(),
        req.user ? (req.user.id || req.user.userId) : null,
        action,
        detail?.territory_id || detail?.franchise_partner_id || action,
        JSON.stringify(detail || {}),
      ]
    );
  } catch (err) {
    logger.warn(`Territory audit write failed for "${action}": ${err.message}`);
  }
}

/**
 * POST /territories/transitions
 *
 * A device reporting that it crossed from one territory into another.
 *
 * Accepts a crossing that happened earlier: the device queues transitions when
 * it has no signal — which is most likely at the edge of a serviced area, i.e.
 * exactly where crossings happen — and uploads them on reconnection. The
 * client's `occurred_at` is therefore trusted for ordering but clamped, because
 * a client-supplied timestamp is not evidence and a device with a wrong clock
 * would otherwise write rows dated next year.
 */
router.post('/transitions', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id || req.user.userId;
    const body = req.body || {};

    const lat = body.lat != null ? Number(body.lat) : null;
    const lng = body.lng != null ? Number(body.lng) : null;

    const toId = body.to_territory_id || null;
    const fromId = body.from_territory_id || null;

    if (!toId && !fromId) {
      return res.status(400).json({ success: false, message: 'A transition needs at least one territory.' });
    }
    if (toId && fromId && String(toId) === String(fromId)) {
      return res.status(400).json({ success: false, message: 'A transition must change territory.' });
    }

    // Clamp the reported time into [30 days ago, now]. A backlog older than a
    // month is not worth reconciling, and nothing may be dated in the future.
    const now = Date.now();
    const reported = body.occurred_at ? Date.parse(body.occurred_at) : now;
    const occurredAt = new Date(
      Math.min(now, Math.max(Number.isFinite(reported) ? reported : now, now - 30 * 24 * 3600 * 1000))
    ).toISOString();

    try {
      await query(
        `INSERT INTO territory_transitions
           (id, user_id, from_territory_id, to_territory_id, latitude, longitude, occurred_at, mocked)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [crypto.randomUUID(), userId, fromId, toId, lat, lng, occurredAt, body.mocked === true ? 1 : 0]
      );
    } catch (err) {
      // The dedupe index firing means the device retried an upload it had
      // already made. That is a success from the client's point of view, and
      // telling it otherwise makes it retry forever.
      if (/unique|duplicate/i.test(err.message)) {
        return res.json({ success: true, recorded: false, reason: 'already_recorded' });
      }
      throw err;
    }

    return res.json({ success: true, recorded: true, occurred_at: occurredAt });
  } catch (err) {
    return next(err);
  }
});

// ─── Public resolution ──────────────────────────────────────────────────────

/**
 * GET /territories/resolve?lat=&lng=&pincode=
 *
 * The single question every client asks: where am I, and who serves it?
 *
 * Always 200. `resolved: false` with a `reason` is a legitimate answer and the
 * one the platform gives today for coordinate-only queries, because boundaries
 * are quarantined until verified. Clients branch on `resolved`, not on status.
 */
router.get('/resolve', optionalAuth, async (req, res) => {
  try {
    const lat = req.query.lat != null ? Number(req.query.lat) : null;
    const lng = req.query.lng != null ? Number(req.query.lng) : null;
    const pincode = req.query.pincode || null;

    const result = await territoryService.resolve({ lat, lng, pincode });

    return res.json({
      success: true,
      ...result,
      // So a client can explain itself to a user: "we placed you by postcode"
      // reads very differently from "we placed you by GPS".
      attribution_basis: result.method,
    });
  } catch (err) {
    logger.error('Territory resolve failed: ' + err.message);
    return res.json({
      success: true,
      resolved: false,
      method: 'unresolved',
      reason: 'error',
      territory: null,
      franchise: null,
    });
  }
});

/**
 * POST /territories/interest  { pincode }
 *
 * "Become a franchise partner for this area." The productive end of an
 * unresolved pincode: the platform could not serve it, so it records that
 * someone wants it served.
 */
router.post('/interest', optionalAuth, async (req, res) => {
  const result = await territoryService.recordCoverageInterest(req.body?.pincode);
  if (!result.recorded) {
    return res.status(400).json({
      success: false,
      message: `Invalid pincode: ${pincodeUtil.describeFailure(req.body?.pincode)}.`,
    });
  }
  return res.json({
    success: true,
    pincode: result.pincode,
    message: 'Noted. We will get in touch when a partner is appointed for this area.',
  });
});

// ─── Franchise-scoped ───────────────────────────────────────────────────────

/**
 * GET /territories/mine
 *
 * The territories the calling franchise actually holds. Scoped by the
 * middleware rather than by this handler remembering to filter.
 */
router.get('/mine', authenticate, attachFranchiseScope, requireFranchise, async (req, res, next) => {
  try {
    const scope = req.franchiseScope;

    // An administrator reaching this endpoint has no territories of their own;
    // say so rather than returning the whole platform.
    if (!scope.scoped) {
      return res.json({
        success: true,
        admin: true,
        territories: [],
        message: 'Administrators are not scoped to a franchise. Use /territories/admin/list.',
      });
    }

    const res1 = await query(
      `SELECT ft.id AS assignment_id, ft.territory_id, ft.pincode, ft.status,
              ft.commission_rate, ft.buffer_radius_km, ft.assigned_at,
              t.name AS territory_name, t.centroid_lat, t.centroid_lng,
              COALESCE(t.boundary_verified, 0) AS boundary_verified
         FROM franchise_territories ft
         JOIN territories t ON t.id = ft.territory_id
        WHERE ft.franchise_partner_id = $1 AND ft.status = 'ACTIVE'
        ORDER BY ft.pincode`,
      [scope.franchisePartnerId]
    );

    return res.json({
      success: true,
      franchise_partner_id: scope.franchisePartnerId,
      count: (res1.rows || res1 || []).length,
      territories: res1.rows || res1 || [],
    });
  } catch (err) {
    return next(err);
  }
});

// ─── Administration ─────────────────────────────────────────────────────────

/** GET /territories/admin/coverage — the headline numbers for the console. */
router.get('/admin/coverage', ...adminOnly, async (req, res, next) => {
  try {
    const stats = await territoryService.coverageStats();
    return res.json({ success: true, ...stats });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /territories/admin/list
 *
 * Territories for the map, optionally filtered by bounding box or search.
 *
 * Capped and paginated: there are 1578 territories and each carries a polygon,
 * so an unbounded response is several megabytes of GeoJSON the browser has to
 * parse before it can draw anything.
 */
router.get('/admin/list', ...adminOnly, async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 200, 1), 1000);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const search = req.query.q ? String(req.query.q).trim() : null;
    const includeBoundary = req.query.include_boundary === 'true';

    const params = [];
    const conditions = ['t.is_active = true'];

    if (search) {
      const asPincode = pincodeUtil.normalize(search);
      if (asPincode) {
        params.push(asPincode);
        conditions.push(`t.pincode = $${params.length}`);
      } else {
        params.push(`%${search.toLowerCase()}%`);
        conditions.push(`LOWER(t.name) LIKE $${params.length}`);
      }
    }

    if (req.query.unassigned === 'true') {
      conditions.push(
        "NOT EXISTS (SELECT 1 FROM franchise_territories ft WHERE ft.territory_id = t.id AND ft.status = 'ACTIVE')"
      );
    }

    // The boundary column is the expensive part of the payload, so it is opt-in.
    const boundarySelect = includeBoundary ? 't.boundary_geojson,' : '';

    params.push(limit, offset);
    const res1 = await query(
      `SELECT t.id, t.name, t.pincode, t.centroid_lat, t.centroid_lng,
              ${boundarySelect}
              COALESCE(t.boundary_verified, 0) AS boundary_verified,
              COALESCE(t.centroid_verified, 0) AS centroid_verified,
              ft.franchise_partner_id,
              fp.territory_name AS franchise_name
         FROM territories t
         LEFT JOIN franchise_territories ft
                ON ft.territory_id = t.id AND ft.status = 'ACTIVE'
         LEFT JOIN franchise_partners fp ON fp.id = ft.franchise_partner_id
        WHERE ${conditions.join(' AND ')}
        ORDER BY t.pincode
        LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const rows = res1.rows || res1 || [];
    const total = await queryOne(
      `SELECT COUNT(*) AS c FROM territories t WHERE ${conditions.join(' AND ')}`,
      params.slice(0, params.length - 2)
    );

    return res.json({
      success: true,
      count: rows.length,
      total: Number(total?.c) || 0,
      limit,
      offset,
      territories: rows,
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /territories/admin/validate-boundary  { geojson, exclude_territory_id }
 *
 * A dry run. The admin map calls this as the operator draws, so a conflict is
 * visible before anything is saved rather than as a rejection afterwards.
 */
router.post('/admin/validate-boundary', ...adminOnly, async (req, res, next) => {
  try {
    const { geojson, exclude_territory_id: excludeId } = req.body || {};
    if (!geojson) {
      return res.status(400).json({ success: false, message: 'geojson is required.' });
    }

    const result = await territoryService.validateNoOverlap(geojson, { excludeTerritoryId: excludeId || null });
    return res.json({ success: true, ...result });
  } catch (err) {
    return next(err);
  }
});

/**
 * PUT /territories/admin/:id/boundary  { geojson, verified, source }
 *
 * Saves a boundary. Overlap is re-validated server-side: the dry run above is a
 * convenience for the operator, not the enforcement — another admin may have
 * saved a conflicting shape in between.
 *
 * `verified` is super-admin only and defaults to false. Marking a boundary
 * verified is what permits it to attribute revenue, so it is a deliberate act
 * by a named actor rather than a side effect of saving a shape.
 */
router.put('/admin/:id/boundary', ...adminOnly, async (req, res, next) => {
  try {
    const { geojson, verified, source } = req.body || {};
    if (!geojson) {
      return res.status(400).json({ success: false, message: 'geojson is required.' });
    }

    const territory = await queryOne('SELECT id, name, pincode FROM territories WHERE id = $1', [req.params.id]);
    if (!territory) {
      return res.status(404).json({ success: false, message: 'Territory not found.' });
    }

    const validation = await territoryService.validateNoOverlap(geojson, { excludeTerritoryId: req.params.id });
    if (!validation.valid) {
      return res.status(409).json({
        success: false,
        message: validation.reason === 'overlaps_existing_territory'
          ? 'This boundary overlaps an existing territory. Territories are exclusive.'
          : `Boundary rejected: ${validation.reason}.`,
        ...validation,
      });
    }

    const wantsVerified = verified === true || verified === 'true';
    if (wantsVerified && String(req.user?.role || '').toLowerCase() !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Marking a boundary verified permits it to attribute franchise revenue, and requires a super admin.',
      });
    }

    const centroid = spatial.computeCentroid(geojson);

    await query(
      `UPDATE territories
          SET boundary_geojson = $1,
              boundary_verified = $2,
              boundary_source = $3,
              boundary_imported_at = CURRENT_TIMESTAMP,
              centroid_lat = COALESCE($4, centroid_lat),
              centroid_lng = COALESCE($5, centroid_lng)
        WHERE id = $6`,
      [
        JSON.stringify(geojson),
        wantsVerified ? 1 : 0,
        source || (wantsVerified ? 'admin_drawn' : null),
        centroid ? centroid.lat : null,
        centroid ? centroid.lng : null,
        req.params.id,
      ]
    );

    territoryService.invalidate();
    await audit(req, 'territory_boundary_updated', {
      territory_id: req.params.id,
      verified: wantsVerified,
      area_km2: validation.area_km2,
    });

    return res.json({
      success: true,
      territory_id: req.params.id,
      verified: wantsVerified,
      area_km2: validation.area_km2,
      message: wantsVerified
        ? 'Boundary saved and verified. It will now be used for GPS attribution.'
        : 'Boundary saved. It will not attribute revenue until a super admin verifies it.',
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /territories/admin/assign
 *   { franchise_partner_id, territory_id | pincode, commission_rate, buffer_radius_km }
 */
router.post('/admin/assign', ...adminOnly, requireSuperAdmin, async (req, res, next) => {
  try {
    const { franchise_partner_id: partnerId, commission_rate: commissionRate, buffer_radius_km: buffer, reason } = req.body || {};
    let territoryId = req.body?.territory_id || null;

    // Accepting a pincode is what makes bulk assignment from a pasted list
    // possible without the operator first looking up 40 territory ids.
    if (!territoryId && req.body?.pincode) {
      const normalized = pincodeUtil.normalize(req.body.pincode);
      if (!normalized) {
        return res.status(400).json({
          success: false,
          message: `Invalid pincode: ${pincodeUtil.describeFailure(req.body.pincode)}.`,
        });
      }
      const found = await queryOne('SELECT id FROM territories WHERE pincode = $1 AND is_active = true', [normalized]);
      if (!found) {
        return res.status(404).json({ success: false, message: `No active territory for pincode ${normalized}.` });
      }
      territoryId = found.id;
    }

    const result = await territoryService.assignTerritory({
      franchisePartnerId: partnerId,
      territoryId,
      actorId: req.user.id || req.user.userId,
      commissionRate: commissionRate === undefined || commissionRate === null || commissionRate === ''
        ? null
        : Number(commissionRate),
      bufferRadiusKm: Number(buffer) || 0,
      reason,
    });

    await audit(req, 'territory_assigned', { territory_id: territoryId, franchise_partner_id: partnerId });
    return res.json({ success: true, ...result });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ success: false, message: err.message, conflict: err.conflict || null });
    }
    return next(err);
  }
});

/**
 * POST /territories/admin/assign-bulk
 *   { franchise_partner_id, pincodes: [...] }
 *
 * Reports per-pincode outcomes rather than failing the batch on the first
 * conflict. An operator pasting forty pincodes where two are already taken
 * needs the other thirty-eight assigned and the two named.
 */
router.post('/admin/assign-bulk', ...adminOnly, requireSuperAdmin, async (req, res, next) => {
  try {
    const { franchise_partner_id: partnerId, pincodes } = req.body || {};
    if (!partnerId) {
      return res.status(400).json({ success: false, message: 'franchise_partner_id is required.' });
    }

    const { accepted, rejected } = pincodeUtil.partition(pincodes);
    const results = { assigned: [], failed: [...rejected.map((r) => ({ pincode: r.value, reason: r.reason }))] };

    for (const pincode of accepted) {
      try {
        const territory = await queryOne(
          'SELECT id FROM territories WHERE pincode = $1 AND is_active = true',
          [pincode]
        );
        if (!territory) {
          results.failed.push({ pincode, reason: 'no active territory for this pincode' });
          continue;
        }
        const assigned = await territoryService.assignTerritory({
          franchisePartnerId: partnerId,
          territoryId: territory.id,
          actorId: req.user.id || req.user.userId,
          reason: 'bulk assignment',
        });
        if (assigned.assigned) results.assigned.push(pincode);
        else results.failed.push({ pincode, reason: assigned.reason });
      } catch (err) {
        results.failed.push({ pincode, reason: err.message });
      }
    }

    await audit(req, 'territory_assigned_bulk', {
      franchise_partner_id: partnerId,
      assigned: results.assigned.length,
      failed: results.failed.length,
    });

    return res.json({
      success: true,
      assigned_count: results.assigned.length,
      failed_count: results.failed.length,
      ...results,
    });
  } catch (err) {
    return next(err);
  }
});

/** POST /territories/admin/:id/transfer  { to_franchise_partner_id, reason, effective_from } */
router.post('/admin/:id/transfer', ...adminOnly, requireSuperAdmin, async (req, res, next) => {
  try {
    const { to_franchise_partner_id: toId, reason, effective_from: effectiveFrom } = req.body || {};
    if (!toId) {
      return res.status(400).json({ success: false, message: 'to_franchise_partner_id is required.' });
    }

    const result = await territoryService.transferTerritory({
      territoryId: req.params.id,
      toFranchisePartnerId: toId,
      actorId: req.user.id || req.user.userId,
      reason,
      effectiveFrom: effectiveFrom || null,
    });

    await audit(req, 'territory_transferred', { territory_id: req.params.id, to_franchise_partner_id: toId });

    return res.json({
      success: true,
      ...result,
      message: 'Territory transferred. Past orders remain attributed to the previous holder.',
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, message: err.message });
    return next(err);
  }
});

/** DELETE /territories/admin/:id/assignment — release back to the platform pool. */
router.delete('/admin/:id/assignment', ...adminOnly, requireSuperAdmin, async (req, res, next) => {
  try {
    const result = await territoryService.releaseTerritory({
      territoryId: req.params.id,
      actorId: req.user.id || req.user.userId,
      reason: req.body?.reason,
    });
    await audit(req, 'territory_released', { territory_id: req.params.id });
    return res.json({ success: true, ...result });
  } catch (err) {
    return next(err);
  }
});

/** GET /territories/admin/:id/history — who held it, and when. */
router.get('/admin/:id/history', ...adminOnly, async (req, res, next) => {
  try {
    const res1 = await query(
      `SELECT l.*, fp_from.territory_name AS from_name, fp_to.territory_name AS to_name
         FROM territory_assignment_log l
         LEFT JOIN franchise_partners fp_from ON fp_from.id = l.from_franchise_id
         LEFT JOIN franchise_partners fp_to   ON fp_to.id = l.to_franchise_id
        WHERE l.territory_id = $1
        ORDER BY l.effective_from DESC
        LIMIT 100`,
      [req.params.id]
    );
    return res.json({ success: true, history: res1.rows || res1 || [] });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /territories/admin/gaps — areas the platform was asked for and cannot serve.
 *
 * Sorted by demand, because that is the order in which franchises should be
 * sold.
 */
router.get('/admin/gaps', ...adminOnly, async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 500);
    const res1 = await query(
      `SELECT g.*, t.name AS territory_name
         FROM territory_coverage_gaps g
         LEFT JOIN territories t ON t.pincode = g.pincode
        ORDER BY (g.request_count + g.interest_count * 5) DESC
        LIMIT $1`,
      [limit]
    );
    return res.json({ success: true, gaps: res1.rows || res1 || [] });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
