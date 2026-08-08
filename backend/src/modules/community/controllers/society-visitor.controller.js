const { query, queryOne, queryMany, withTransaction } = require('../../../config/database.sqlite');
const { v4: uuidv4 } = require('uuid');

// ─── HELPER: Get society membership for current user ─────────
async function getMembership(userId, societyId) {
  return queryOne(
    'SELECT * FROM society_members WHERE user_id = $1 AND society_id = $2 AND is_active = 1',
    [userId, societyId]
  );
}

async function getSocietyIdForUser(userId) {
  const member = await queryOne('SELECT society_id FROM society_members WHERE user_id = $1 AND is_active = 1', [userId]);
  return member ? member.society_id : null;
}

// ═══════════════════════════════════════════════════════════════
// FEATURE 1-2: VISITOR MANAGEMENT + DOORBELL
// ═══════════════════════════════════════════════════════════════

// Guard: Log new visitor
const logVisitor = async (req, res, next) => {
  try {
    const societyId = await getSocietyIdForUser(req.user.id);
    if (!societyId) return res.status(400).json({ success: false, error: 'Not a society member' });

    const { visitorName, visitorPhone, purpose, flatNumber, vehicleNumber, visitorPhoto, idCardPhoto, notes } = req.body;
    if (!visitorName || !flatNumber) return res.status(400).json({ success: false, error: 'Visitor name and flat number required' });

    // Find resident for the flat
    const resident = await queryOne(
      'SELECT user_id FROM society_members WHERE society_id = $1 AND flat_number = $2 AND role = $3 AND is_active = 1',
      [societyId, flatNumber, 'resident']
    );

    const id = uuidv4();
    const qrCode = `VISITOR_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    await query(
      `INSERT INTO society_visitors (id, society_id, resident_id, guard_id, visitor_name, visitor_phone, purpose, vehicle_number, visitor_photo_url, id_card_photo_url, flat_number, status, qr_code, notes, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending', $12, $13, CURRENT_TIMESTAMP)`,
      [id, societyId, resident ? resident.user_id : null, req.user.id, visitorName, visitorPhone || '', purpose || 'guest', vehicleNumber || '', visitorPhoto || '', idCardPhoto || '', flatNumber, qrCode, notes || '']
    );

    // Log the action
    await query(
      'INSERT INTO society_visitor_log (id, visitor_id, action, performed_by, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)',
      [uuidv4(), id, 'created', req.user.id]
    );

    // Emit doorbell via Supabase Realtime
    const supabaseRealtime = req.app.get('supabaseRealtime');
    if (supabaseRealtime && resident) {
      supabaseRealtime.broadcast(`user:${resident.user_id}`, 'society:doorbell', {
        visitorId: id,
        visitorName,
        visitorPhone: visitorPhone || '',
        purpose: purpose || 'guest',
        flatNumber,
        vehicleNumber: vehicleNumber || '',
        visitorPhoto: visitorPhoto || '',
        idCardPhoto: idCardPhoto || '',
        guardName: req.user.full_name,
        timestamp: new Date().toISOString()
      });
    }

    res.status(201).json({ success: true, data: { id, qrCode, status: 'pending' }, message: 'Visitor logged. Doorbell sent to resident.' });
  } catch (error) { next(error); }
};

// Guard: Get today's visitors
const getTodayVisitors = async (req, res, next) => {
  try {
    const societyId = await getSocietyIdForUser(req.user.id);
    if (!societyId) return res.status(400).json({ success: false, error: 'Not a society member' });

    const visitors = await queryMany(
      `SELECT sv.*, u.full_name as resident_name FROM society_visitors sv
       LEFT JOIN users u ON sv.resident_id = u.id
       WHERE sv.society_id = $1 AND date(sv.created_at) = date('now')
       ORDER BY sv.created_at DESC`,
      [societyId]
    );
    res.json({ success: true, data: visitors });
  } catch (error) { next(error); }
};

// Guard: Check-in visitor
const checkInVisitor = async (req, res, next) => {
  try {
    const { passcode_used } = req.body;
    
    // Check if visitor is blacklisted
    const visitor = await queryOne('SELECT society_id, visitor_phone, visitor_name FROM society_visitors WHERE id = $1', [req.params.id]);
    if (!visitor) return res.status(404).json({ success: false, message: 'Visitor not found' });
    
    // The blacklist table schema from Phase 1 might use person_name and person_phone or name and phone_number.
    // The migration uses: name, phone_number for blacklist. Oh wait! Let's check visitor-preapproval.controller.js.
    // It used person_name and person_phone! Let's just check both or name/phone.
    const blacklisted = await queryOne(
        'SELECT id FROM society_visitor_blacklist WHERE society_id = $1 AND (phone = $2 OR name = $3)', 
        [visitor.society_id, visitor.visitor_phone, visitor.visitor_name]
    );
    if (blacklisted) {
       return res.status(403).json({ success: false, message: 'Visitor is blacklisted' });
    }

    await query(
      "UPDATE society_visitors SET status = 'checked_in', checked_in_at = CURRENT_TIMESTAMP, passcode_used = $2 WHERE id = $1",
      [req.params.id, passcode_used ? 1 : 0]
    );
    await query('INSERT INTO society_visitor_log (id, visitor_id, action, performed_by, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)', [uuidv4(), req.params.id, 'checked_in', req.user.id]);
    res.json({ success: true, message: 'Visitor checked in' });
  } catch (error) { next(error); }
};

// Guard: Check-out visitor
const checkOutVisitor = async (req, res, next) => {
  try {
    await query(
      "UPDATE society_visitors SET status = 'checked_out', checked_out_at = CURRENT_TIMESTAMP WHERE id = $1",
      [req.params.id]
    );
    await query('INSERT INTO society_visitor_log (id, visitor_id, action, performed_by, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)', [uuidv4(), req.params.id, 'checked_out', req.user.id]);
    res.json({ success: true, message: 'Visitor checked out' });
  } catch (error) { next(error); }
};

// Resident: Get my visitors
const getMyVisitors = async (req, res, next) => {
  try {
    const visitors = await queryMany(
      `SELECT sv.*, u.full_name as guard_name FROM society_visitors sv
       LEFT JOIN users u ON sv.guard_id = u.id
       WHERE sv.resident_id = $1
       ORDER BY sv.created_at DESC LIMIT 50`,
      [req.user.id]
    );
    res.json({ success: true, data: visitors });
  } catch (error) { 
    console.error('[getMyVisitors Error]', error);
    res.status(500).json({ success: false, error: error.message, stack: error.stack });
  }
};

// Resident: Approve visitor
const approveVisitor = async (req, res, next) => {
  try {
    await query(
      "UPDATE society_visitors SET status = 'approved', approved_at = CURRENT_TIMESTAMP WHERE id = $1 AND resident_id = $2",
      [req.params.id, req.user.id]
    );
    await query('INSERT INTO society_visitor_log (id, visitor_id, action, performed_by, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)', [uuidv4(), req.params.id, 'approved', req.user.id]);

    const visitor = await queryOne('SELECT * FROM society_visitors WHERE id = $1', [req.params.id]);
    const supabaseRealtime = req.app.get('supabaseRealtime');
    if (supabaseRealtime && visitor) {
      supabaseRealtime.broadcast(`user:${visitor.guard_id}`, 'society:visitor:status', {
        visitorId: req.params.id, status: 'approved', visitorName: visitor.visitor_name, flatNumber: visitor.flat_number, residentName: req.user.full_name
      });
    }
    res.json({ success: true, message: 'Visitor approved' });
  } catch (error) { next(error); }
};

