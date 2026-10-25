const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../../../config/database');
const { authenticate } = require('../../../middleware/auth.middleware');
const { v4: uuidv4 } = require('uuid');
const { requireCapability, requireMembership, hasSocietyCapability, isPlatformStaff, CAPABILITIES } = require('../middleware/society-capability');
const { rawBodyOf, verifyHmacSha256 } = require('../../../utils/webhookSignature');

/*
 * Who may call the routes below.
 *
 * Every one of them was `authenticate` and nothing else, and took the society
 * from the request body. Signed in as anyone, you could: create a society;
 * announce a visitor or ring the intercom of a flat in any society; broadcast
 * an emergency to another society's guards; issue a maintenance bill to any
 * flat anywhere; read any flat's meters; and, through /module/:name, read
 * another society's vault, child-security register and resident directory.
 * The CCTV webhook took no credentials at all.
 *
 * They now go through the same per-society capability checks as the rest of
 * the society module (middleware/society-capability.js): the society named in
 * the request is the one the check is answered against, so naming one you do
 * not belong to gets 403.
 */

// --- 1. CORE SOCIETY & MEMBERS ---

// Platform staff create a society directly. A resident registering their own
// society uses POST /society/register (core/routes/dashboards.routes.js),
// which also makes them its first administrator; this route made a society
// nobody could administer, at whatever subscription fee the caller typed.
router.post('/admin/create', authenticate, async (req, res) => {
    try {
        if (!isPlatformStaff(req)) {
            return res.status(403).json({ error: 'Only platform administrators can create a society here. Use /society/register to register your own.' });
        }
        const { name, region_id, address, subscription_fee } = req.body || {};
        if (!name || !String(name).trim()) return res.status(400).json({ error: 'name is required' });
        const fee = Number(subscription_fee) || 0;
        if (fee < 0) return res.status(400).json({ error: 'subscription_fee cannot be negative' });

        const id = uuidv4();
        await query(`INSERT INTO societies (id, name, region_id, address, subscription_fee) VALUES ($1, $2, $3, $4, $5)`,
            [id, String(name).trim(), region_id || null, address || null, fee]
        );
        res.json({ message: 'Society created', societyId: id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/my-society', authenticate, async (req, res) => {
    try {
        const member = await queryOne(`SELECT * FROM society_members WHERE user_id = $1 AND status = 'active'`, [req.user.id]);
        if (!member) return res.status(404).json({ error: 'Not a member of any society' });
        const society = await queryOne(`SELECT * FROM societies WHERE id = $1`, [member.society_id]);
        res.json({ member, society });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// --- 2. GATE SECURITY (VISITORS & INTERCOM) ---
// The gate desk: a guard of this society, or one of its admins covering.
router.post('/gate/request-entry', authenticate, requireCapability(CAPABILITIES.LOG_GATE_ENTRY), async (req, res) => {
    try {
        const { flat_number, visitor_name, visitor_phone, purpose } = req.body || {};
        if (!flat_number || !visitor_name) return res.status(400).json({ error: 'flat_number and visitor_name are required' });
        const society_id = req.societyId;
        const id = uuidv4();
        await query(`INSERT INTO visitor_logs (id, society_id, flat_number, visitor_name, visitor_phone, purpose, guard_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [id, society_id, flat_number, visitor_name, visitor_phone, purpose, req.user.id]
        );

        const supabaseRealtime = req.app.get('supabaseRealtime');
        if (supabaseRealtime) supabaseRealtime.broadcast(`society_${society_id}_flat_${flat_number}`, 'gate:visitor', { id, visitor_name, purpose });

        res.json({ message: 'Entry requested', logId: id });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/intercom/call', authenticate, requireCapability(CAPABILITIES.LOG_GATE_ENTRY), async (req, res) => {
    try {
        const { flat_number } = req.body || {};
        if (!flat_number) return res.status(400).json({ error: 'flat_number is required' });
        const society_id = req.societyId;
        const id = uuidv4();
        await query(`INSERT INTO intercom_logs (id, society_id, guard_id, flat_number, call_status) VALUES ($1, $2, $3, $4, 'initiated')`, [id, society_id, req.user.id, flat_number]);

        const supabaseRealtime = req.app.get('supabaseRealtime');
        if (supabaseRealtime) supabaseRealtime.broadcast(`society_${society_id}_flat_${flat_number}`, 'intercom:incoming', { guard_id: req.user.id });

        res.json({ message: 'Call initiated' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// --- 3. EMERGENCY SOS & CPR ---
// Any member may raise an alarm, in their own society. A resident raises it
// for their own flat; the flat in the request is used only when the caller has
// none on record (a guard, an admin).
router.post('/emergency/sos', authenticate, requireMembership(), async (req, res) => {
    try {
        const type = (req.body || {}).type === 'medical' ? 'medical' : 'security';
        const flat_number = req.societyMembership?.flat_number || (req.body || {}).flat_number || null;
        const society_id = req.societyId;
        const supabaseRealtime = req.app.get('supabaseRealtime');
        if (supabaseRealtime) {
            // Alert guards
            supabaseRealtime.broadcast(`society_${society_id}_guards`, 'emergency:sos', { flat_number, type, raised_by: req.user.id });
            // Alert CPR responders if medical
            if (type === 'medical') {
                supabaseRealtime.broadcast(`society_${society_id}_cpr`, 'emergency:cpr', { flat_number });
            }
        }
        res.json({ message: 'SOS Alert Broadcasted' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// --- 4. MAINTENANCE & EXPENSES ---
router.post('/maintenance/generate', authenticate, requireCapability(CAPABILITIES.MANAGE_SOCIETY), async (req, res) => {
    try {
        const { flat_number, due_date, billing_month } = req.body || {};
        const amount = Number((req.body || {}).amount);
        if (!flat_number || !billing_month) return res.status(400).json({ error: 'flat_number and billing_month are required' });
        if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'amount must be a positive number' });

        const id = uuidv4();
        await query(`INSERT INTO maintenance_bills (id, society_id, flat_number, amount, due_date, billing_month) VALUES ($1, $2, $3, $4, $5, $6)`,
            [id, req.societyId, flat_number, amount, due_date || null, billing_month]
        );
        res.json({ message: 'Bill generated', billId: id });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// --- 5. SMART METERS & TOPUPS ---
// A resident reads the meters of their own flat; the committee reads any flat
// in their society. Flat numbers repeat across societies ("A-101" is in most
// of them), so the society is part of the question — it was not, and this
// returned every A-101 on the platform.
router.get('/meters/:flat_number', authenticate, requireMembership(), async (req, res) => {
    try {
        const own = req.societyMembership?.flat_number;
        const sameFlat = own && String(own).trim().toLowerCase() === String(req.params.flat_number).trim().toLowerCase();
        if (!sameFlat && !(await hasSocietyCapability(req, req.societyId, CAPABILITIES.MANAGE_SOCIETY))) {
            return res.status(403).json({ error: 'You can only view the meters of your own flat.' });
        }
        const result = await query(`SELECT * FROM utility_meters WHERE society_id = $1 AND flat_number = $2`, [req.societyId, req.params.flat_number]);
        res.json({ meters: result.rows || [] });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// --- 6. AI CCTV, IOT BINS & DRONE WEBOOKS ---
// Called by the camera system, not by a person, so there is no session to
// check. It carries an HMAC-SHA256 of the raw body, keyed with
// CCTV_WEBHOOK_SECRET, in X-Webhook-Signature. Without that secret configured
// every delivery is refused: this route used to accept anything from anyone,
// which let any caller put a "threat" on a society's guard screens with a
// picture of their choosing.
router.post('/cctv/webhook', async (req, res) => {
    try {
        const secret = process.env.CCTV_WEBHOOK_SECRET;
        if (!secret) return res.status(503).json({ error: 'CCTV webhook is not configured' });

        const raw = rawBodyOf(req);
        const signature = req.headers['x-webhook-signature'];
        if (raw === null || !verifyHmacSha256(raw, typeof signature === 'string' ? signature : '', secret)) {
            return res.status(401).json({ error: 'Invalid webhook signature' });
        }

        const { society_id, camera_id, snapshot_url } = req.body || {};
        const threat_level = ['low', 'medium', 'high', 'critical'].includes(String((req.body || {}).threat_level).toLowerCase())
            ? String(req.body.threat_level).toLowerCase() : 'low';
        if (!society_id || !camera_id) return res.status(400).json({ error: 'society_id and camera_id are required' });
        // Only a web address: this is rendered as an image on the guard's screen.
        const snapshot = typeof snapshot_url === 'string' && /^https:\/\//i.test(snapshot_url) ? snapshot_url.slice(0, 2000) : null;

        const society = await queryOne('SELECT id FROM societies WHERE id = $1', [society_id]);
        if (!society) return res.status(404).json({ error: 'Unknown society' });

        await query(`INSERT INTO ai_cctv_alerts (id, society_id, camera_id, threat_level, snapshot_url) VALUES ($1, $2, $3, $4, $5)`,
            [uuidv4(), society_id, String(camera_id).slice(0, 100), threat_level, snapshot]
        );
        const supabaseRealtime = req.app.get('supabaseRealtime');
        if (supabaseRealtime) supabaseRealtime.broadcast(`society_${society_id}_guards`, 'cctv:alert', { camera_id, threat_level, snapshot_url: snapshot });
        res.json({ message: 'Alert received' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// --- GENERIC GETTER FOR ALL OTHER MODULES ---
// Fetches a sub-system's rows (polls, notices, classifieds, directory, …) for
// the caller's own society. The table name comes from a fixed list, never from
// the request. Registers that hold other residents' private details are for
// the committee and the gate desk only.
const MEMBER_MODULES = ['society_notices', 'society_helpdesk', 'society_amenities', 'society_polls', 'society_classifieds', 'society_expenses', 'blood_donors', 'group_buy_campaigns', 'society_carpools', 'resident_directory', 'lost_and_found', 'ev_charging_stations'];
const DESK_MODULES = ['daily_staff', 'vehicles', 'parcel_desk', 'child_security', 'pet_registry', 'move_passes', 'society_vault'];
// The tables that have a created_at to sort by. The query sorted every module
// by it, and ten of the nineteen have no such column — expenses, the resident
// directory, lost and found, EV chargers among them — so those answered
// "Server error" every time.
const DATED_MODULES = new Set(['society_notices', 'society_helpdesk', 'society_amenities', 'society_polls', 'society_classifieds', 'blood_donors', 'vehicles', 'parcel_desk', 'move_passes', 'society_vault']);

router.get('/module/:module_name', authenticate, requireMembership(), async (req, res) => {
    try {
        const name = req.params.module_name;
        const desk = DESK_MODULES.includes(name);
        if (!desk && !MEMBER_MODULES.includes(name)) {
            return res.status(400).json({ error: 'Invalid module' });
        }
        if (desk
            && !(await hasSocietyCapability(req, req.societyId, CAPABILITIES.MANAGE_SOCIETY))
            && !(await hasSocietyCapability(req, req.societyId, CAPABILITIES.LOG_GATE_ENTRY))) {
            return res.status(403).json({ error: 'This register is available to the society office and gate desk.' });
        }

        const order = DATED_MODULES.has(name) ? 'created_at DESC' : 'id';
        const result = await query(`SELECT * FROM ${name} WHERE society_id = $1 ORDER BY ${order} LIMIT 50`, [req.societyId]);
        res.json({ data: result.rows || [] });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ─── NOTICES ─────────────────────────────────────────────────────────────────
// The society page reads /society/notices; this router is also mounted there.

/**
 * People waiting to be let into the society.
 *
 * A society is a closed community and the committee decides who is in it. The
 * admin console had a queue for this and no endpoint behind it.
 */
router.get('/members/pending', authenticate, requireCapability(CAPABILITIES.MANAGE_SOCIETY), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT sm.id, sm.flat_number, sm.role, sm.status, sm.created_at,
              u.full_name, u.phone_number
         FROM society_members sm
         LEFT JOIN users u ON u.id = sm.user_id
        WHERE sm.society_id = $1 AND LOWER(COALESCE(sm.status, '')) = 'pending'
        ORDER BY sm.created_at ASC`,
      [req.societyId]
    );

    res.json({ success: true, members: result.rows || result || [] });
  } catch (error) { next(error); }
});

/**
 * Approve or reject an applicant.
 *
 * Scoped by society as well as by member id: the id alone would let a committee
 * member of one society decide an application to another.
 *
 * A rejection deactivates rather than deletes. The row is the record that
 * somebody asked and was turned down, which is exactly what a committee needs
 * when the same person applies again.
 */
router.post('/members/decision', authenticate, requireCapability(CAPABILITIES.MANAGE_SOCIETY), async (req, res, next) => {
  try {
    const { memberId, decision } = req.body;
    if (!memberId || !['approved', 'rejected'].includes(String(decision))) {
      return res.status(400).json({ success: false, message: 'memberId and a decision of approved or rejected are required' });
    }

    const approved = decision === 'approved';
    const result = await query(
      `UPDATE society_members
          SET status = $1, is_active = $2
        WHERE id = $3 AND society_id = $4 AND LOWER(COALESCE(status, '')) = 'pending'`,
      [decision, approved ? 1 : 0, memberId, req.societyId]
    );

    if (result.rowCount === 0) {
      // Either it is not this society's application, or somebody on the
      // committee decided it a moment ago. Both are a 409 rather than a
      // silent success.
      return res.status(409).json({
        success: false,
        message: 'That application is no longer pending, or does not belong to this society.',
      });
    }

    res.json({ success: true, memberId, decision });
  } catch (error) { next(error); }
});

// A society's notice board is for its members. The society used to be taken
// from ?societyId= unchecked, so any signed-in account could read any
// society's notices by naming it.
router.get('/notices', authenticate, requireMembership(), async (req, res, next) => {
  try {
    const societyId = req.societyId;

    const rows = await query(
      `SELECT n.id, n.title, n.content, n.priority, n.created_at, u.full_name AS posted_by_name
         FROM society_notices n
         LEFT JOIN users u ON n.posted_by = u.id
        WHERE n.society_id = $1 AND n.is_active = '1'
        ORDER BY
          CASE WHEN n.priority = 'urgent' THEN 0 WHEN n.priority = 'high' THEN 1 ELSE 2 END,
          n.created_at DESC
        LIMIT 100`,
      [societyId]
    );

    res.json({ success: true, data: rows.rows || rows });
  } catch (error) {
    next(error);
  }
});

/**
 * Posting a notice reaches every phone in the society at once.
 *
 * The society was taken from `req.body.societyId` with no check at all, falling
 * back to the caller's first membership. So any resident of any society could
 * name another society and broadcast into it — and a notice cannot be recalled.
 * requireCapability answers "may this person run *this* society" before the
 * handler sees it, and hands back the verified id on req.societyId.
 */
router.post('/notices', authenticate, requireCapability(CAPABILITIES.MANAGE_SOCIETY), async (req, res, next) => {
  try {
    const { title, content, priority } = req.body;
    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and content are required' });
    }

    const societyId = req.societyId;

    const VALID = ['normal', 'high', 'urgent'];
    const id = uuidv4();
    await query(
      `INSERT INTO society_notices (id, society_id, posted_by, title, content, priority, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, '1')`,
      [id, societyId, req.user.id, title, content, VALID.includes(priority) ? priority : 'normal']
    );

    // Open apps show it without a refresh.
    const io = req.app.get('io');
    if (io) io.to(`society_${societyId}`).emit('SOCIETY_NOTICE', { id, title, priority: VALID.includes(priority) ? priority : 'normal' });

    res.status(201).json({ success: true, id, message: 'Notice posted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
