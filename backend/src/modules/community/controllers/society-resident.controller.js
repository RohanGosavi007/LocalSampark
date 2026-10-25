const crypto = require('crypto');
const { query, queryOne, queryMany } = require('../../../config/database');
const {
  CAPABILITIES, hasSocietyCapability, membershipOf, membershipIsActive,
} = require('../middleware/society-capability');

/**
 * The society module's day-to-day surface: members, staff, bills, parking,
 * amenities, complaints, packages, polls, events, the guard's inbox and the
 * emergency board.
 *
 * The web society page and the mobile society tabs were both written against
 * these paths under /society-management, and the router only ever had the
 * eight gate routes. Every other tab answered 404 on web and made no call at
 * all on mobile. The tables were there — the demo seeder fills them — and
 * nothing read them.
 *
 * Every handler runs behind a guard from society-capability.js that has
 * already resolved and checked `req.societyId`; nothing here takes a society
 * from the request.
 */

const newId = () => crypto.randomUUID();
const today = () => new Date().toISOString().slice(0, 10);
const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });
const bad = (res, message, status = 400) => res.status(status).json({ success: false, message, error: message });

function parseJson(value, fallback) {
  if (Array.isArray(value) || (value && typeof value === 'object')) return value;
  try { return JSON.parse(value); } catch { return fallback; }
}

const isTruthy = (v) => v === true || v === 1 || v === '1' || v === 't' || v === 'true';

/** The caller's own flat in this society, or null (platform staff, office with no flat). */
async function ownFlat(req) {
  if (req.societyMembership?.flat_number) return req.societyMembership.flat_number;
  const m = await membershipOf(req.user?.id, req.societyId);
  return membershipIsActive(m) ? m.flat_number || null : null;
}

const isOffice = (req) => hasSocietyCapability(req, req.societyId, CAPABILITIES.MANAGE_SOCIETY);
const isDesk = (req) => hasSocietyCapability(req, req.societyId, CAPABILITIES.LOG_GATE_ENTRY);

const sameFlat = (a, b) => a && b && String(a).trim().toLowerCase() === String(b).trim().toLowerCase();

function wrap(fn) {
  return async (req, res, next) => {
    try { await fn(req, res); } catch (err) { next(err); }
  };
}

// ─── Context ────────────────────────────────────────────────────────────────

/** Who the caller is in this society — the mobile tabs key their UI off this. */
const getContext = wrap(async (req, res) => {
  const society = await queryOne('SELECT id, name, address FROM societies WHERE id = $1', [req.societyId]);
  const [office, desk] = await Promise.all([isOffice(req), isDesk(req)]);
  ok(res, {
    societyId: req.societyId,
    societyName: society?.name || null,
    address: society?.address || null,
    flatNumber: await ownFlat(req),
    role: req.societyMembership?.role || (office ? 'society_admin' : null),
    capabilities: { manageSociety: office, logGateEntry: desk },
  });
});

// ─── Visitors ───────────────────────────────────────────────────────────────

const VISITOR_COLUMNS = `id, visitor_name, visitor_phone, purpose, flat_number, vehicle_number,
  visitor_photo_url, id_card_photo_url, status, checked_in_at, checked_out_at, approved_at, created_at`;

const getMyVisitors = wrap(async (req, res) => {
  const flat = await ownFlat(req);
  if (!flat) return ok(res, []);
  const data = await queryMany(
    `SELECT ${VISITOR_COLUMNS} FROM society_visitors
      WHERE society_id = $1 AND LOWER(flat_number) = LOWER($2)
      ORDER BY created_at DESC LIMIT 100`,
    [req.societyId, flat]
  );
  ok(res, data);
});

const getAllVisitors = wrap(async (req, res) => {
  const data = await queryMany(
    `SELECT ${VISITOR_COLUMNS} FROM society_visitors
      WHERE society_id = $1 ORDER BY created_at DESC LIMIT 200`,
    [req.societyId]
  );
  ok(res, data);
});

const getVisitorAnalytics = wrap(async (req, res) => {
  const rows = await queryMany(
    'SELECT status, created_at FROM society_visitors WHERE society_id = $1',
    [req.societyId]
  );
  const d = today();
  const count = (pred) => rows.filter(pred).length;
  ok(res, {
    total: rows.length,
    today: count((r) => String(r.created_at || '').slice(0, 10) === d),
    pending: count((r) => ['pending', 'expected'].includes(r.status)),
    approved: count((r) => ['approved', 'checked_in', 'checked_out'].includes(r.status)),
    declined: count((r) => r.status === 'denied'),
    inside: count((r) => r.status === 'checked_in'),
  });
});

// ─── Members & directory ────────────────────────────────────────────────────

const MEMBER_SELECT = `SELECT sm.id, sm.user_id, sm.flat_number, sm.role, sm.is_active, sm.status,
    sm.occupancy_type, sm.show_phone, sm.profession, sm.created_at,
    u.full_name, u.phone_number, u.email, u.avatar_url
  FROM society_members sm LEFT JOIN users u ON u.id = sm.user_id
  WHERE sm.society_id = $1`;

/** A neighbour's number is theirs to share: show_phone = 0 hides it from everyone but the office. */
function redactPhones(rows, office) {
  return rows.map((r) => (office || isTruthy(r.show_phone ?? 1)
    ? r : { ...r, phone_number: null, email: null }));
}

const getMembers = wrap(async (req, res) => {
  const rows = (await queryMany(`${MEMBER_SELECT} ORDER BY sm.flat_number`, [req.societyId]))
    .filter(membershipIsActive);
  ok(res, redactPhones(rows, await isOffice(req)));
});