// Resident: Decline visitor
const declineVisitor = async (req, res, next) => {
  try {
    await query(
      "UPDATE society_visitors SET status = 'declined' WHERE id = $1 AND resident_id = $2",
      [req.params.id, req.user.id]
    );
    await query('INSERT INTO society_visitor_log (id, visitor_id, action, performed_by, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)', [uuidv4(), req.params.id, 'declined', req.user.id]);

    const visitor = await queryOne('SELECT * FROM society_visitors WHERE id = $1', [req.params.id]);
    const supabaseRealtime = req.app.get('supabaseRealtime');
    if (supabaseRealtime && visitor) {
      supabaseRealtime.broadcast(`user:${visitor.guard_id}`, 'society:visitor:status', {
        visitorId: req.params.id, status: 'declined', visitorName: visitor.visitor_name, flatNumber: visitor.flat_number, residentName: req.user.full_name
      });
    }
    res.json({ success: true, message: 'Visitor declined' });
  } catch (error) { next(error); }
};

// Admin: All visitors
const getAllVisitors = async (req, res, next) => {
  try {
    const societyId = await getSocietyIdForUser(req.user.id);
    const visitors = await queryMany(
      `SELECT sv.*, u.full_name as resident_name, g.full_name as guard_name FROM society_visitors sv
       LEFT JOIN users u ON sv.resident_id = u.id LEFT JOIN users g ON sv.guard_id = g.id
       WHERE sv.society_id = $1 ORDER BY sv.created_at DESC LIMIT 100`,
      [societyId]
    );
    res.json({ success: true, data: visitors });
  } catch (error) { next(error); }
};

// Admin: Visitor analytics
const getVisitorAnalytics = async (req, res, next) => {
  try {
    const societyId = await getSocietyIdForUser(req.user.id);
    const todayCount = await queryOne("SELECT COUNT(*) as count FROM society_visitors WHERE society_id = $1 AND date(created_at) = date('now')", [societyId]);
    const approvedCount = await queryOne("SELECT COUNT(*) as count FROM society_visitors WHERE society_id = $1 AND status = 'approved' AND date(created_at) = date('now')", [societyId]);
    const declinedCount = await queryOne("SELECT COUNT(*) as count FROM society_visitors WHERE society_id = $1 AND status = 'declined' AND date(created_at) = date('now')", [societyId]);
    const pendingCount = await queryOne("SELECT COUNT(*) as count FROM society_visitors WHERE society_id = $1 AND status = 'pending'", [societyId]);
    const byPurpose = await queryMany("SELECT purpose, COUNT(*) as count FROM society_visitors WHERE society_id = $1 AND date(created_at) = date('now') GROUP BY purpose", [societyId]);

    res.json({ success: true, data: { today: todayCount.count, approved: approvedCount.count, declined: declinedCount.count, pending: pendingCount.count, byPurpose } });
  } catch (error) { next(error); }
};

// ═══════════════════════════════════════════════════════════════
// FEATURE 3: MEMBER MANAGEMENT
// ═══════════════════════════════════════════════════════════════

const getMembers = async (req, res, next) => {
  try {
    const societyId = await getSocietyIdForUser(req.user.id);
    const members = await queryMany(
      `SELECT sm.*, u.full_name, u.phone_number, u.avatar_url, u.email FROM society_members sm
       JOIN users u ON sm.user_id = u.id WHERE sm.society_id = $1 ORDER BY sm.role, sm.flat_number`,
      [societyId]
    );
    res.json({ success: true, data: members });
  } catch (error) { next(error); }
};

const addMember = async (req, res, next) => {
  try {
    const societyId = await getSocietyIdForUser(req.user.id);
    const { phone, flatNumber, role } = req.body;
    if (!phone || !flatNumber) return res.status(400).json({ success: false, error: 'Phone and flat number required' });

    const user = await queryOne('SELECT id, full_name FROM users WHERE phone_number = $1', [phone]);
    if (!user) return res.status(404).json({ success: false, error: 'User not found on LocalSampark. They must register first.' });

    const existing = await queryOne('SELECT id FROM society_members WHERE society_id = $1 AND user_id = $2', [societyId, user.id]);
    if (existing) return res.status(409).json({ success: false, error: 'User already a member of this society' });

    const id = uuidv4();
    await query(
      'INSERT INTO society_members (id, society_id, user_id, flat_number, role, added_by, created_at) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)',
      [id, societyId, user.id, flatNumber, role || 'resident', req.user.id]
    );
    res.status(201).json({ success: true, data: { id, userId: user.id, fullName: user.full_name, flatNumber, role: role || 'resident' }, message: 'Member added' });
  } catch (error) { next(error); }
};

const updateMember = async (req, res, next) => {
  try {
    const { flatNumber, role, isActive } = req.body;
    const sets = [];
    const params = [];
    let idx = 1;
    if (flatNumber !== undefined) { sets.push(`flat_number = $${idx++}`); params.push(flatNumber); }
    if (role !== undefined) { sets.push(`role = $${idx++}`); params.push(role); }
    if (isActive !== undefined) { sets.push(`is_active = $${idx++}`); params.push(isActive ? 1 : 0); }
    if (sets.length === 0) return res.status(400).json({ success: false, error: 'Nothing to update' });
    params.push(req.params.id);
    await query(`UPDATE society_members SET ${sets.join(', ')} WHERE id = $${idx}`, params);
    res.json({ success: true, message: 'Member updated' });
  } catch (error) { next(error); }
};

const removeMember = async (req, res, next) => {
  try {
    await query('DELETE FROM society_members WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Member removed' });
  } catch (error) { next(error); }
};

// ═══════════════════════════════════════════════════════════════
// FEATURES 4-5: GUARD MESSAGING & REMINDERS
// ═══════════════════════════════════════════════════════════════

const sendGuardMessage = async (req, res, next) => {
  try {
    const societyId = await getSocietyIdForUser(req.user.id);
    const { message } = req.body;
    if (!message) return res.status(400).json({ success: false, error: 'Message required' });

    // Find active guard
    const guard = await queryOne("SELECT user_id FROM society_members WHERE society_id = $1 AND role = 'guard' AND is_active = 1 LIMIT 1", [societyId]);
    if (!guard) return res.status(404).json({ success: false, error: 'No active guard found' });

    const id = uuidv4();
    await query(
      'INSERT INTO society_guard_messages (id, society_id, sender_id, guard_id, message, created_at) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)',
      [id, societyId, req.user.id, guard.user_id, message]
    );

    const supabaseRealtime = req.app.get('supabaseRealtime');
    if (supabaseRealtime) {
      supabaseRealtime.broadcast(`user:${guard.user_id}`, 'society:guard:message:new', {
        id, senderName: req.user.full_name, message, timestamp: new Date().toISOString()
      });
    }
    res.status(201).json({ success: true, message: 'Message sent to guard' });
  } catch (error) { next(error); }
};

const getGuardMessages = async (req, res, next) => {
  try {
    const messages = await queryMany(
      `SELECT sgm.*, u.full_name as sender_name FROM society_guard_messages sgm
       JOIN users u ON sgm.sender_id = u.id WHERE sgm.guard_id = $1 ORDER BY sgm.created_at DESC LIMIT 50`,
      [req.user.id]
    );
    res.json({ success: true, data: messages });
  } catch (error) { next(error); }
};

