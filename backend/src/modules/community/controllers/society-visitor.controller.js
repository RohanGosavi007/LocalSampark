const crypto = require('crypto');
const { query, queryOne, queryMany } = require('../../../config/database');

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

    await query(
      `UPDATE society_visitors
          SET status = 'checked_out', checked_out_at = CURRENT_TIMESTAMP
        WHERE id = $1`,
      [req.params.id]
    );
    res.json({ success: true, message: 'Visitor checked out' });
  } catch (error) { next(error); }
}

async function updateVisitorStatus(req, res, next) {
  try {
    const societyId = await societyIdFor(req);
    if (!requireSociety(societyId, res)) return;

    const { visitorId, status } = req.body;
    const VALID = ['pending', 'approved', 'denied', 'checked_in', 'checked_out'];
    if (!VALID.includes(status)) {
      return res.status(400).json({ success: false, message: `Status must be one of: ${VALID.join(', ')}` });
    }

    const result = await query(
      'UPDATE society_visitors SET status = $1 WHERE id = $2 AND society_id = $3',
      [status, visitorId, societyId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Visitor not found for this society' });
    }

    res.json({ success: true, message: `Visitor ${status}` });
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
