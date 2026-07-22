const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../../../config/database');
const { authenticate } = require('../../../middleware/auth.middleware');
const { v4: uuidv4 } = require('uuid');

// --- 1. CORE SOCIETY & MEMBERS ---
router.post('/admin/create', authenticate, async (req, res) => {
    try {
        const { name, region_id, address, subscription_fee } = req.body;
        const id = uuidv4();
        await query(
            `INSERT INTO societies (id, name, region_id, address, subscription_fee) VALUES ($1, $2, $3, $4, $5)`,
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
        await query(
            `INSERT INTO visitor_logs (id, society_id, flat_number, visitor_name, visitor_phone, purpose, guard_id) 
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
        await query(
            `INSERT INTO maintenance_bills (id, society_id, flat_number, amount, due_date, billing_month) VALUES ($1, $2, $3, $4, $5, $6)`,
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
        await query(
            `INSERT INTO ai_cctv_alerts (id, society_id, camera_id, threat_level, snapshot_url) VALUES ($1, $2, $3, $4, $5)`,
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

module.exports = router;