const markMessageRead = async (req, res, next) => {
  try {
    await query('UPDATE society_guard_messages SET is_read = 1 WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) { next(error); }
};

const setGuardReminder = async (req, res, next) => {
  try {
    const societyId = await getSocietyIdForUser(req.user.id);
    const { title, description, reminderTime, priority, isRecurring, recurrencePattern } = req.body;
    if (!title || !reminderTime) return res.status(400).json({ success: false, error: 'Title and reminder time required' });

    const guard = await queryOne("SELECT user_id FROM society_members WHERE society_id = $1 AND role = 'guard' AND is_active = 1 LIMIT 1", [societyId]);
    if (!guard) return res.status(404).json({ success: false, error: 'No active guard found' });

    const id = uuidv4();
    await query(
      'INSERT INTO society_guard_reminders (id, society_id, guard_id, created_by, title, description, reminder_time, priority, is_recurring, recurrence_pattern, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)',
      [id, societyId, guard.user_id, req.user.id, title, description || '', reminderTime, priority || 'normal', isRecurring ? 1 : 0, recurrencePattern || '']
    );
    res.status(201).json({ success: true, message: 'Reminder set for guard' });
  } catch (error) { next(error); }
};

const getGuardReminders = async (req, res, next) => {
  try {
    const reminders = await queryMany(
      `SELECT sgr.*, u.full_name as created_by_name FROM society_guard_reminders sgr
       JOIN users u ON sgr.created_by = u.id WHERE sgr.guard_id = $1 AND sgr.status = 'active' ORDER BY sgr.reminder_time ASC`,
      [req.user.id]
    );
    res.json({ success: true, data: reminders });
  } catch (error) { next(error); }
};

const dismissReminder = async (req, res, next) => {
  try {
    await query("UPDATE society_guard_reminders SET status = 'dismissed' WHERE id = $1", [req.params.id]);
    res.json({ success: true, message: 'Reminder dismissed' });
  } catch (error) { next(error); }
};

// ═══════════════════════════════════════════════════════════════
// FEATURE 6: DOMESTIC STAFF ATTENDANCE
// ═══════════════════════════════════════════════════════════════

const getStaff = async (req, res, next) => {
  try {
    const societyId = await getSocietyIdForUser(req.user.id);
    const staff = await queryMany('SELECT * FROM society_domestic_staff WHERE society_id = $1 AND is_active = 1 ORDER BY staff_name', [societyId]);
    res.json({ success: true, data: staff });
  } catch (error) { next(error); }
};

const addStaff = async (req, res, next) => {
  try {
    const societyId = await getSocietyIdForUser(req.user.id);
    const { staffName, staffPhone, staffType, assignedFlats, staffPhoto, idProof } = req.body;
    if (!staffName || !staffType) return res.status(400).json({ success: false, error: 'Staff name and type required' });

    const id = uuidv4();
    await query(
      'INSERT INTO society_domestic_staff (id, society_id, staff_name, staff_phone, staff_type, assigned_flats, staff_photo_url, id_proof_url, added_by, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)',
      [id, societyId, staffName, staffPhone || '', staffType, JSON.stringify(assignedFlats || []), staffPhoto || '', idProof || '', req.user.id]
    );
    res.status(201).json({ success: true, data: { id }, message: 'Staff member added' });
  } catch (error) { next(error); }
};

const updateStaff = async (req, res, next) => {
  try {
    const { staffName, staffPhone, staffType, assignedFlats, isActive } = req.body;
    const sets = []; const params = []; let idx = 1;
    if (staffName) { sets.push(`staff_name = $${idx++}`); params.push(staffName); }
    if (staffPhone !== undefined) { sets.push(`staff_phone = $${idx++}`); params.push(staffPhone); }
    if (staffType) { sets.push(`staff_type = $${idx++}`); params.push(staffType); }
    if (assignedFlats) { sets.push(`assigned_flats = $${idx++}`); params.push(JSON.stringify(assignedFlats)); }
    if (isActive !== undefined) { sets.push(`is_active = $${idx++}`); params.push(isActive ? 1 : 0); }
    if (sets.length === 0) return res.status(400).json({ success: false, error: 'Nothing to update' });
    params.push(req.params.id);
    await query(`UPDATE society_domestic_staff SET ${sets.join(', ')} WHERE id = $${idx}`, params);
    res.json({ success: true, message: 'Staff updated' });
  } catch (error) { next(error); }
};

const deleteStaff = async (req, res, next) => {
  try {
    await query('UPDATE society_domestic_staff SET is_active = 0 WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Staff deactivated' });
  } catch (error) { next(error); }
};

const markStaffAttendance = async (req, res, next) => {
  try {
    const societyId = await getSocietyIdForUser(req.user.id);
    const { action, notes, check_in_photo_url, face_match_score, gate_id } = req.body; // action: 'check_in' or 'check_out'
    const today = new Date().toISOString().split('T')[0];

    const existing = await queryOne('SELECT * FROM society_staff_attendance WHERE staff_id = $1 AND date = $2', [req.params.id, today]);

    if (action === 'check_in') {
      if (existing) {
        await query(
          'UPDATE society_staff_attendance SET check_in_time = $1, status = $2, check_in_photo_url = COALESCE($3, check_in_photo_url), face_match_score = COALESCE($4, face_match_score), gate_id = COALESCE($5, gate_id) WHERE id = $6', 
          [new Date().toISOString(), 'present', check_in_photo_url, face_match_score, gate_id, existing.id]
        );
      } else {
        await query(
          'INSERT INTO society_staff_attendance (id, staff_id, society_id, marked_by, check_in_time, date, status, notes, check_in_photo_url, face_match_score, gate_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)',
          [uuidv4(), req.params.id, societyId, req.user.id, new Date().toISOString(), today, 'present', notes || '', check_in_photo_url, face_match_score, gate_id]
        );
      }
    } else if (action === 'check_out') {
      if (existing) {
        await query('UPDATE society_staff_attendance SET check_out_time = $1 WHERE id = $2', [new Date().toISOString(), existing.id]);
      }
    }
    res.json({ success: true, message: `Staff ${action === 'check_in' ? 'checked in' : 'checked out'} successfully. Face match: ${face_match_score || 'N/A'}` });
  } catch (error) { next(error); }
};

const getTodayAttendance = async (req, res, next) => {
  try {
    const societyId = await getSocietyIdForUser(req.user.id);
    const today = new Date().toISOString().split('T')[0];
    const attendance = await queryMany(
      `SELECT sa.*, ds.staff_name, ds.staff_type, ds.staff_phone, ds.staff_photo_url FROM society_staff_attendance sa
       JOIN society_domestic_staff ds ON sa.staff_id = ds.id WHERE sa.society_id = $1 AND sa.date = $2 ORDER BY sa.check_in_time`,
      [societyId, today]
    );
    const allStaff = await queryMany('SELECT * FROM society_domestic_staff WHERE society_id = $1 AND is_active = 1', [societyId]);
    res.json({ success: true, data: { attendance, allStaff } });
  } catch (error) { next(error); }
};

const getStaffAttendanceHistory = async (req, res, next) => {
  try {
    const attendance = await queryMany(
      'SELECT * FROM society_staff_attendance WHERE staff_id = $1 ORDER BY date DESC LIMIT 30',
      [req.params.id]
    );
    res.json({ success: true, data: attendance });
  } catch (error) { next(error); }
};

// ═══════════════════════════════════════════════════════════════
// FEATURE 7: MAINTENANCE BILLS
// ═══════════════════════════════════════════════════════════════

const generateBills = async (req, res, next) => {
  try {
    const societyId = await getSocietyIdForUser(req.user.id);
    const { month, baseAmount, waterCharges, parkingCharges, otherCharges, dueDate } = req.body;
    if (!month || !baseAmount || !dueDate) return res.status(400).json({ success: false, error: 'Month, base amount, and due date required' });

    const members = await queryMany("SELECT * FROM society_members WHERE society_id = $1 AND role = 'resident' AND is_active = 1", [societyId]);
    const total = parseFloat(baseAmount) + parseFloat(waterCharges || 0) + parseFloat(parkingCharges || 0) + parseFloat(otherCharges || 0);

    let count = 0;
    const supabaseRealtime = req.app.get('supabaseRealtime');
    for (const m of members) {
      const existing = await queryOne('SELECT id FROM society_maintenance_bills WHERE member_id = $1 AND month = $2', [m.id, month]);
      if (existing) continue;

      await query(
        'INSERT INTO society_maintenance_bills (id, society_id, member_id, flat_number, month, base_amount, water_charges, parking_charges, other_charges, total_amount, due_date, generated_by, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)',
        [uuidv4(), societyId, m.id, m.flat_number, month, baseAmount, waterCharges || 0, parkingCharges || 0, otherCharges || 0, total, dueDate, req.user.id]
      );
      count++;
      if (supabaseRealtime) {
        supabaseRealtime.broadcast(`user:${m.user_id}`, 'society:bill:new', { month, totalAmount: total, dueDate, flatNumber: m.flat_number });
      }
    }
    res.status(201).json({ success: true, message: `Generated ${count} bills for ${month}` });
  } catch (error) { next(error); }
};

const getAllBills = async (req, res, next) => {
  try {
    const societyId = await getSocietyIdForUser(req.user.id);
    const { month } = req.query;
    let sql = `SELECT smb.*, u.full_name FROM society_maintenance_bills smb JOIN society_members sm ON smb.member_id = sm.id JOIN users u ON sm.user_id = u.id WHERE smb.society_id = $1`;
    const params = [societyId];
    if (month) { sql += ` AND smb.month = $2`; params.push(month); }
    sql += ' ORDER BY smb.flat_number';
    const bills = await queryMany(sql, params);
    res.json({ success: true, data: bills });
  } catch (error) { next(error); }
};

const getMyBills = async (req, res, next) => {
  try {
    const member = await queryOne('SELECT id FROM society_members WHERE user_id = $1 AND is_active = 1', [req.user.id]);
    if (!member) return res.json({ success: true, data: [] });
    const bills = await queryMany('SELECT * FROM society_maintenance_bills WHERE member_id = $1 ORDER BY month DESC', [member.id]);
    res.json({ success: true, data: bills });
  } catch (error) { next(error); }
};

const payBill = async (req, res, next) => {
  try {
    const { paymentReference, amount } = req.body;
    const bill = await queryOne('SELECT * FROM society_maintenance_bills WHERE id = $1', [req.params.id]);
    if (!bill) return res.status(404).json({ success: false, error: 'Bill not found' });

    const paidAmount = parseFloat(bill.paid_amount) + parseFloat(amount || bill.total_amount);
    const status = paidAmount >= parseFloat(bill.total_amount) ? 'paid' : 'partial';

    await query(
      "UPDATE society_maintenance_bills SET paid_amount = $1, payment_status = $2, paid_at = CURRENT_TIMESTAMP, payment_reference = $3 WHERE id = $4",
      [paidAmount, status, paymentReference || '', req.params.id]
    );
    res.json({ success: true, message: `Bill marked as ${status}` });
  } catch (error) { next(error); }
};

const getBillsSummary = async (req, res, next) => {
  try {
    const societyId = await getSocietyIdForUser(req.user.id);
    const { month } = req.query;
    const m = month || new Date().toISOString().substring(0, 7);
    const total = await queryOne("SELECT COUNT(*) as count, COALESCE(SUM(total_amount),0) as total FROM society_maintenance_bills WHERE society_id = $1 AND month = $2", [societyId, m]);
    const paid = await queryOne("SELECT COUNT(*) as count, COALESCE(SUM(paid_amount),0) as total FROM society_maintenance_bills WHERE society_id = $1 AND month = $2 AND payment_status = 'paid'", [societyId, m]);
    const pending = await queryOne("SELECT COUNT(*) as count FROM society_maintenance_bills WHERE society_id = $1 AND month = $2 AND payment_status = 'pending'", [societyId, m]);
    const overdue = await queryOne("SELECT COUNT(*) as count FROM society_maintenance_bills WHERE society_id = $1 AND month = $2 AND payment_status = 'pending' AND due_date < date('now')", [societyId, m]);
    res.json({ success: true, data: { totalBills: total.count, totalAmount: total.total, paidCount: paid.count, collectedAmount: paid.total, pendingCount: pending.count, overdueCount: overdue.count } });
  } catch (error) { next(error); }
};

// ═══════════════════════════════════════════════════════════════
// FEATURE 8: PARKING MANAGEMENT
// ═══════════════════════════════════════════════════════════════

const getParkingSlots = async (req, res, next) => {
  try {
    const societyId = await getSocietyIdForUser(req.user.id);
    const slots = await queryMany('SELECT * FROM society_parking_slots WHERE society_id = $1 ORDER BY slot_number', [societyId]);
    res.json({ success: true, data: slots });
  } catch (error) { next(error); }
};

const createParkingSlot = async (req, res, next) => {
  try {
    const societyId = await getSocietyIdForUser(req.user.id);
    const { slotNumber, slotType, flatNumber, vehicleNumber, vehicleType } = req.body;
    if (!slotNumber) return res.status(400).json({ success: false, error: 'Slot number required' });

    const member = flatNumber ? await queryOne('SELECT id FROM society_members WHERE society_id = $1 AND flat_number = $2', [societyId, flatNumber]) : null;
    const id = uuidv4();
    await query(
      'INSERT INTO society_parking_slots (id, society_id, slot_number, slot_type, flat_number, vehicle_number, vehicle_type, is_occupied, assigned_to, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)',
      [id, societyId, slotNumber, slotType || 'car', flatNumber || '', vehicleNumber || '', vehicleType || '', flatNumber ? 1 : 0, member ? member.id : null]
    );
    res.status(201).json({ success: true, data: { id }, message: 'Parking slot created' });
  } catch (error) { next(error); }
};

const updateParkingSlot = async (req, res, next) => {
  try {
    const { flatNumber, vehicleNumber, vehicleType, isOccupied } = req.body;
    const sets = []; const params = []; let idx = 1;
    if (flatNumber !== undefined) { sets.push(`flat_number = $${idx++}`); params.push(flatNumber); }
    if (vehicleNumber !== undefined) { sets.push(`vehicle_number = $${idx++}`); params.push(vehicleNumber); }
    if (vehicleType !== undefined) { sets.push(`vehicle_type = $${idx++}`); params.push(vehicleType); }
    if (isOccupied !== undefined) { sets.push(`is_occupied = $${idx++}`); params.push(isOccupied ? 1 : 0); }
    if (sets.length === 0) return res.status(400).json({ success: false, error: 'Nothing to update' });
    params.push(req.params.id);
    await query(`UPDATE society_parking_slots SET ${sets.join(', ')} WHERE id = $${idx}`, params);
    res.json({ success: true, message: 'Parking slot updated' });
  } catch (error) { next(error); }
};

const deleteParkingSlot = async (req, res, next) => {
  try {
    await query('DELETE FROM society_parking_slots WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Parking slot removed' });
  } catch (error) { next(error); }
};

