const crypto = require('crypto');
const { query, queryOne, queryMany } = require('../../../config/database');
const { hasSocietyCapability } = require('../middleware/society-capability');
const notifications = require('../../core/services/notification.service');
const logger = require('../../../config/logger');

// Resolve the society this guard is on duty for. Guards are scoped to one
// society, so every read and write below is filtered by it.
async function societyIdFor(req) {
  if (req.user?.society_id) return req.user.society_id;
  const row = await queryOne(
    'SELECT society_id FROM society_members WHERE user_id = $1 LIMIT 1',
    [req.user.id]
  );
  return row ? row.society_id : null;
}

function requireSociety(societyId, res) {
  if (!societyId) {
    res.status(403).json({ success: false, message: 'No society is associated with this account' });
    return false;
  }
  return true;
}

/**
 * The visitor lifecycle.
 *
 * `updateVisitorStatus` accepted any status from the list in any order, so a
 * checked-out visitor could be put back to checked-in, a denied visitor could
 * be approved after the fact, and a gate log could be rewritten into any shape
 * at all. This log is the record of who was inside the society and when; an
 * arbitrary edit to it is not a data-quality problem, it is the loss of the
 * only evidence there is.
 *
 * Terminal states have no exits. A visitor who left and came back is a new
 * entry, which is also what the gate register needs it to be.
 */
const VISITOR_FLOW = Object.freeze({
  pending:     ['approved', 'denied'],
  approved:    ['checked_in', 'denied'],
  denied:      [],
  checked_in:  ['checked_out'],
  checked_out: [],
});

const VISITOR_STATUSES = Object.keys(VISITOR_FLOW);

/**
 * Who may move a visitor to a given status.
 *
 * The approve/deny decision belongs to the resident being visited; the physical
 * gate movements belong to the guard. Previously any member of the society
 * could set any status on any visitor — a neighbour could approve a visitor for
 * a flat that is not theirs, or check out someone else's guest.
 */
const STATUS_CAPABILITY = Object.freeze({
  approved: 'approveVisitor',
  denied: 'approveVisitor',
  checked_in: 'logGateEntry',
  checked_out: 'logGateEntry',
  pending: 'logGateEntry',
});

/**
 * Pushes a gate event to the people who live in a flat.
 *
 * Deliberately resolves recipients from membership rather than taking a user
 * id: a flat has a family, and notifying only whoever registered it means the
 * one person who is out is the only person asked.
 */
async function notifyFlatResidents(societyId, flatNumber, notification) {
  if (!societyId || !flatNumber) return;

  const result = await query(
    `SELECT user_id FROM society_members
      WHERE society_id = $1 AND flat_number = $2 AND is_active = 1`,
    [societyId, flatNumber]
  );

  const residents = result.rows || result || [];
  if (residents.length === 0) {
    // Worth knowing: a gate entry for a flat with nobody registered to it means
    // either a typo at the gate or a flat the society has not onboarded.
    logger.info(`Gate event for society ${societyId} flat ${flatNumber} has no registered residents`);
    return;
  }

  await Promise.all(
    residents.map((r) => notifications.sendToUser(r.user_id, notification)
      .catch((err) => logger.warn(`Push to ${r.user_id} failed: ${err.message}`)))
  );
}

// ─── VISITORS ────────────────────────────────────────────────────────────────