const getDirectory = wrap(async (req, res) => {
  const search = String(req.query.search || '').trim().toLowerCase().slice(0, 60);
  let rows = (await queryMany(`${MEMBER_SELECT} ORDER BY sm.flat_number`, [req.societyId]))
    .filter(membershipIsActive);
  if (search) {
    rows = rows.filter((r) => [r.full_name, r.flat_number, r.role, r.profession]
      .some((v) => String(v || '').toLowerCase().includes(search)));
  }
  ok(res, redactPhones(rows, await isOffice(req)));
});

const MEMBER_ROLES = ['resident', 'owner', 'tenant', 'guard', 'secretary', 'admin', 'society_admin', 'member'];

const addMember = wrap(async (req, res) => {
  const { phone, flatNumber, role = 'resident' } = req.body || {};
  if (!phone || !flatNumber) return bad(res, 'Phone number and flat number are required');
  if (!MEMBER_ROLES.includes(role)) return bad(res, `Role must be one of: ${MEMBER_ROLES.join(', ')}`);

  const digits = String(phone).replace(/\D/g, '').slice(-10);
  const user = await queryOne(
    'SELECT id, full_name FROM users WHERE phone_number = $1 OR phone_number = $2 OR phone = $1 OR phone = $2 LIMIT 1',
    [`+91${digits}`, digits]
  );
  if (!user) return bad(res, 'No LocalSampark account uses that phone number. Ask them to sign up first.', 404);

  const existing = await queryOne(
    'SELECT id FROM society_members WHERE society_id = $1 AND user_id = $2',
    [req.societyId, user.id]
  );
  if (existing) {
    await query(
      `UPDATE society_members SET flat_number = $1, role = $2, is_active = 1, status = 'approved'
        WHERE id = $3 AND society_id = $4`,
      [flatNumber, role, existing.id, req.societyId]
    );
    return ok(res, { id: existing.id, reactivated: true });
  }

  const id = newId();
  await query(
    `INSERT INTO society_members (id, society_id, user_id, flat_number, role, is_active, status, added_by, created_at)
     VALUES ($1, $2, $3, $4, $5, 1, 'approved', $6, CURRENT_TIMESTAMP)`,
    [id, req.societyId, user.id, flatNumber, role, req.user.id]
  );
  ok(res, { id, name: user.full_name }, 201);
});

const updateMember = wrap(async (req, res) => {
  const { flatNumber, role } = req.body || {};
  if (role && !MEMBER_ROLES.includes(role)) return bad(res, `Role must be one of: ${MEMBER_ROLES.join(', ')}`);
  const result = await query(
    `UPDATE society_members
        SET flat_number = COALESCE($1, flat_number), role = COALESCE($2, role)
      WHERE id = $3 AND society_id = $4`,
    [flatNumber || null, role || null, req.params.id, req.societyId]
  );
  if (!result.rowCount) return bad(res, 'Member not found in this society', 404);
  ok(res, { id: req.params.id });
});

// Deactivated, not deleted: the membership anchors bills, complaints and the
// gate register, and those records must keep pointing at someone.
const removeMember = wrap(async (req, res) => {
  const result = await query(
    `UPDATE society_members SET is_active = 0, status = 'removed' WHERE id = $1 AND society_id = $2`,
    [req.params.id, req.societyId]
  );
  if (!result.rowCount) return bad(res, 'Member not found in this society', 404);
  ok(res, { id: req.params.id });
});

// ─── Guard inbox: messages & reminders ──────────────────────────────────────

const getGuardMessages = wrap(async (req, res) => {
  const data = await queryMany(
    `SELECT gm.id, gm.message, gm.is_read, gm.created_at, gm.sender_id,
            u.full_name AS sender_name, sm.flat_number
       FROM society_guard_messages gm
       LEFT JOIN users u ON u.id = gm.sender_id
       LEFT JOIN society_members sm ON sm.user_id = gm.sender_id AND sm.society_id = gm.society_id
      WHERE gm.society_id = $1
      ORDER BY gm.created_at DESC LIMIT 100`,
    [req.societyId]
  );
  ok(res, data);
});

const getMyGuardMessages = wrap(async (req, res) => {
  const data = await queryMany(
    `SELECT id, message, is_read, created_at FROM society_guard_messages
      WHERE society_id = $1 AND sender_id = $2 ORDER BY created_at DESC LIMIT 50`,
    [req.societyId, req.user.id]
  );
  ok(res, data);
});

const sendGuardMessage = wrap(async (req, res) => {
  const message = String(req.body?.message || '').trim();
  if (!message) return bad(res, 'Message is required');
  if (message.length > 1000) return bad(res, 'Message is too long');
  const id = newId();
  await query(
    `INSERT INTO society_guard_messages (id, society_id, sender_id, message, is_read, created_at)
     VALUES ($1, $2, $3, $4, 0, CURRENT_TIMESTAMP)`,
    [id, req.societyId, req.user.id, message]
  );
  const io = req.app.get('io');
  if (io) {
    io.to(`gatekeeper_${req.societyId}`).emit('GUARD_MESSAGE', {
      id, message, flat: await ownFlat(req), at: new Date().toISOString(),
    });
  }
  ok(res, { id }, 201);
});

const markGuardMessageRead = wrap(async (req, res) => {
  const result = await query(
    'UPDATE society_guard_messages SET is_read = 1 WHERE id = $1 AND society_id = $2',
    [req.params.id, req.societyId]
  );
  if (!result.rowCount) return bad(res, 'Message not found', 404);
  ok(res, { id: req.params.id });
});

const getGuardReminders = wrap(async (req, res) => {
  const data = await queryMany(
    `SELECT r.id, r.title, r.description, r.reminder_time, r.priority, r.status, r.created_at,
            u.full_name AS created_by_name
       FROM society_guard_reminders r
       LEFT JOIN users u ON u.id = r.created_by
      WHERE r.society_id = $1 AND (r.status IS NULL OR r.status = 'active')
      ORDER BY r.reminder_time ASC LIMIT 100`,
    [req.societyId]
  );
  ok(res, data);
});