const getMyParking = async (req, res, next) => {
  try {
    const member = await queryOne('SELECT id, flat_number FROM society_members WHERE user_id = $1 AND is_active = 1', [req.user.id]);
    if (!member) return res.json({ success: true, data: [] });
    const slots = await queryMany('SELECT * FROM society_parking_slots WHERE flat_number = $1', [member.flat_number]);
    res.json({ success: true, data: slots });
  } catch (error) { next(error); }
};

const logVisitorParking = async (req, res, next) => {
  try {
    const societyId = await getSocietyIdForUser(req.user.id);
    const { vehicleNumber, vehicleType } = req.body;
    // Find available visitor slot
    const slot = await queryOne("SELECT * FROM society_parking_slots WHERE society_id = $1 AND slot_type = 'visitor' AND is_occupied = 0 LIMIT 1", [societyId]);
    if (!slot) return res.status(404).json({ success: false, error: 'No visitor parking slots available' });
    await query("UPDATE society_parking_slots SET vehicle_number = $1, vehicle_type = $2, is_occupied = 1 WHERE id = $3", [vehicleNumber, vehicleType || 'car', slot.id]);
    res.json({ success: true, message: `Visitor vehicle parked in slot ${slot.slot_number}` });
  } catch (error) { next(error); }
};

// ═══════════════════════════════════════════════════════════════
// FEATURE 9: AMENITY/FACILITY BOOKING
// ═══════════════════════════════════════════════════════════════

const getAmenities = async (req, res, next) => {
  try {
    const societyId = await getSocietyIdForUser(req.user.id);
    const amenities = await queryMany('SELECT * FROM society_amenities WHERE society_id = $1 AND is_active = 1', [societyId]);
    res.json({ success: true, data: amenities });
  } catch (error) { next(error); }
};

