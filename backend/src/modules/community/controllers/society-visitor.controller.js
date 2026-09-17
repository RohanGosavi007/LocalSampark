const crypto = require('crypto');
const { query, queryOne, queryMany } = require('../../../config/database');
const { hasSocietyCapability } = require('../middleware/society-capability');

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

// ─── VISITORS ────────────────────────────────────────────────────────────────

async function logVisitor(req, res, next) {
  try {
    const societyId = await societyIdFor(req);
    if (!requireSociety(societyId, res)) return;

    const { name, phone, purpose, flat, photo } = req.body;
    if (!name || !flat) {
      return res.status(400).json({ success: false, message: 'Visitor name and flat number are required' });
    }

    const id = crypto.randomUUID();
    await query(
      `INSERT INTO society_visitors
         (id, society_id, guard_id, visitor_name, visitor_phone, purpose, flat_number,
          visitor_photo_url, status, checked_in_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'checked_in', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [id, societyId, req.user.id, name, phone || null, purpose || 'guest', flat, photo || null]
    );

    // Intercom alert to the resident's app.
    const io = req.app.get('io');
    if (io) {
      io.to(`flat_${societyId}_${flat}`).emit('VISITOR_ALERT', {
        id, name, phone, purpose, timestamp: new Date().toISOString(),
      });
    }

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

    const data = await queryMany(
      `SELECT a.id, a.staff_id, a.check_in_time, a.check_out_time, a.status,
              s.staff_name, s.staff_type
         FROM society_staff_attendance a
         LEFT JOIN society_domestic_staff s ON a.staff_id = s.id
        WHERE a.society_id = $1
          AND a.date = TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD')
        ORDER BY a.check_in_time DESC`,
      [societyId]
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
