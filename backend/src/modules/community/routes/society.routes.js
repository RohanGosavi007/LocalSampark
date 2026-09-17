const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../../../config/database');
const { authenticate } = require('../../../middleware/auth.middleware');
const { v4: uuidv4 } = require('uuid');
const { requireCapability, CAPABILITIES } = require('../middleware/society-capability');

// --- 1. CORE SOCIETY & MEMBERS ---
router.post('/admin/create', authenticate, async (req, res) => {
    try {
        const { name, region_id, address, subscription_fee } = req.body;
        const id = uuidv4();
        await query(`INSERT INTO societies (id, name, region_id, address, subscription_fee) VALUES ($1, $2, $3, $4, $5)`,
            [id, name, region_id, address, subscription_fee || 0]
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
router.post('/gate/request-entry', authenticate, async (req, res) => {
    try {
        const { society_id, flat_number, visitor_name, visitor_phone, purpose } = req.body;
        const id = uuidv4();
        await query(`INSERT INTO visitor_logs (id, society_id, flat_number, visitor_name, visitor_phone, purpose, guard_id) 
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [id, society_id, flat_number, visitor_name, visitor_phone, purpose, req.user.id]
        );
        
        // Push notification / Supabase broadcast to the resident would go here
        const supabaseRealtime = req.app.get('supabaseRealtime');
        if (supabaseRealtime) supabaseRealtime.broadcast(`society_${society_id}_flat_${flat_number}`, 'gate:visitor', { id, visitor_name, purpose });

        res.json({ message: 'Entry requested', logId: id });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/intercom/call', authenticate, async (req, res) => {
    try {
        const { society_id, flat_number } = req.body;
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
router.post('/emergency/sos', authenticate, async (req, res) => {
    try {
        const { society_id, flat_number, type } = req.body; // type: 'security' or 'medical'
        const supabaseRealtime = req.app.get('supabaseRealtime');
        if (supabaseRealtime) {
            // Alert guards
            supabaseRealtime.broadcast(`society_${society_id}_guards`, 'emergency:sos', { flat_number, type });
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
router.post('/maintenance/generate', authenticate, async (req, res) => {
    try {
        const { society_id, flat_number, amount, due_date, billing_month } = req.body;
        const id = uuidv4();
        await query(`INSERT INTO maintenance_bills (id, society_id, flat_number, amount, due_date, billing_month) VALUES ($1, $2, $3, $4, $5, $6)`,
            [id, society_id, flat_number, amount, due_date, billing_month]
        );
        res.json({ message: 'Bill generated', billId: id });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// --- 5. SMART METERS & TOPUPS ---
router.get('/meters/:flat_number', authenticate, async (req, res) => {
    try {
        const result = await query(`SELECT * FROM utility_meters WHERE flat_number = $1`, [req.params.flat_number]);
        res.json({ meters: result.rows || [] });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// --- 6. AI CCTV, IOT BINS & DRONE WEBOOKS ---
router.post('/cctv/webhook', async (req, res) => {
    try {
        const { society_id, camera_id, threat_level, snapshot_url } = req.body;
        await query(`INSERT INTO ai_cctv_alerts (id, society_id, camera_id, threat_level, snapshot_url) VALUES ($1, $2, $3, $4, $5)`,
            [uuidv4(), society_id, camera_id, threat_level, snapshot_url]
        );
        const supabaseRealtime = req.app.get('supabaseRealtime');
        if (supabaseRealtime) supabaseRealtime.broadcast(`society_${society_id}_guards`, 'cctv:alert', { camera_id, threat_level, snapshot_url });
        res.json({ message: 'Alert received' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// --- GENERIC GETTER FOR ALL OTHER MODULES ---
// A versatile endpoint to fetch data for specific sub-systems (Polls, Notices, Classifieds, Directory, etc)
router.get('/module/:module_name', authenticate, async (req, res) => {
    try {
        const { society_id } = req.query;
        const allowedModules = ['society_notices', 'society_helpdesk', 'society_amenities', 'society_polls', 'society_classifieds', 'daily_staff', 'vehicles', 'parcel_desk', 'child_security', 'pet_registry', 'move_passes', 'society_vault', 'society_expenses', 'blood_donors', 'group_buy_campaigns', 'society_carpools', 'resident_directory', 'lost_and_found', 'ev_charging_stations'];
        
        if (!allowedModules.includes(req.params.module_name)) {
            return res.status(400).json({ error: 'Invalid module' });
        }
        
        const result = await query(`SELECT * FROM ${req.params.module_name} WHERE society_id = $1 ORDER BY created_at DESC LIMIT 50`, [society_id]);
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

router.get('/notices', authenticate, async (req, res, next) => {
  try {
    const societyId = req.query.societyId
      || req.user.society_id
      || (await queryOne('SELECT society_id FROM society_members WHERE user_id = $1 LIMIT 1', [req.user.id]))?.society_id;

    if (!societyId) {
      return res.status(403).json({ success: false, message: 'No society is associated with this account' });
    }

    const rows = await query(
      `SELECT n.id, n.title, n.content, n.priority, n.created_at, u.full_name AS posted_by_name
         FROM society_notices n
         LEFT JOIN users u ON n.posted_by = u.id
        WHERE n.society_id = $1 AND n.is_active = true
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
       VALUES ($1, $2, $3, $4, $5, $6, true)`,
      [id, societyId, req.user.id, title, content, VALID.includes(priority) ? priority : 'normal']
    );

    res.status(201).json({ success: true, id, message: 'Notice posted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