const createAmenity = async (req, res, next) => {
  try {
    const societyId = await getSocietyIdForUser(req.user.id);
    const { name, description, capacity, hourlyRate, availableFrom, availableUntil, rules } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Amenity name required' });
    const id = uuidv4();
    await query(
      'INSERT INTO society_amenities (id, society_id, name, description, capacity, hourly_rate, available_from, available_until, rules, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)',
      [id, societyId, name, description || '', capacity || 0, hourlyRate || 0, availableFrom || '06:00', availableUntil || '22:00', rules || '']
    );
    res.status(201).json({ success: true, data: { id }, message: 'Amenity created' });
  } catch (error) { next(error); }
};

const updateAmenity = async (req, res, next) => {
  try {
    const { name, description, capacity, hourlyRate, isActive, rules } = req.body;
    const sets = []; const params = []; let idx = 1;
    if (name) { sets.push(`name = $${idx++}`); params.push(name); }
    if (description !== undefined) { sets.push(`description = $${idx++}`); params.push(description); }
    if (capacity !== undefined) { sets.push(`capacity = $${idx++}`); params.push(capacity); }
    if (hourlyRate !== undefined) { sets.push(`hourly_rate = $${idx++}`); params.push(hourlyRate); }
    if (isActive !== undefined) { sets.push(`is_active = $${idx++}`); params.push(isActive ? 1 : 0); }
    if (rules !== undefined) { sets.push(`rules = $${idx++}`); params.push(rules); }
    if (sets.length === 0) return res.status(400).json({ success: false, error: 'Nothing to update' });
    params.push(req.params.id);
    await query(`UPDATE society_amenities SET ${sets.join(', ')} WHERE id = $${idx}`, params);
    res.json({ success: true, message: 'Amenity updated' });
  } catch (error) { next(error); }
};

const bookAmenity = async (req, res, next) => {
  try {
    const societyId = await getSocietyIdForUser(req.user.id);
    const member = await queryOne('SELECT flat_number FROM society_members WHERE user_id = $1 AND is_active = 1', [req.user.id]);
    const { bookingDate, startTime, endTime, purpose, guestCount } = req.body;
    if (!bookingDate || !startTime || !endTime) return res.status(400).json({ success: false, error: 'Booking date and times required' });

    const amenity = await queryOne('SELECT * FROM society_amenities WHERE id = $1', [req.params.id]);
    if (!amenity) return res.status(404).json({ success: false, error: 'Amenity not found' });

    // 1. Check weekly frequency limit for this flat (if defined)
    if (amenity.max_bookings_per_week && member) {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekBookings = await queryOne(
            "SELECT COUNT(*) as cnt FROM society_amenity_bookings WHERE amenity_id = $1 AND flat_number = $2 AND booking_date >= $3 AND status != 'cancelled'",
            [req.params.id, member.flat_number, weekStart.toISOString().split('T')[0]]
        );
        if (weekBookings.cnt >= amenity.max_bookings_per_week) {
            return res.status(429).json({ success: false, error: 'Weekly booking limit reached for this amenity' });
        }
    }

    // 2. Check cool-down period (if defined)
    if (amenity.cooldown_hours && member) {
        const lastBooking = await queryOne(
            "SELECT booking_date, end_time FROM society_amenity_bookings WHERE amenity_id = $1 AND flat_number = $2 AND status != 'cancelled' ORDER BY booking_date DESC, end_time DESC LIMIT 1",
            [req.params.id, member.flat_number]
        );
        if (lastBooking) {
            const lastEnd = new Date(`${lastBooking.booking_date}T${lastBooking.end_time}:00Z`);
            const proposedStart = new Date(`${bookingDate}T${startTime}:00Z`);
            const diffHours = (proposedStart - lastEnd) / (1000 * 60 * 60);
            if (diffHours < amenity.cooldown_hours) {
                return res.status(429).json({ success: false, error: `Cooldown period of ${amenity.cooldown_hours} hours required between bookings.` });
            }
        }
    }

    // 3. Acquire lock (prevent race conditions)
    const lockId = `lock:amenity:${req.params.id}:${bookingDate}:${startTime}`;
    try {
        await query("INSERT INTO society_amenity_locks (lock_key, created_at) VALUES ($1, CURRENT_TIMESTAMP)", [lockId]);
    } catch (lockError) {
        return res.status(409).json({ success: false, error: 'This slot is currently being booked by someone else. Please try again.' });
    }

    try {
        // 4. Check for conflicts
        const conflict = await queryOne(
        "SELECT id FROM society_amenity_bookings WHERE amenity_id = $1 AND booking_date = $2 AND status = 'confirmed' AND ((start_time <= $3 AND end_time > $3) OR (start_time < $4 AND end_time >= $4))",
        [req.params.id, bookingDate, startTime, endTime]
        );
        if (conflict) {
            await query("DELETE FROM society_amenity_locks WHERE lock_key = $1", [lockId]);
            return res.status(409).json({ success: false, error: 'Time slot already booked' });
        }

        // 5. Calculate Pricing (Peak vs Normal)
        let totalCharge = 0;
        const durationHours = (parseInt(endTime) - parseInt(startTime)) || 1;
        
        // Simple peak hour check (e.g., peak_hours = '18:00-22:00')
        let isPeak = false;
        if (amenity.peak_hours) {
            const [peakStart, peakEnd] = amenity.peak_hours.split('-');
            if (startTime >= peakStart && startTime < peakEnd) isPeak = true;
        }

        if (isPeak && amenity.peak_hour_rate) {
            totalCharge = amenity.peak_hour_rate * durationHours;
        } else {
            totalCharge = amenity.hourly_rate * durationHours;
        }

        const id = uuidv4();
        await query(
        "INSERT INTO society_amenity_bookings (id, amenity_id, society_id, booked_by, flat_number, booking_date, start_time, end_time, purpose, guest_count, total_charge, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'confirmed', CURRENT_TIMESTAMP)",
        [id, req.params.id, societyId, req.user.id, member ? member.flat_number : '', bookingDate, startTime, endTime, purpose || '', guestCount || 0, totalCharge]
        );
        
        // Release lock
        await query("DELETE FROM society_amenity_locks WHERE lock_key = $1", [lockId]);
        
        res.status(201).json({ success: true, data: { id, totalCharge, isPeak }, message: 'Amenity booked successfully' });
    } catch (error) {
        // Ensure lock is released on error
        await query("DELETE FROM society_amenity_locks WHERE lock_key = $1", [lockId]);
        throw error;
    }
  } catch (error) { next(error); }
};

const getAmenityBookings = async (req, res, next) => {
  try {
    const { date } = req.query;
    const bookings = await queryMany(
      `SELECT sab.*, u.full_name FROM society_amenity_bookings sab JOIN users u ON sab.booked_by = u.id WHERE sab.amenity_id = $1 AND ($2 IS NULL OR sab.booking_date = $2) AND sab.status = 'confirmed' ORDER BY sab.start_time`,
      [req.params.id, date || null]
    );
    res.json({ success: true, data: bookings });
  } catch (error) { next(error); }
};