const createGuardReminder = wrap(async (req, res) => {
  const { title, description, reminderTime, priority = 'normal' } = req.body || {};
  if (!title || !reminderTime) return bad(res, 'Title and reminder time are required');
  if (Number.isNaN(Date.parse(reminderTime))) return bad(res, 'Reminder time is not a valid date');
  const id = newId();
  await query(
    `INSERT INTO society_guard_reminders
       (id, society_id, created_by, title, description, reminder_time, priority, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [id, req.societyId, req.user.id, String(title).slice(0, 200), description || null,
      new Date(reminderTime).toISOString(), ['low', 'normal', 'high', 'urgent'].includes(priority) ? priority : 'normal']
  );
  ok(res, { id }, 201);
});

const dismissGuardReminder = wrap(async (req, res) => {
  const result = await query(
    `UPDATE society_guard_reminders SET status = 'dismissed', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND society_id = $2`,
    [req.params.id, req.societyId]
  );
  if (!result.rowCount) return bad(res, 'Reminder not found', 404);
  ok(res, { id: req.params.id });
});

// ─── Domestic staff ─────────────────────────────────────────────────────────

const getStaff = wrap(async (req, res) => {
  const rows = await queryMany(
    `SELECT id, staff_name, staff_phone, staff_type, staff_photo_url, assigned_flats, is_active, created_at
       FROM society_domestic_staff WHERE society_id = $1 ORDER BY staff_name`,
    [req.societyId]
  );
  ok(res, rows
    .filter((s) => isTruthy(s.is_active ?? 1))
    .map((s) => ({ ...s, assigned_flats: parseJson(s.assigned_flats, []) })));
});

const STAFF_TYPES = ['maid', 'cook', 'driver', 'nanny', 'housekeeping', 'security', 'gardener', 'other'];

const addStaff = wrap(async (req, res) => {
  const { staffName, staffPhone, staffType = 'maid', assignedFlats = [] } = req.body || {};
  if (!staffName) return bad(res, 'Staff name is required');
  const flats = (Array.isArray(assignedFlats) ? assignedFlats : String(assignedFlats).split(','))
    .map((f) => String(f).trim()).filter(Boolean);
  const id = newId();
  await query(
    `INSERT INTO society_domestic_staff
       (id, society_id, staff_name, staff_phone, staff_type, assigned_flats, is_active, added_by, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, 1, $7, CURRENT_TIMESTAMP)`,
    [id, req.societyId, staffName, staffPhone || null, STAFF_TYPES.includes(staffType) ? staffType : 'other',
      JSON.stringify(flats), req.user.id]
  );
  ok(res, { id }, 201);
});

const markStaffAttendance = wrap(async (req, res) => {
  const { action } = req.body || {};
  if (!['check_in', 'check_out'].includes(action)) return bad(res, 'Action must be check_in or check_out');

  const staff = await queryOne(
    'SELECT id FROM society_domestic_staff WHERE id = $1 AND society_id = $2',
    [req.params.id, req.societyId]
  );
  if (!staff) return bad(res, 'Staff member not found in this society', 404);

  const date = today();
  const now = new Date().toISOString();
  const existing = await queryOne(
    'SELECT id, check_in_time, check_out_time FROM society_staff_attendance WHERE society_id = $1 AND staff_id = $2 AND date = $3',
    [req.societyId, staff.id, date]
  );

  if (action === 'check_in') {
    if (existing?.check_in_time) return bad(res, 'Already checked in today', 409);
    const id = newId();
    await query(
      `INSERT INTO society_staff_attendance (id, society_id, staff_id, date, check_in_time, marked_by, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'present', CURRENT_TIMESTAMP)`,
      [id, req.societyId, staff.id, date, now, req.user.id]
    );
    return ok(res, { id, check_in_time: now }, 201);
  }

  if (!existing?.check_in_time) return bad(res, 'Not checked in today', 409);
  if (existing.check_out_time) return bad(res, 'Already checked out today', 409);
  await query(
    'UPDATE society_staff_attendance SET check_out_time = $1 WHERE id = $2 AND check_out_time IS NULL',
    [now, existing.id]
  );
  ok(res, { id: existing.id, check_out_time: now });
});

// ─── Bills ──────────────────────────────────────────────────────────────────

const BILL_SELECT = `SELECT b.id, b.flat_number, b.month, b.year, b.base_amount, b.water_charges,
    b.parking_charges, b.other_charges, b.late_fee, b.total_amount, b.paid_amount, b.due_date,
    b.payment_status, b.paid_at, b.payment_reference, b.created_at,
    (SELECT u.full_name FROM society_members sm JOIN users u ON u.id = sm.user_id
      WHERE sm.society_id = b.society_id AND sm.flat_number = b.flat_number LIMIT 1) AS full_name
  FROM society_maintenance_bills b WHERE b.society_id = $1`;

const isOverdue = (b) => b.payment_status !== 'paid' && b.due_date && String(b.due_date).slice(0, 10) < today();

const getBills = wrap(async (req, res) => {
  const rows = await queryMany(`${BILL_SELECT} ORDER BY b.created_at DESC LIMIT 500`, [req.societyId]);
  ok(res, rows.map((b) => (isOverdue(b) ? { ...b, payment_status: 'overdue' } : b)));
});

const getMyBills = wrap(async (req, res) => {
  const flat = await ownFlat(req);
  if (!flat) return ok(res, []);
  const rows = await queryMany(
    `${BILL_SELECT} AND LOWER(b.flat_number) = LOWER($2) ORDER BY b.created_at DESC`,
    [req.societyId, flat]
  );
  ok(res, rows.map((b) => (isOverdue(b) ? { ...b, payment_status: 'overdue' } : b)));
});

const getBillSummary = wrap(async (req, res) => {
  const rows = await queryMany(
    'SELECT total_amount, paid_amount, payment_status, due_date FROM society_maintenance_bills WHERE society_id = $1',
    [req.societyId]
  );
  const num = (v) => Number(v) || 0;
  ok(res, {
    totalBills: rows.length,
    totalAmount: rows.reduce((s, b) => s + num(b.total_amount), 0),
    collectedAmount: rows.reduce((s, b) => s + num(b.paid_amount), 0),
    pendingCount: rows.filter((b) => b.payment_status !== 'paid').length,
    overdueCount: rows.filter(isOverdue).length,
  });
});

/** One bill per active flat for the month. Re-running a month adds only the flats it missed. */
const generateBills = wrap(async (req, res) => {
  const { month, baseAmount, waterCharges = 0, parkingCharges = 0, otherCharges = 0, dueDate } = req.body || {};
  if (!/^\d{4}-\d{2}$/.test(String(month || ''))) return bad(res, 'Month must be YYYY-MM');
  const base = Number(baseAmount);
  if (!Number.isFinite(base) || base <= 0) return bad(res, 'Base amount must be a positive number');
  if (!dueDate || Number.isNaN(Date.parse(dueDate))) return bad(res, 'A valid due date is required');

  const parts = [base, Number(waterCharges) || 0, Number(parkingCharges) || 0, Number(otherCharges) || 0];
  if (parts.some((p) => p < 0)) return bad(res, 'Charges cannot be negative');
  const total = parts.reduce((s, p) => s + p, 0);

  const members = (await queryMany(
    'SELECT id, flat_number, is_active, status, role FROM society_members WHERE society_id = $1',
    [req.societyId]
  )).filter((m) => membershipIsActive(m) && m.flat_number && !['guard', 'security_guard'].includes(String(m.role)));

  const billed = new Set((await queryMany(
    'SELECT flat_number FROM society_maintenance_bills WHERE society_id = $1 AND month = $2',
    [req.societyId, month]
  )).map((b) => String(b.flat_number).toLowerCase()));

  const seen = new Set();
  let created = 0;
  for (const m of members) {
    const key = String(m.flat_number).toLowerCase();
    if (billed.has(key) || seen.has(key)) continue;
    seen.add(key);
    await query(
      `INSERT INTO society_maintenance_bills
         (id, society_id, member_id, flat_number, month, year, base_amount, water_charges, parking_charges,
          other_charges, late_fee, total_amount, due_date, paid_amount, payment_status, generated_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 0, $11, $12, 0, 'pending', $13, CURRENT_TIMESTAMP)`,
      [newId(), req.societyId, m.id, m.flat_number, month, Number(month.slice(0, 4)),
        parts[0], parts[1], parts[2], parts[3], total, String(dueDate).slice(0, 10), req.user.id]
    );
    created += 1;
  }
  ok(res, { created, skipped: members.length - created, month }, 201);
});

/** A resident records payment of their own flat's bill; the office may record any. */
const payBill = wrap(async (req, res) => {
  const bill = await queryOne(
    'SELECT id, flat_number, total_amount, payment_status FROM society_maintenance_bills WHERE id = $1 AND society_id = $2',
    [req.params.id, req.societyId]
  );
  if (!bill) return bad(res, 'Bill not found in this society', 404);
  if (!sameFlat(bill.flat_number, await ownFlat(req)) && !(await isOffice(req))) {
    return bad(res, 'You can only pay the bills of your own flat', 403);
  }
  const ref = String(req.body?.paymentReference || '').trim() || `MANUAL-${Date.now()}`;
  const result = await query(
    `UPDATE society_maintenance_bills
        SET payment_status = 'paid', paid_amount = total_amount, paid_at = CURRENT_TIMESTAMP, payment_reference = $1
      WHERE id = $2 AND society_id = $3 AND payment_status <> 'paid'`,
    [ref.slice(0, 100), bill.id, req.societyId]
  );
  if (!result.rowCount) return bad(res, 'This bill is already paid', 409);
  ok(res, { id: bill.id, payment_reference: ref });
});

// ─── Parking ────────────────────────────────────────────────────────────────

const PARKING_SELECT = `SELECT id, slot_number, slot_type, flat_number, vehicle_number, vehicle_type, is_occupied, created_at
  FROM society_parking_slots WHERE society_id = $1`;

const getParking = wrap(async (req, res) => {
  ok(res, await queryMany(`${PARKING_SELECT} ORDER BY slot_number`, [req.societyId]));
});

const getMyParking = wrap(async (req, res) => {
  const flat = await ownFlat(req);
  if (!flat) return ok(res, []);
  ok(res, await queryMany(`${PARKING_SELECT} AND LOWER(flat_number) = LOWER($2) ORDER BY slot_number`, [req.societyId, flat]));
});

const addParking = wrap(async (req, res) => {
  const { slotNumber, slotType = 'car', flatNumber, vehicleNumber } = req.body || {};
  if (!slotNumber) return bad(res, 'Slot number is required');
  const clash = await queryOne(
    'SELECT id FROM society_parking_slots WHERE society_id = $1 AND slot_number = $2',
    [req.societyId, slotNumber]
  );
  if (clash) return bad(res, `Slot ${slotNumber} already exists`, 409);
  const id = newId();
  await query(
    `INSERT INTO society_parking_slots
       (id, society_id, slot_number, slot_type, flat_number, vehicle_number, vehicle_type, is_occupied, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $4, $7, CURRENT_TIMESTAMP)`,
    [id, req.societyId, slotNumber, ['car', 'bike', 'ev', 'visitor'].includes(slotType) ? slotType : 'car',
      flatNumber || null, vehicleNumber ? String(vehicleNumber).toUpperCase() : null, flatNumber ? 1 : 0]
  );
  ok(res, { id }, 201);
});

const removeParking = wrap(async (req, res) => {
  const result = await query('DELETE FROM society_parking_slots WHERE id = $1 AND society_id = $2', [req.params.id, req.societyId]);
  if (!result.rowCount) return bad(res, 'Slot not found', 404);
  ok(res, { id: req.params.id });
});

// ─── Amenities & bookings ───────────────────────────────────────────────────

const getAmenities = wrap(async (req, res) => {
  const rows = await queryMany(
    `SELECT id, name, description, capacity, hourly_rate, booking_advance_days, available_from,
            available_until, rules, is_active
       FROM society_amenities WHERE society_id = $1 ORDER BY name`,
    [req.societyId]
  );
  ok(res, rows.filter((a) => isTruthy(a.is_active ?? 1)));
});

const addAmenity = wrap(async (req, res) => {
  const { name, description, capacity, hourlyRate = 0, rules } = req.body || {};
  if (!name) return bad(res, 'Amenity name is required');
  const id = newId();
  await query(
    `INSERT INTO society_amenities (id, society_id, name, description, capacity, hourly_rate, rules, is_active, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 1, CURRENT_TIMESTAMP)`,
    [id, req.societyId, name, description || null, Number(capacity) || null, Math.max(0, Number(hourlyRate) || 0), rules || null]
  );
  ok(res, { id }, 201);
});

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

const bookAmenity = wrap(async (req, res) => {
  const { bookingDate, startTime, endTime, purpose, guestCount = 0 } = req.body || {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(bookingDate || ''))) return bad(res, 'Booking date must be YYYY-MM-DD');
  if (!HHMM.test(String(startTime || '')) || !HHMM.test(String(endTime || ''))) return bad(res, 'Times must be HH:MM');
  if (endTime <= startTime) return bad(res, 'End time must be after start time');
  if (bookingDate < today()) return bad(res, 'Cannot book a date in the past');

  const amenity = await queryOne(
    `SELECT id, name, hourly_rate, booking_advance_days, available_from, available_until, is_active
       FROM society_amenities WHERE id = $1 AND society_id = $2`,
    [req.params.id, req.societyId]
  );
  if (!amenity || !isTruthy(amenity.is_active ?? 1)) return bad(res, 'Amenity not found', 404);

  const horizon = new Date(Date.now() + (Number(amenity.booking_advance_days) || 7) * 86400000).toISOString().slice(0, 10);
  if (bookingDate > horizon) return bad(res, `${amenity.name} can be booked at most ${amenity.booking_advance_days || 7} days ahead`);
  if ((amenity.available_from && startTime < amenity.available_from) || (amenity.available_until && endTime > amenity.available_until)) {
    return bad(res, `${amenity.name} is open ${amenity.available_from}–${amenity.available_until}`);
  }

  // Overlap, not equality: 10:00–12:00 and 11:00–13:00 are the same hall.
  const clash = await queryOne(
    `SELECT id FROM society_amenity_bookings
      WHERE amenity_id = $1 AND booking_date = $2 AND status <> 'cancelled'
        AND start_time < $4 AND end_time > $3`,
    [amenity.id, bookingDate, startTime, endTime]
  );
  if (clash) return bad(res, 'That slot overlaps an existing booking', 409);

  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const hours = ((eh * 60 + em) - (sh * 60 + sm)) / 60;
  const charge = Math.round(hours * (Number(amenity.hourly_rate) || 0) * 100) / 100;

  const id = newId();
  await query(
    `INSERT INTO society_amenity_bookings
       (id, amenity_id, society_id, booked_by, flat_number, booking_date, start_time, end_time, purpose,
        guest_count, total_charge, status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'confirmed', CURRENT_TIMESTAMP)`,
    [id, amenity.id, req.societyId, req.user.id, await ownFlat(req), bookingDate, startTime, endTime,
      purpose || null, Math.max(0, Number(guestCount) || 0), charge]
  );
  ok(res, { id, total_charge: charge }, 201);
});

const getMyBookings = wrap(async (req, res) => {
  ok(res, await queryMany(
    `SELECT b.id, b.amenity_id, a.name AS amenity_name, b.booking_date, b.start_time, b.end_time,
            b.purpose, b.total_charge, b.status, b.created_at
       FROM society_amenity_bookings b LEFT JOIN society_amenities a ON a.id = b.amenity_id
      WHERE b.society_id = $1 AND b.booked_by = $2
      ORDER BY b.booking_date DESC, b.start_time DESC LIMIT 50`,
    [req.societyId, req.user.id]
  ));
});

const cancelBooking = wrap(async (req, res) => {
  const booking = await queryOne(
    'SELECT id, booked_by, status FROM society_amenity_bookings WHERE id = $1 AND society_id = $2',
    [req.params.id, req.societyId]
  );
  if (!booking) return bad(res, 'Booking not found', 404);
  if (booking.booked_by !== req.user.id && !(await isOffice(req))) return bad(res, 'You can only cancel your own bookings', 403);
  const result = await query(
    `UPDATE society_amenity_bookings SET status = 'cancelled' WHERE id = $1 AND status <> 'cancelled'`,
    [booking.id]
  );
  if (!result.rowCount) return bad(res, 'Booking is already cancelled', 409);
  ok(res, { id: booking.id });
});

// ─── Complaints ─────────────────────────────────────────────────────────────

const COMPLAINT_SELECT = `SELECT c.id, c.title, c.description, c.category, c.status, c.priority, c.flat_number,
    c.admin_notes, c.sla_hours, c.resolved_at, c.created_at, c.updated_at, u.full_name
  FROM society_complaints c LEFT JOIN users u ON u.id = c.user_id
  WHERE c.society_id = $1`;

const getAllComplaints = wrap(async (req, res) => {
  ok(res, await queryMany(`${COMPLAINT_SELECT} ORDER BY c.created_at DESC LIMIT 300`, [req.societyId]));
});

const getMyComplaints = wrap(async (req, res) => {
  ok(res, await queryMany(`${COMPLAINT_SELECT} AND c.user_id = $2 ORDER BY c.created_at DESC`, [req.societyId, req.user.id]));
});

const COMPLAINT_CATEGORIES = ['plumbing', 'electrical', 'electricity', 'maintenance', 'security', 'parking', 'noise', 'cleaning', 'lift', 'other'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

const createComplaint = wrap(async (req, res) => {
  const { category = 'other', title, description, priority = 'medium' } = req.body || {};
  if (!title || !String(title).trim()) return bad(res, 'Title is required');
  const id = newId();
  await query(
    `INSERT INTO society_complaints
       (id, society_id, user_id, flat_number, category, title, description, status, priority, sla_hours, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'open', $8, 48, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [id, req.societyId, req.user.id, await ownFlat(req),
      COMPLAINT_CATEGORIES.includes(category) ? category : 'other', String(title).slice(0, 200),
      description || null, PRIORITIES.includes(priority) ? priority : 'medium']
  );
  ok(res, { id }, 201);
});

async function moveComplaint(req, res, status, allowedFrom) {
  const notes = req.body?.adminNotes;
  const result = await query(
    `UPDATE society_complaints
        SET status = $1, admin_notes = COALESCE($2, admin_notes), updated_at = CURRENT_TIMESTAMP,
            resolved_at = CASE WHEN $1 = 'resolved' THEN CURRENT_TIMESTAMP ELSE resolved_at END,
            resolved_by = CASE WHEN $1 = 'resolved' THEN $3 ELSE resolved_by END,
            assigned_to = CASE WHEN $1 = 'in_progress' THEN $3 ELSE assigned_to END
      WHERE id = $4 AND society_id = $5 AND status IN (${allowedFrom.map((s) => `'${s}'`).join(', ')})`,
    [status, notes || null, req.user.id, req.params.id, req.societyId]
  );
  if (!result.rowCount) {
    const exists = await queryOne('SELECT status FROM society_complaints WHERE id = $1 AND society_id = $2', [req.params.id, req.societyId]);
    if (!exists) return bad(res, 'Complaint not found', 404);
    return bad(res, `A ${exists.status} complaint cannot move to ${status}`, 409);
  }
  ok(res, { id: req.params.id, status });
}

const assignComplaint = wrap((req, res) => moveComplaint(req, res, 'in_progress', ['open']));
const resolveComplaint = wrap((req, res) => moveComplaint(req, res, 'resolved', ['open', 'in_progress']));

// ─── Packages ───────────────────────────────────────────────────────────────

const getMyPackages = wrap(async (req, res) => {
  const flat = await ownFlat(req);
  if (!flat) return ok(res, []);
  ok(res, await queryMany(
    `SELECT id, flat_number, courier_name, package_description, status, collected_at, created_at
       FROM society_packages WHERE society_id = $1 AND LOWER(flat_number) = LOWER($2)
      ORDER BY created_at DESC LIMIT 50`,
    [req.societyId, flat]
  ));
});

/** The guard hands it over, or the resident confirms they picked up their own. */
const collectPackage = wrap(async (req, res) => {
  const pkg = await queryOne(
    'SELECT id, flat_number, status FROM society_packages WHERE id = $1 AND society_id = $2',
    [req.params.id, req.societyId]
  );
  if (!pkg) return bad(res, 'Package not found', 404);
  if (!(await isDesk(req)) && !sameFlat(pkg.flat_number, await ownFlat(req))) {
    return bad(res, 'Only the gate or the flat it is addressed to can mark it collected', 403);
  }
  const result = await query(
    `UPDATE society_packages SET status = 'collected', collected_at = CURRENT_TIMESTAMP, collected_by = $1
      WHERE id = $2 AND status <> 'collected'`,
    [req.user.id, pkg.id]
  );
  if (!result.rowCount) return bad(res, 'Package was already collected', 409);
  ok(res, { id: pkg.id });
});

// ─── Polls ──────────────────────────────────────────────────────────────────

const getPolls = wrap(async (req, res) => {
  const polls = await queryMany(
    `SELECT p.id, p.title, p.question, p.description, p.options, p.poll_type, p.status, p.ends_at,
            p.is_anonymous, p.created_at, u.full_name AS creator_name
       FROM society_polls p LEFT JOIN users u ON u.id = p.created_by
      WHERE p.society_id = $1 ORDER BY p.created_at DESC LIMIT 50`,
    [req.societyId]
  );
  if (!polls.length) return ok(res, []);
  const votes = await queryMany(
    `SELECT v.poll_id, v.voter_id, v.selected_option FROM society_poll_votes v
       JOIN society_polls p ON p.id = v.poll_id WHERE p.society_id = $1`,
    [req.societyId]
  );
  ok(res, polls.map((p) => {
    const mine = votes.find((v) => v.poll_id === p.id && v.voter_id === req.user.id);
    const expired = p.ends_at && Date.parse(p.ends_at) < Date.now();
    return {
      ...p,
      title: p.title || p.question,
      description: p.description || (p.title ? p.question : null),
      options: parseJson(p.options, []),
      status: expired && p.status !== 'closed' ? 'closed' : (p.status === 'open' ? 'active' : p.status),
      total_votes: votes.filter((v) => v.poll_id === p.id).length,
      myVote: mine ? Number(mine.selected_option) : null,
    };
  }));
});

const createPoll = wrap(async (req, res) => {
  const { title, description, options = [], pollType = 'single', endsAt } = req.body || {};
  const opts = (Array.isArray(options) ? options : []).map((o) => String(o).trim()).filter(Boolean);
  if (!title) return bad(res, 'Title is required');
  if (opts.length < 2) return bad(res, 'A poll needs at least two options');
  if (endsAt && Number.isNaN(Date.parse(endsAt))) return bad(res, 'End date is not valid');
  const id = newId();
  await query(
    `INSERT INTO society_polls (id, society_id, created_by, question, title, description, options, poll_type, status, ends_at, created_at)
     VALUES ($1, $2, $3, $4, $4, $5, $6, $7, 'active', $8, CURRENT_TIMESTAMP)`,
    [id, req.societyId, req.user.id, String(title).slice(0, 300), description || null, JSON.stringify(opts),
      pollType === 'multiple' ? 'multiple' : 'single', endsAt ? new Date(endsAt).toISOString() : null]
  );
  ok(res, { id }, 201);
});

const closePoll = wrap(async (req, res) => {
  const result = await query(
    `UPDATE society_polls SET status = 'closed' WHERE id = $1 AND society_id = $2`,
    [req.params.id, req.societyId]
  );
  if (!result.rowCount) return bad(res, 'Poll not found', 404);
  ok(res, { id: req.params.id });
});

const votePoll = wrap(async (req, res) => {
  const poll = await queryOne(
    'SELECT id, options, status, ends_at FROM society_polls WHERE id = $1 AND society_id = $2',
    [req.params.id, req.societyId]
  );
  if (!poll) return bad(res, 'Poll not found', 404);
  if (poll.status === 'closed' || (poll.ends_at && Date.parse(poll.ends_at) < Date.now())) return bad(res, 'This poll is closed', 409);
  const options = parseJson(poll.options, []);
  const choice = Number(req.body?.selectedOption);
  if (!Number.isInteger(choice) || choice < 0 || choice >= options.length) return bad(res, 'Pick one of the poll options');

  // One person, one vote — the UNIQUE(poll_id, voter_id) index is the arbiter.
  const existing = await queryOne('SELECT id FROM society_poll_votes WHERE poll_id = $1 AND voter_id = $2', [poll.id, req.user.id]);
  if (existing) return bad(res, 'You have already voted in this poll', 409);
  try {
    await query(
      `INSERT INTO society_poll_votes (id, poll_id, voter_id, selected_option, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [newId(), poll.id, req.user.id, choice]
    );
  } catch (err) {
    if (/unique|duplicate/i.test(err.message)) return bad(res, 'You have already voted in this poll', 409);
    throw err;
  }
  ok(res, { id: poll.id, selectedOption: choice }, 201);
});

const getPollResults = wrap(async (req, res) => {
  const poll = await queryOne('SELECT id, options FROM society_polls WHERE id = $1 AND society_id = $2', [req.params.id, req.societyId]);
  if (!poll) return bad(res, 'Poll not found', 404);
  const options = parseJson(poll.options, []);
  const votes = await queryMany('SELECT selected_option FROM society_poll_votes WHERE poll_id = $1', [poll.id]);
  const total = votes.length;
  ok(res, options.map((option, i) => {
    const n = votes.filter((v) => Number(v.selected_option) === i).length;
    return { option, votes: n, percentage: total ? Math.round((n / total) * 100) : 0 };
  }));
});

// ─── Emergency ──────────────────────────────────────────────────────────────

const getActiveEmergencies = wrap(async (req, res) => {
  ok(res, await queryMany(
    `SELECT e.id, e.alert_type, e.description, e.flat_number, e.status, e.created_at,
            u.full_name AS triggered_by_name
       FROM society_emergency_alerts e LEFT JOIN users u ON u.id = e.triggered_by
      WHERE e.society_id = $1 AND e.status = 'active'
      ORDER BY e.created_at DESC`,
    [req.societyId]
  ));
});

const resolveEmergency = wrap(async (req, res) => {
  const result = await query(
    `UPDATE society_emergency_alerts
        SET status = 'resolved', resolved_by = $1, resolved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND society_id = $3 AND status = 'active'`,
    [req.user.id, req.params.id, req.societyId]
  );
  if (!result.rowCount) return bad(res, 'No active alert with that id', 404);
  const io = req.app.get('io');
  if (io) io.to(`society_${req.societyId}`).emit('SOCIETY_EMERGENCY_RESOLVED', { id: req.params.id });
  ok(res, { id: req.params.id });
});

// ─── Events ─────────────────────────────────────────────────────────────────

const getEvents = wrap(async (req, res) => {
  const events = await queryMany(
    `SELECT e.id, e.title, e.description, e.event_date, e.start_time, e.end_time, e.venue, e.event_type,
            e.max_attendees, e.is_active, e.created_at, u.full_name AS organizer_name
       FROM society_events e LEFT JOIN users u ON u.id = e.created_by
      WHERE e.society_id = $1 AND e.event_date >= $2
      ORDER BY e.event_date ASC, e.start_time ASC LIMIT 50`,
    [req.societyId, today()]
  );
  const live = events.filter((e) => isTruthy(e.is_active ?? 1));
  if (!live.length) return ok(res, []);
  const rsvps = await queryMany(
    `SELECT r.event_id, r.user_id, r.status FROM society_event_rsvps r
       JOIN society_events e ON e.id = r.event_id WHERE e.society_id = $1`,
    [req.societyId]
  );
  ok(res, live.map((e) => ({
    ...e,
    going_count: rsvps.filter((r) => r.event_id === e.id && r.status === 'going').length,
    myRsvp: rsvps.find((r) => r.event_id === e.id && r.user_id === req.user.id)?.status || null,
  })));
});

const createEvent = wrap(async (req, res) => {
  const { title, description, eventDate, startTime, endTime, venue, eventType = 'general', maxAttendees } = req.body || {};
  if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(String(eventDate || ''))) return bad(res, 'Title and a YYYY-MM-DD date are required');
  const id = newId();
  await query(
    `INSERT INTO society_events
       (id, society_id, created_by, title, description, event_date, start_time, end_time, venue, event_type, max_attendees, is_active, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 1, CURRENT_TIMESTAMP)`,
    [id, req.societyId, req.user.id, String(title).slice(0, 200), description || null, eventDate,
      startTime || null, endTime || null, venue || null, eventType, Number(maxAttendees) || null]
  );
  const io = req.app.get('io');
  if (io) io.to(`society_${req.societyId}`).emit('SOCIETY_EVENT_CREATED', { id, title, eventDate });
  ok(res, { id }, 201);
});

const rsvpEvent = wrap(async (req, res) => {
  const status = ['going', 'maybe', 'not_going'].includes(req.body?.status) ? req.body.status : 'going';
  const event = await queryOne(
    'SELECT id, max_attendees FROM society_events WHERE id = $1 AND society_id = $2',
    [req.params.id, req.societyId]
  );
  if (!event) return bad(res, 'Event not found', 404);
  if (status === 'going' && event.max_attendees) {
    const going = await queryOne(
      `SELECT COUNT(*) AS c FROM society_event_rsvps WHERE event_id = $1 AND status = 'going' AND user_id <> $2`,
      [event.id, req.user.id]
    );
    if (Number(going?.c) >= Number(event.max_attendees)) return bad(res, 'This event is full', 409);
  }
  const existing = await queryOne('SELECT id FROM society_event_rsvps WHERE event_id = $1 AND user_id = $2', [event.id, req.user.id]);
  if (existing) {
    await query('UPDATE society_event_rsvps SET status = $1 WHERE id = $2', [status, existing.id]);
  } else {
    await query(
      `INSERT INTO society_event_rsvps (id, event_id, user_id, flat_number, status, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [newId(), event.id, req.user.id, await ownFlat(req), status]
    );
  }
  ok(res, { id: event.id, status });
});

const deleteEvent = wrap(async (req, res) => {
  const result = await query('UPDATE society_events SET is_active = 0 WHERE id = $1 AND society_id = $2', [req.params.id, req.societyId]);
  if (!result.rowCount) return bad(res, 'Event not found', 404);
  ok(res, { id: req.params.id });
});

// ─── Settings ───────────────────────────────────────────────────────────────

const SETTING_FIELDS = {
  overstay_timeout_minutes: 'int', auto_approve_expected: 'flag', visitor_photo_required: 'flag',
  id_card_required: 'flag', max_visitors_per_flat: 'int', guard_shift_start: 'time', guard_shift_end: 'time',
  maintenance_due_day: 'int', late_fee_percentage: 'num', sla_default_hours: 'int',
  patrol_enabled: 'flag', cab_preapproval_enabled: 'flag', whatsapp_enabled: 'flag',
};

const getSettings = wrap(async (req, res) => {
  const row = await queryOne('SELECT * FROM society_settings WHERE society_id = $1', [req.societyId]);
  ok(res, row || { society_id: req.societyId });
});

const updateSettings = wrap(async (req, res) => {
  const body = req.body || {};
  const values = {};
  for (const [key, kind] of Object.entries(SETTING_FIELDS)) {
    if (body[key] === undefined) continue;
    const v = body[key];
    if (kind === 'flag') values[key] = isTruthy(v) ? 1 : 0;
    else if (kind === 'time') { if (!HHMM.test(String(v))) return bad(res, `${key} must be HH:MM`); values[key] = v; }
    else {
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0) return bad(res, `${key} must be a non-negative number`);
      values[key] = kind === 'int' ? Math.round(n) : n;
    }
  }
  const keys = Object.keys(values);
  if (!keys.length) return bad(res, 'No recognised settings in the request');

  const existing = await queryOne('SELECT id FROM society_settings WHERE society_id = $1', [req.societyId]);
  if (existing) {
    await query(
      `UPDATE society_settings SET ${keys.map((k, i) => `${k} = $${i + 1}`).join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${keys.length + 1}`,
      [...keys.map((k) => values[k]), existing.id]
    );
  } else {
    await query(
      `INSERT INTO society_settings (id, society_id, ${keys.join(', ')}, created_at, updated_at)
       VALUES ($1, $2, ${keys.map((_, i) => `$${i + 3}`).join(', ')}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [newId(), req.societyId, ...keys.map((k) => values[k])]
    );
  }
  ok(res, values);
});

module.exports = {
  getContext,
  getMyVisitors, getAllVisitors, getVisitorAnalytics,
  getMembers, getDirectory, addMember, updateMember, removeMember,
  getGuardMessages, getMyGuardMessages, sendGuardMessage, markGuardMessageRead,
  getGuardReminders, createGuardReminder, dismissGuardReminder,
  getStaff, addStaff, markStaffAttendance,
  getBills, getMyBills, getBillSummary, generateBills, payBill,
  getParking, getMyParking, addParking, removeParking,
  getAmenities, addAmenity, bookAmenity, getMyBookings, cancelBooking,
  getAllComplaints, getMyComplaints, createComplaint, assignComplaint, resolveComplaint,
  getMyPackages, collectPackage,
  getPolls, createPoll, closePoll, votePoll, getPollResults,
  getActiveEmergencies, resolveEmergency,
  getEvents, createEvent, rsvpEvent, deleteEvent,
  getSettings, updateSettings,
};