async function logVisitor(req, res, next) {
  try {
    const societyId = await societyIdFor(req);
    if (!requireSociety(societyId, res)) return;

    const { name, phone, purpose, flat, photo, vehicleNumber, clientId, recordedAt } = req.body;
    if (!name || !flat) {
      return res.status(400).json({ success: false, message: 'Visitor name and flat number are required' });
    }

    /**
     * A replayed upload must not create a second visitor.
     *
     * The gate console queues entries while it has no signal and drains them on
     * reconnect, so the same entry can arrive twice — the first attempt may
     * have been recorded and had its response lost on the way back. A duplicate
     * is not cosmetic: the check-out matches one row and leaves the other open
     * forever, so the register shows a visitor who never left.
     */
    if (clientId) {
      const existing = await queryOne(
        'SELECT id FROM society_visitors WHERE society_id = $1 AND client_entry_id = $2',
        [societyId, clientId]
      );
      if (existing) {
        return res.status(200).json({
          success: true,
          id: existing.id,
          duplicate: true,
          message: 'This entry was already recorded',
        });
      }
    }

    /**
     * The time the visitor actually arrived, not the time the upload landed.
     *
     * Clamped into a sane window: a queued entry can legitimately be hours old
     * after a long outage, but a device with a wrong clock must not be able to
     * write the register into next year or last decade.
     */
    const now = Date.now();
    const reported = recordedAt ? Date.parse(recordedAt) : now;
    const arrivedAt = new Date(
      Math.min(now, Math.max(Number.isFinite(reported) ? reported : now, now - 7 * 24 * 3600 * 1000))
    ).toISOString();

    const id = crypto.randomUUID();
    await query(
      `INSERT INTO society_visitors
         (id, society_id, guard_id, visitor_name, visitor_phone, purpose, flat_number,
          visitor_photo_url, vehicle_number, client_entry_id, status, checked_in_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'checked_in', $11, CURRENT_TIMESTAMP)`,
      [id, societyId, req.user.id, name, phone || null, purpose || 'guest', flat,
       photo || null, vehicleNumber || null, clientId || null, arrivedAt]
    );

    // Intercom alert to the resident's app.
    const io = req.app.get('io');
    if (io) {
      io.to(`flat_${societyId}_${flat}`).emit('VISITOR_ALERT', {
        id, name, phone, purpose, timestamp: new Date().toISOString(),
      });
    }

    /**
     * A socket alone does not reach a resident.
     *
     * The only notification here was the emit above, which lands on an open
     * socket — that is, on a phone with the app in the foreground. A visitor
     * arriving unannounced is precisely the moment the resident is doing
     * something else, so the alert reached nobody in the common case and the
     * guard was left standing at the gate with a visitor and no answer.
     *
     * The push goes to every active resident of the flat, and it is sent
     * without blocking the guard's response: the gate must not wait on a
     * notification queue, and a push that fails must not fail the check-in that
     * has already happened.
     */
    notifyFlatResidents(societyId, flat, {
      title: 'Visitor at the gate',
      body: `${name}${purpose ? ` — ${purpose}` : ''} is at the gate for flat ${flat}.`,
      type: 'visitor_alert',
      priority: 'high',
      data: { visitorId: id, societyId, flat, visitorName: name, visitorPhone: phone || null },
    }).catch((err) => logger.warn(`Visitor push for flat ${flat} failed: ${err.message}`));

    res.status(201).json({ success: true, id, message: 'Visitor logged, intercom alert sent' });
  } catch (error) { next(error); }
}

async function getTodayVisitors(req, res, next) {
  try {
    const societyId = await societyIdFor(req);
    if (!requireSociety(societyId, res)) return;

    const data = await queryMany(
      `SELECT id, visitor_name, visitor_phone, purpose, flat_number, vehicle_number,
              visitor_photo_url, status, checked_in_at, checked_out_at
         FROM society_visitors
        WHERE society_id = $1
          AND DATE(created_at) = CURRENT_DATE
        ORDER BY created_at DESC`,
      [societyId]
    );
    res.json({ success: true, data });
  } catch (error) { next(error); }
}

async function checkOutVisitor(req, res, next) {
  try {
    const societyId = await societyIdFor(req);
    if (!requireSociety(societyId, res)) return;

    const visitor = await queryOne(
      'SELECT id, status FROM society_visitors WHERE id = $1 AND society_id = $2',
      [req.params.id, societyId]
    );
    if (!visitor) {
      return res.status(404).json({ success: false, message: 'Visitor not found for this society' });
    }
    if (visitor.status === 'checked_out') {
      return res.status(409).json({ success: false, message: 'Visitor is already checked out' });
    }

    // Conditional update, not a read-then-write.
    //
    // The status was read above and the row updated by id alone, so two
    // check-out taps a moment apart — a guard's second press, or the gate
    // tablet retrying on a flaky connection — both passed the check and both
    // wrote, overwriting checked_out_at with the later time. The condition
    // moves into the statement so the database decides, and rowCount says
    // whether this request was the one that won.
    const result = await query(
      `UPDATE society_visitors
          SET status = 'checked_out', checked_out_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND society_id = $2 AND status <> 'checked_out'`,
      [req.params.id, societyId]
    );

    if (result.rowCount === 0) {
      return res.status(409).json({ success: false, message: 'Visitor is already checked out' });
    }

    res.json({ success: true, message: 'Visitor checked out' });
  } catch (error) { next(error); }
}

async function updateVisitorStatus(req, res, next) {
  try {
    const societyId = await societyIdFor(req);
    if (!requireSociety(societyId, res)) return;

    const { visitorId, status } = req.body;
    if (!VISITOR_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: `Status must be one of: ${VISITOR_STATUSES.join(', ')}` });
    }

    const visitor = await queryOne(
      'SELECT id, status, flat_number FROM society_visitors WHERE id = $1 AND society_id = $2',
      [visitorId, societyId]
    );
    if (!visitor) {
      return res.status(404).json({ success: false, message: 'Visitor not found for this society' });
    }

    const current = visitor.status || 'pending';
    if (current !== status && !(VISITOR_FLOW[current] || []).includes(status)) {
      return res.status(409).json({
        success: false,
        message: `A visitor cannot move from "${current}" to "${status}".`,
        code: 'INVALID_TRANSITION',
        current_status: current,
        allowed_next: VISITOR_FLOW[current] || [],
      });
    }

    // The approve/deny decision belongs to the resident being visited. A guard
    // logs movement at the gate; a neighbour decides nothing about a visitor
    // for a flat that is not theirs.
    const needed = STATUS_CAPABILITY[status];
    if (!(await hasSocietyCapability(req, societyId, needed, visitor.flat_number))) {
      return res.status(403).json({
        success: false,
        message: `This account cannot ${needed === 'approveVisitor' ? 'approve or deny visitors' : 'log gate movements'} here.`,
        code: 'CAPABILITY_REQUIRED',
        capability: needed,
      });
    }

    // Guarded by the status we just read, so a concurrent change loses rather
    // than being silently overwritten.
    const result = await query(
      'UPDATE society_visitors SET status = $1 WHERE id = $2 AND society_id = $3 AND status = $4',
      [status, visitorId, societyId, current]
    );
    if (result.rowCount === 0) {
      return res.status(409).json({
        success: false,
        message: 'This visitor was updated by someone else a moment ago. Reload and try again.',
        code: 'CONCURRENT_UPDATE',
      });
    }

    res.json({ success: true, message: `Visitor ${status}`, previous_status: current });
  } catch (error) { next(error); }
}