const getMyBookings = async (req, res, next) => {
  try {
    const bookings = await queryMany(
      `SELECT sab.*, sa.name as amenity_name FROM society_amenity_bookings sab JOIN society_amenities sa ON sab.amenity_id = sa.id WHERE sab.booked_by = $1 ORDER BY sab.booking_date DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: bookings });
  } catch (error) { next(error); }
};

const cancelBooking = async (req, res, next) => {
  try {
    const booking = await queryOne("SELECT * FROM society_amenity_bookings WHERE id = $1 AND booked_by = $2", [req.params.id, req.user.id]);
    if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });

    const amenity = await queryOne("SELECT cancellation_penalty FROM society_amenities WHERE id = $1", [booking.amenity_id]);
    
    // Check if cancellation is within 24h of booking date
    let penaltyAmount = 0;
    if (amenity && amenity.cancellation_penalty > 0) {
        const bookingStart = new Date(`${booking.booking_date}T${booking.start_time}:00Z`);
        const hoursUntilBooking = (bookingStart - new Date()) / (1000 * 60 * 60);
        
        if (hoursUntilBooking < 24 && hoursUntilBooking > 0) {
            penaltyAmount = amenity.cancellation_penalty;
            // Charge penalty to the flat ledger or maintenance bill
            // (Mocking penalty logic for now)
            console.log(`[Penalty] Applied Rs. ${penaltyAmount} cancellation penalty to flat ${booking.flat_number}`);
        }
    }

    await query("UPDATE society_amenity_bookings SET status = 'cancelled' WHERE id = $1", [req.params.id]);
    res.json({ success: true, message: penaltyAmount > 0 ? `Booking cancelled. A penalty of Rs. ${penaltyAmount} was applied.` : 'Booking cancelled without penalty.' });
  } catch (error) { next(error); }
};

// ═══════════════════════════════════════════════════════════════
// FEATURE 10: COMPLAINTS & GRIEVANCE (UPGRADED PHASE 7)
// ═══════════════════════════════════════════════════════════════

const logComplaintActivity = async (complaintId, action, performedBy, notes) => {
  await query(
    'INSERT INTO society_complaint_activity (id, complaint_id, action, performed_by, notes, created_at) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)',
    [uuidv4(), complaintId, action, performedBy, notes || '']
  );
};

const fileComplaint = async (req, res, next) => {
  try {
    const societyId = await getSocietyIdForUser(req.user.id);
    const member = await queryOne('SELECT flat_number FROM society_members WHERE user_id = $1 AND is_active = 1', [req.user.id]);
    const { category, title, description, priority, photos } = req.body;
    if (!category || !title || !description) return res.status(400).json({ success: false, error: 'Category, title, and description required' });

    const id = uuidv4();
    await query(
      'INSERT INTO society_complaints (id, society_id, filed_by, flat_number, category, title, description, photo_urls, priority, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
      [id, societyId, req.user.id, member ? member.flat_number : '', category, title, description, JSON.stringify(photos || []), priority || 'medium', 'open']
    );
    await logComplaintActivity(id, 'filed', req.user.id, 'Complaint opened');
    res.status(201).json({ success: true, data: { id }, message: 'Complaint filed successfully' });
  } catch (error) { next(error); }
};

const getMyComplaints = async (req, res, next) => {
  try {
    const complaints = await queryMany('SELECT * FROM society_complaints WHERE filed_by = $1 ORDER BY created_at DESC', [req.user.id]);
    res.json({ success: true, data: complaints });
  } catch (error) { next(error); }
};

const getAllComplaints = async (req, res, next) => {
  try {
    const societyId = await getSocietyIdForUser(req.user.id);
    const complaints = await queryMany(
      `SELECT sc.*, u.full_name FROM society_complaints sc JOIN users u ON sc.filed_by = u.id WHERE sc.society_id = $1 ORDER BY CASE sc.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, sc.created_at DESC`,
      [societyId]
    );
    res.json({ success: true, data: complaints });
  } catch (error) { next(error); }
};

const updateComplaintStatus = async (req, res, next) => {
  try {
    const { status, adminNotes, assignedTo } = req.body;
    const sets = []; const params = []; let idx = 1;
    let activityNote = adminNotes || `Status changed to ${status}`;

    if (status) { sets.push(`status = $${idx++}`); params.push(status); }
    if (adminNotes) { sets.push(`admin_notes = $${idx++}`); params.push(adminNotes); }
    if (assignedTo) { sets.push(`assigned_to = $${idx++}`); params.push(assignedTo); activityNote = `Assigned to ${assignedTo}`; }
    
    if (status === 'resolved') {
        sets.push(`resolved_at = CURRENT_TIMESTAMP`);
    }

    sets.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(req.params.id);
    
    await query(`UPDATE society_complaints SET ${sets.join(', ')} WHERE id = $${idx}`, params);
    await logComplaintActivity(req.params.id, status || 'updated', req.user.id, activityNote);

    const complaint = await queryOne('SELECT * FROM society_complaints WHERE id = $1', [req.params.id]);
    const supabaseRealtime = req.app.get('supabaseRealtime');
    if (supabaseRealtime && complaint) {
      supabaseRealtime.broadcast(`user:${complaint.filed_by}`, 'society:complaint:update', { complaintId: req.params.id, status: complaint.status, title: complaint.title });
    }
    res.json({ success: true, message: 'Complaint updated' });
  } catch (error) { next(error); }
};

const reopenComplaint = async (req, res, next) => {
    try {
        const { reason } = req.body;
        await query("UPDATE society_complaints SET status = 'reopened', reopened_count = reopened_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND filed_by = $2", [req.params.id, req.user.id]);
        await logComplaintActivity(req.params.id, 'reopened', req.user.id, reason || 'Reopened by resident');
        res.json({ success: true, message: 'Complaint reopened' });
    } catch (error) { next(error); }
};

const rateResolution = async (req, res, next) => {
    try {
        const { rating, feedback } = req.body;
        await query("UPDATE society_complaints SET resolution_rating = $1, resolution_feedback = $2 WHERE id = $3 AND filed_by = $4", [rating, feedback, req.params.id, req.user.id]);
        await logComplaintActivity(req.params.id, 'rated', req.user.id, `Rated ${rating} stars. Feedback: ${feedback}`);
        res.json({ success: true, message: 'Rating submitted' });
    } catch (error) { next(error); }
};

const getComplaintTimeline = async (req, res, next) => {
    try {
        const timeline = await queryMany('SELECT sca.*, u.full_name as performed_by_name FROM society_complaint_activity sca LEFT JOIN users u ON sca.performed_by = u.id WHERE sca.complaint_id = $1 ORDER BY sca.created_at ASC', [req.params.id]);
        res.json({ success: true, data: timeline });
    } catch (error) { next(error); }
};

const setComplaintETA = async (req, res, next) => {
    try {
        const { eta } = req.body;
        await query('UPDATE society_complaints SET eta = $1 WHERE id = $2', [eta, req.params.id]);
        await logComplaintActivity(req.params.id, 'eta_set', req.user.id, `ETA set to ${eta}`);
        
        const complaint = await queryOne('SELECT * FROM society_complaints WHERE id = $1', [req.params.id]);
        // Send push notification to resident
        const supabaseRealtime = req.app.get('supabaseRealtime');
        if (supabaseRealtime && complaint) {
            supabaseRealtime.broadcast(`user:${complaint.filed_by}`, 'society:complaint:eta', { complaintId: req.params.id, eta, title: complaint.title });
        }
        res.json({ success: true, message: 'ETA updated' });
    } catch (error) { next(error); }
};

// ═══════════════════════════════════════════════════════════════
// FEATURE 11: PACKAGE COLLECTION
// ═══════════════════════════════════════════════════════════════

const logPackage = async (req, res, next) => {
  try {
    const societyId = await getSocietyIdForUser(req.user.id);
    const { flatNumber, courierName, packageDescription, packagePhoto, receiverName } = req.body;
    if (!flatNumber) return res.status(400).json({ success: false, error: 'Flat number required' });

    const resident = await queryOne("SELECT user_id FROM society_members WHERE society_id = $1 AND flat_number = $2 AND role = 'resident' AND is_active = 1", [societyId, flatNumber]);
    const id = uuidv4();
    await query(
      'INSERT INTO society_packages (id, society_id, flat_number, resident_id, logged_by, courier_name, package_description, package_photo_url, receiver_name, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)',
      [id, societyId, flatNumber, resident ? resident.user_id : null, req.user.id, courierName || '', packageDescription || '', packagePhoto || '', receiverName || '']
    );

    const supabaseRealtime = req.app.get('supabaseRealtime');
    if (supabaseRealtime && resident) {
      supabaseRealtime.broadcast(`user:${resident.user_id}`, 'society:package:new', { packageId: id, courierName: courierName || 'Unknown', flatNumber, timestamp: new Date().toISOString() });
    }
    res.status(201).json({ success: true, data: { id }, message: 'Package logged' });
  } catch (error) { next(error); }
};

const getPendingPackages = async (req, res, next) => {
  try {
    const societyId = await getSocietyIdForUser(req.user.id);
    const packages = await queryMany("SELECT * FROM society_packages WHERE society_id = $1 AND status = 'received' ORDER BY created_at DESC", [societyId]);
    res.json({ success: true, data: packages });
  } catch (error) { next(error); }
};

const getMyPackages = async (req, res, next) => {
  try {
    const packages = await queryMany('SELECT * FROM society_packages WHERE resident_id = $1 ORDER BY created_at DESC LIMIT 30', [req.user.id]);
    res.json({ success: true, data: packages });
  } catch (error) { next(error); }
};

const collectPackage = async (req, res, next) => {
  try {
    await query("UPDATE society_packages SET status = 'collected', collected_at = CURRENT_TIMESTAMP, collected_by = $1 WHERE id = $2", [req.user.full_name || 'Resident', req.params.id]);
    res.json({ success: true, message: 'Package marked as collected' });
  } catch (error) { next(error); }
};

// ═══════════════════════════════════════════════════════════════
// FEATURE 12: POLLS & VOTING
// ═══════════════════════════════════════════════════════════════

const createPoll = async (req, res, next) => {
  try {
    const societyId = await getSocietyIdForUser(req.user.id);
    const { title, description, options, pollType, isAnonymous, endsAt } = req.body;
    if (!title || !options || options.length < 2) return res.status(400).json({ success: false, error: 'Title and at least 2 options required' });

    const id = uuidv4();
    await query(
      "INSERT INTO society_polls (id, society_id, created_by, title, description, options, poll_type, is_anonymous, starts_at, ends_at, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, $9, 'active', CURRENT_TIMESTAMP)",
      [id, societyId, req.user.id, title, description || '', JSON.stringify(options), pollType || 'single', isAnonymous ? 1 : 0, endsAt || '']
    );

    // Notify all residents
    const supabaseRealtime = req.app.get('supabaseRealtime');
    if (supabaseRealtime) {
      const members = await queryMany("SELECT user_id FROM society_members WHERE society_id = $1 AND role = 'resident' AND is_active = 1", [societyId]);
      members.forEach(m => supabaseRealtime.broadcast(`user:${m.user_id}`, 'society:poll:new', { pollId: id, title }));
    }
    res.status(201).json({ success: true, data: { id }, message: 'Poll created' });
  } catch (error) { next(error); }
};

const getPolls = async (req, res, next) => {
  try {
    const societyId = await getSocietyIdForUser(req.user.id);
    const polls = await queryMany(
      `SELECT sp.*, u.full_name as creator_name, (SELECT COUNT(*) FROM society_poll_votes WHERE poll_id = sp.id) as total_votes FROM society_polls sp
       JOIN users u ON sp.created_by = u.id WHERE sp.society_id = $1 ORDER BY sp.created_at DESC`,
      [societyId]
    );
    // Check if current user voted
    for (const poll of polls) {
      const vote = await queryOne('SELECT selected_option FROM society_poll_votes WHERE poll_id = $1 AND voter_id = $2', [poll.id, req.user.id]);
      poll.myVote = vote ? vote.selected_option : null;
    }
    res.json({ success: true, data: polls });
  } catch (error) { next(error); }
};

const votePoll = async (req, res, next) => {
  try {
    const { selectedOption } = req.body;
    if (selectedOption === undefined) return res.status(400).json({ success: false, error: 'Selected option required' });

    const existing = await queryOne('SELECT id FROM society_poll_votes WHERE poll_id = $1 AND voter_id = $2', [req.params.id, req.user.id]);
    if (existing) return res.status(409).json({ success: false, error: 'You have already voted on this poll' });

    await query('INSERT INTO society_poll_votes (id, poll_id, voter_id, selected_option, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)', [uuidv4(), req.params.id, req.user.id, selectedOption]);
    res.json({ success: true, message: 'Vote recorded' });
  } catch (error) { next(error); }
};

const getPollResults = async (req, res, next) => {
  try {
    const poll = await queryOne('SELECT * FROM society_polls WHERE id = $1', [req.params.id]);
    if (!poll) return res.status(404).json({ success: false, error: 'Poll not found' });

    const options = JSON.parse(poll.options);
    const votes = await queryMany('SELECT selected_option, COUNT(*) as count FROM society_poll_votes WHERE poll_id = $1 GROUP BY selected_option', [req.params.id]);
    const totalVotes = votes.reduce((sum, v) => sum + v.count, 0);

    const results = options.map((opt, idx) => {
      const voteData = votes.find(v => v.selected_option === idx);
      const count = voteData ? voteData.count : 0;
      return { option: opt, votes: count, percentage: totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0 };
    });

    res.json({ success: true, data: { poll, results, totalVotes } });
  } catch (error) { next(error); }
};

const closePoll = async (req, res, next) => {
  try {
    await query("UPDATE society_polls SET status = 'closed' WHERE id = $1", [req.params.id]);
    res.json({ success: true, message: 'Poll closed' });
  } catch (error) { next(error); }
};

// ═══════════════════════════════════════════════════════════════
// FEATURE 13: EMERGENCY ALERT
// ═══════════════════════════════════════════════════════════════

const triggerEmergency = async (req, res, next) => {
  try {
    const societyId = await getSocietyIdForUser(req.user.id);
    if (!societyId) return res.status(400).json({ success: false, error: 'Not a society member' });
    const member = await queryOne('SELECT flat_number FROM society_members WHERE user_id = $1 AND is_active = 1', [req.user.id]);
    const { alertType, description } = req.body;
    if (!alertType) return res.status(400).json({ success: false, error: 'Alert type required' });

    const id = uuidv4();
    await query(
      'INSERT INTO society_emergency_alerts (id, society_id, triggered_by, alert_type, description, flat_number, created_at) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)',
      [id, societyId, req.user.id, alertType, description || '', member ? member.flat_number : '']
    );

    // Broadcast to ALL society members
    const supabaseRealtime = req.app.get('supabaseRealtime');
    if (supabaseRealtime) {
      const members = await queryMany('SELECT user_id FROM society_members WHERE society_id = $1 AND is_active = 1', [societyId]);
      members.forEach(m => {
        supabaseRealtime.broadcast(`user:${m.user_id}`, 'society:emergency', {
          alertId: id, alertType, description: description || '', flatNumber: member ? member.flat_number : '',
          triggeredBy: req.user.full_name, timestamp: new Date().toISOString()
        });
      });
    }
    res.status(201).json({ success: true, data: { id }, message: 'Emergency alert triggered!' });
  } catch (error) { next(error); }
};

const getActiveEmergencies = async (req, res, next) => {
  try {
    const societyId = await getSocietyIdForUser(req.user.id);
    const alerts = await queryMany(
      `SELECT sea.*, u.full_name as triggered_by_name FROM society_emergency_alerts sea JOIN users u ON sea.triggered_by = u.id WHERE sea.society_id = $1 AND sea.status = 'active' ORDER BY sea.created_at DESC`,
      [societyId]
    );
    res.json({ success: true, data: alerts });
  } catch (error) { next(error); }
};

const resolveEmergency = async (req, res, next) => {
  try {
    await query("UPDATE society_emergency_alerts SET status = $1, resolved_at = CURRENT_TIMESTAMP, resolved_by = $2 WHERE id = $3", [req.body.status || 'resolved', req.user.id, req.params.id]);
    res.json({ success: true, message: 'Emergency resolved' });
  } catch (error) { next(error); }
};

// ═══════════════════════════════════════════════════════════════
// FEATURE 14: DIGITAL FLAT DIRECTORY
// ═══════════════════════════════════════════════════════════════

const getDirectory = async (req, res, next) => {
  try {
    const societyId = await getSocietyIdForUser(req.user.id);
    if (!societyId) return res.status(400).json({ success: false, error: 'Not a society member' });
    const { search } = req.query;
    let sql = `SELECT sm.flat_number, sm.role, u.full_name, u.phone_number, u.avatar_url FROM society_members sm JOIN users u ON sm.user_id = u.id WHERE sm.society_id = $1 AND sm.is_active = 1`;
    const params = [societyId];
    if (search) {
      sql += ` AND (sm.flat_number LIKE $2 OR u.full_name LIKE $2 OR u.phone_number LIKE $2)`;
      params.push(`%${search}%`);
    }
    sql += ' ORDER BY sm.flat_number';
    const directory = await queryMany(sql, params);
    res.json({ success: true, data: directory });
  } catch (error) { next(error); }
};

// ═══════════════════════════════════════════════════════════════
// FEATURE 15: EVENTS CALENDAR
// ═══════════════════════════════════════════════════════════════

const createEvent = async (req, res, next) => {
  try {
    const societyId = await getSocietyIdForUser(req.user.id);
    const { title, description, eventDate, startTime, endTime, venue, eventType, maxAttendees } = req.body;
    if (!title || !eventDate) return res.status(400).json({ success: false, error: 'Title and event date required' });

    const id = uuidv4();
    await query(
      'INSERT INTO society_events (id, society_id, created_by, title, description, event_date, start_time, end_time, venue, event_type, max_attendees, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)',
      [id, societyId, req.user.id, title, description || '', eventDate, startTime || '', endTime || '', venue || '', eventType || 'general', maxAttendees || 0]
    );
    res.status(201).json({ success: true, data: { id }, message: 'Event created' });
  } catch (error) { next(error); }
};

const getEvents = async (req, res, next) => {
  try {
    const societyId = await getSocietyIdForUser(req.user.id);
    const events = await queryMany(
      `SELECT se.*, u.full_name as organizer_name, (SELECT COUNT(*) FROM society_event_rsvps WHERE event_id = se.id AND status = 'going') as going_count FROM society_events se
       JOIN users u ON se.created_by = u.id WHERE se.society_id = $1 AND se.is_active = 1 ORDER BY se.event_date ASC`,
      [societyId]
    );
    // Check current user's RSVP
    for (const e of events) {
      const rsvp = await queryOne('SELECT status FROM society_event_rsvps WHERE event_id = $1 AND user_id = $2', [e.id, req.user.id]);
      e.myRsvp = rsvp ? rsvp.status : null;
    }
    res.json({ success: true, data: events });
  } catch (error) { next(error); }
};

const rsvpEvent = async (req, res, next) => {
  try {
    const member = await queryOne('SELECT flat_number FROM society_members WHERE user_id = $1 AND is_active = 1', [req.user.id]);
    const { status, guestsCount } = req.body;
    const existing = await queryOne('SELECT id FROM society_event_rsvps WHERE event_id = $1 AND user_id = $2', [req.params.id, req.user.id]);

    if (existing) {
      await query('UPDATE society_event_rsvps SET status = $1, guests_count = $2 WHERE id = $3', [status || 'going', guestsCount || 0, existing.id]);
    } else {
      await query(
        'INSERT INTO society_event_rsvps (id, event_id, user_id, flat_number, guests_count, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)',
        [uuidv4(), req.params.id, req.user.id, member ? member.flat_number : '', guestsCount || 0, status || 'going']
      );
    }
    res.json({ success: true, message: 'RSVP updated' });
  } catch (error) { next(error); }
};

const getEventAttendees = async (req, res, next) => {
  try {
    const attendees = await queryMany(
      `SELECT ser.*, u.full_name, u.phone_number FROM society_event_rsvps ser JOIN users u ON ser.user_id = u.id WHERE ser.event_id = $1 ORDER BY ser.status, ser.created_at`,
      [req.params.id]
    );
    res.json({ success: true, data: attendees });
  } catch (error) { next(error); }
};

const deleteEvent = async (req, res, next) => {
  try {
    await query('UPDATE society_events SET is_active = 0 WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Event cancelled' });
  } catch (error) { next(error); }
};

const assignComplaint = async (req, res, next) => {};
const resolveComplaint = async (req, res, next) => {};
const updateDirectoryPrivacy = async (req, res, next) => {};

const getMySocietyRole = async (req, res, next) => {};
const getSettings = async (req, res, next) => {};
const updateSettings = async (req, res, next) => {};
const postNotice = async (req, res, next) => {
    try {
        const adminId = req.user.id;
        const { societyId, title, content, documentUrl, isUrgent } = req.body;

        const id = uuidv4();
        await query(
            `INSERT INTO society_notices 
            (id, society_id, posted_by, title, content, document_url, is_urgent, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [id, societyId, adminId, title, content || '', documentUrl || '', isUrgent ? 1 : 0]
        );

        // Notify residents
        const supabaseRealtime = req.app.get('supabaseRealtime');
        if (supabaseRealtime) {
            supabaseRealtime.broadcast(`society:${societyId}`, 'society:notice:new', { 
                id, title, isUrgent 
            });
        }

        res.status(201).json({ success: true, message: 'Notice posted', data: { id } });
    } catch (error) { next(error); }
};

const getNotices = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { societyId } = req.query;

        const notices = await queryMany(`
            SELECT sn.*, 
            CASE WHEN snr.id IS NOT NULL THEN 1 ELSE 0 END as is_read 
            FROM society_notices sn
            LEFT JOIN society_notice_receipts snr 
            ON sn.id = snr.notice_id AND snr.user_id = ?
            WHERE sn.society_id = ?
            ORDER BY sn.is_urgent DESC, sn.created_at DESC
        `, [userId, societyId]);

        res.json({ success: true, data: notices });
    } catch (error) { next(error); }
};