// ─── PACKAGES ────────────────────────────────────────────────────────────────

async function logPackage(req, res, next) {
  try {
    const societyId = await societyIdFor(req);
    if (!requireSociety(societyId, res)) return;

    const { flatNumber, courierName, packageDescription } = req.body;
    if (!flatNumber) {
      return res.status(400).json({ success: false, message: 'Flat number is required' });
    }

    const id = crypto.randomUUID();
    await query(
      `INSERT INTO society_packages
         (id, society_id, flat_number, logged_by, courier_name, package_description, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'received', CURRENT_TIMESTAMP)`,
      [id, societyId, flatNumber, req.user.id, courierName || null, packageDescription || null]
    );

    const io = req.app.get('io');
    if (io) {
      io.to(`flat_${societyId}_${flatNumber}`).emit('PACKAGE_ARRIVED', {
        id, courierName, timestamp: new Date().toISOString(),
      });
    }

    res.status(201).json({ success: true, id, message: 'Package logged' });
  } catch (error) { next(error); }
}

async function getPendingPackages(req, res, next) {
  try {
    const societyId = await societyIdFor(req);
    if (!requireSociety(societyId, res)) return;

    const data = await queryMany(
      `SELECT id, flat_number, courier_name, package_description, status, created_at
         FROM society_packages
        WHERE society_id = $1 AND status = 'received'
        ORDER BY created_at DESC`,
      [societyId]
    );
    res.json({ success: true, data });
  } catch (error) { next(error); }
}

// ─── STAFF ATTENDANCE ────────────────────────────────────────────────────────

async function getTodayStaffAttendance(req, res, next) {
  try {
    const societyId = await societyIdFor(req);
    if (!requireSociety(societyId, res)) return;

    // TO_CHAR is PostgreSQL-only; SQLite has no such function and this handler
    // returned a 500 on every call in the SQLite configuration
    // ("SQLITE_ERROR: no such function: TO_CHAR"). The date column stores a
    // plain YYYY-MM-DD string, so computing today in JS and binding it as a
    // parameter is both portable and index-friendly.
    const today = new Date().toISOString().slice(0, 10);

    const data = await queryMany(
      `SELECT a.id, a.staff_id, a.check_in_time, a.check_out_time, a.status,
              s.staff_name, s.staff_type
         FROM society_staff_attendance a
         LEFT JOIN society_domestic_staff s ON a.staff_id = s.id
        WHERE a.society_id = $1
          AND a.date = $2
        ORDER BY a.check_in_time DESC`,
      [societyId, today]
    );
    res.json({ success: true, data });
  } catch (error) { next(error); }
}

// ─── EMERGENCY ───────────────────────────────────────────────────────────────

async function raiseEmergency(req, res, next) {
  try {
    const societyId = await societyIdFor(req);
    if (!requireSociety(societyId, res)) return;

    const { type } = req.body;
    const VALID = ['fire', 'medical', 'security', 'other'];
    const alertType = VALID.includes(type) ? type : 'other';

    // Broadcast first: reaching residents matters more than the audit row.
    const io = req.app.get('io');
    if (io) {
      io.to(`society_${societyId}`).emit('SOCIETY_EMERGENCY', {
        type: alertType,
        raisedBy: req.user.id,
        timestamp: new Date().toISOString(),
      });
    }

    try {
      await query(
        `INSERT INTO society_emergency_alerts
           (id, society_id, triggered_by, alert_type, status, created_at)
         VALUES ($1, $2, $3, $4, 'active', CURRENT_TIMESTAMP)`,
        [crypto.randomUUID(), societyId, req.user.id, alertType]
      );
    } catch (e) {
      console.error('[SOS] Alert broadcast succeeded but could not be recorded:', e.message);
    }

    res.status(201).json({ success: true, message: `${alertType} alert broadcast to society` });
  } catch (error) { next(error); }
}

module.exports = {
  logVisitor,
  getTodayVisitors,
  checkOutVisitor,
  updateVisitorStatus,
  logPackage,
  getPendingPackages,
  getTodayStaffAttendance,
  raiseEmergency,
};