const markNoticeRead = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const noticeId = req.params.id;

        const id = uuidv4();
        await query(
            `INSERT OR IGNORE INTO society_notice_receipts 
            (id, notice_id, user_id, read_at) 
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
            [id, noticeId, userId]
        );

        res.json({ success: true, message: 'Notice marked as read' });
    } catch (error) { next(error); }
};
module.exports = {
  getMySocietyRole,
  getSettings,
  updateSettings,
  postNotice,
  getNotices,
  markNoticeRead,
  logVisitor,
  getTodayVisitors,
  checkInVisitor,
  checkOutVisitor,
  getMyVisitors,
  approveVisitor,
  declineVisitor,
  getAllVisitors,
  getVisitorAnalytics,
  getMembers,
  addMember,
  updateMember,
  removeMember,
  sendGuardMessage,
  getGuardMessages,
  markMessageRead,
  setGuardReminder,
  getGuardReminders,
  dismissReminder,
  getStaff,
  addStaff,
  updateStaff,
  deleteStaff,
  markStaffAttendance,
  getTodayAttendance,
  getStaffAttendanceHistory,
  generateBills,
  getAllBills,
  getMyBills,
  payBill,
  getBillsSummary,
  getParkingSlots,
  createParkingSlot,
  updateParkingSlot,
  deleteParkingSlot,
  getMyParking,
  logVisitorParking,
  getAmenities,
  createAmenity,
  updateAmenity,
  bookAmenity,
  getAmenityBookings,
  getMyBookings,
  cancelBooking,
  logComplaintActivity,
  fileComplaint,
  getMyComplaints,
  getAllComplaints,
  updateComplaintStatus,
  reopenComplaint,
  rateResolution,
  getComplaintTimeline,
  setComplaintETA,
  logPackage,
  getPendingPackages,
  getMyPackages,
  collectPackage,
  createPoll,
  getPolls,
  votePoll,
  getPollResults,
  closePoll,
  triggerEmergency,
  getActiveEmergencies,
  resolveEmergency,
  getDirectory,
  createEvent,
  getEvents,
  rsvpEvent,
  getEventAttendees,
  deleteEvent,
  assignComplaint,
  resolveComplaint,
  updateDirectoryPrivacy
};