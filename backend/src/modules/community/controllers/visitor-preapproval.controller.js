const { query, queryOne, withTransaction } = require('../../../config/database');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const qrcode = require('qrcode');

const createPreApproval = async (req, res, next) => {
    try {
        const residentId = req.user.id;
        const { societyId, flatNumber, visitorName, visitorPhone, purpose, vehicleNumber, validFrom, validUntil, maxUses, leaveAtGate } = req.body;

        if (!societyId || !flatNumber || !visitorName || !validFrom || !validUntil) {
            return res.status(400).json({ error: 'Missing required fields for pre-approval' });
        }

        // Generate 6-digit passcode
        const passcode = crypto.randomInt(100000, 999999).toString();
        const qrDataString = JSON.stringify({ societyId, passcode, flatNumber });
        const qrDataUrl = await qrcode.toDataURL(qrDataString);

        const id = uuidv4();
        await query(`INSERT INTO society_visitor_preapprovals 
            (id, society_id, resident_id, flat_number, visitor_name, visitor_phone, passcode, qr_data, purpose, vehicle_number, valid_from, valid_until, max_uses, leave_at_gate) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
            [id, societyId, residentId, flatNumber, visitorName, visitorPhone, passcode, qrDataUrl, purpose, vehicleNumber, validFrom, validUntil, maxUses || 1, leaveAtGate ? 1 : 0]
        );

        res.json({
            success: true,
            message: 'Visitor pre-approval created',
            data: {
                id,
                passcode,
                qrData: qrDataUrl,
                validUntil
            }
        });
    } catch (error) {
        console.error('Create pre-approval error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const sharePasscode = async (req, res, next) => {
    try {
        const residentId = req.user.id;
        const { id } = req.params;

        const preApproval = await queryOne('SELECT * FROM society_visitor_preapprovals WHERE id = $1 AND resident_id = $2', [id, residentId]);
        
        if (!preApproval) {
            return res.status(404).json({ error: 'Pre-approval not found' });
        }

        const shareText = `You have been pre-approved to visit our society. Your gate passcode is: ${preApproval.passcode}. Show this at the security gate. Valid until ${new Date(preApproval.valid_until).toLocaleString()}.`;

        res.json({
            success: true,
            shareText
        });
    } catch (error) { next(error); }
};

const verifyPasscode = async (req, res, next) => {
    try {
        const { societyId, passcode } = req.body;
        // In a real scenario, check if the req.user is a guard for this society

        const preApproval = await queryOne(`SELECT * FROM society_visitor_preapprovals 
             WHERE society_id = $1 AND passcode = $2 AND status = 'active'`,
            [societyId, passcode]
        );

        if (!preApproval) {
            return res.status(404).json({ error: 'Invalid or revoked passcode' });
        }

        const now = new Date();
        const validUntil = new Date(preApproval.valid_until);
        const validFrom = new Date(preApproval.valid_from);

        if (now < validFrom) {
            return res.status(400).json({ error: 'Passcode not active yet' });
        }

        if (now > validUntil || preApproval.used_count >= preApproval.max_uses) {
            await query('UPDATE society_visitor_preapprovals SET status = "expired" WHERE id = $1', [preApproval.id]);
            return res.status(400).json({ error: 'Passcode expired or maximum uses reached' });
        }

        // Auto-approve logic
        await withTransaction(async () => {
            // Increment usage
            await query('UPDATE society_visitor_preapprovals SET used_count = used_count + 1 WHERE id = $1', [preApproval.id]);
            
            // Create visitor log
            const visitorId = uuidv4();
            await query(`INSERT INTO society_visitors 
                (id, society_id, visitor_name, visitor_phone, purpose, vehicle_number, flat_number, status, checked_in_at, passcode_used, is_leave_at_gate) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, 'checked_in', CURRENT_TIMESTAMP, $8, $9)`,
                [visitorId, societyId, preApproval.visitor_name, preApproval.visitor_phone, preApproval.purpose, preApproval.vehicle_number, preApproval.flat_number, passcode, preApproval.leave_at_gate]
            );
        });

        res.json({
            success: true,
            message: 'Visitor auto-approved',
            data: {
                flatNumber: preApproval.flat_number,
                visitorName: preApproval.visitor_name,
                leaveAtGate: preApproval.leave_at_gate === 1
            }
        });
    } catch (error) {
        console.error('Verify passcode error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const listMyPreApprovals = async (req, res, next) => {
    try {
        const residentId = req.user.id;
        const approvals = await query('SELECT * FROM society_visitor_preapprovals WHERE resident_id = $1 ORDER BY created_at DESC', [residentId]);
        res.json({ success: true, data: approvals.rows || approvals });
    } catch (error) { next(error); }
};

const revokePreApproval = async (req, res, next) => {
    try {
        const residentId = req.user.id;
        const { id } = req.params;
        await query('UPDATE society_visitor_preapprovals SET status = "revoked" WHERE id = $1 AND resident_id = $2', [id, residentId]);
        res.json({ success: true, message: 'Pre-approval revoked' });
    } catch (error) { next(error); }
};

const toggleLeaveAtGate = async (req, res, next) => {
    try {
        const residentId = req.user.id;
        const { id } = req.body;
        
        await query('UPDATE society_visitor_preapprovals SET leave_at_gate = CASE WHEN leave_at_gate = 1 THEN 0 ELSE 1 END WHERE id = $1 AND resident_id = $2', [id, residentId]);
        res.json({ success: true, message: 'Leave at gate toggled' });
    } catch (error) { next(error); }
};

const blacklistVisitor = async (req, res, next) => {
    try {
        const adminId = req.user.id;
        const { societyId, personName, personPhone, reason } = req.body;
        
        if (!societyId || !personName || !reason) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const id = uuidv4();
        await query('INSERT INTO society_visitor_blacklist (id, society_id, name, phone, reason, added_by) VALUES ($1, $2, $3, $4, $5, $6)',
            [id, societyId, personName, personPhone, reason, adminId]
        );

        res.json({ success: true, message: 'Visitor blacklisted' });
    } catch (error) { next(error); }
};

const getBlacklist = async (req, res, next) => {
    try {
        const { societyId } = req.query;
        if (!societyId) return res.status(400).json({ error: 'Society ID required' });
        
        const list = await query('SELECT * FROM society_visitor_blacklist WHERE society_id = $1', [societyId]);
        res.json({ success: true, data: list.rows || list });
    } catch (error) { next(error); }
};

const createCabPass = async (req, res, next) => {
    try {
        const residentId = req.user.id;
        const { societyId, flatNumber, cabService, driverName, vehicleNumber, estimatedArrival } = req.body;

        const passcode = crypto.randomInt(100000, 999999).toString();
        const id = uuidv4();

        await query(`INSERT INTO society_cab_preapprovals 
            (id, society_id, resident_id, flat_number, cab_service, driver_name, vehicle_number, passcode, estimated_arrival) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [id, societyId, residentId, flatNumber, cabService, driverName, vehicleNumber, passcode, estimatedArrival]
        );

        res.json({ success: true, data: { passcode, estimatedArrival } });
    } catch (error) { next(error); }
};

const verifyCabPass = async (req, res, next) => {
    try {
        const { societyId, passcode } = req.body;
        
        const cabPass = await queryOne(`SELECT * FROM society_cab_preapprovals WHERE society_id = $1 AND passcode = $2 AND status = 'active'`,
            [societyId, passcode]
        );

        if (!cabPass) {
            return res.status(404).json({ error: 'Invalid or used cab pass' });
        }

        await query('UPDATE society_cab_preapprovals SET status = "used", used_at = CURRENT_TIMESTAMP WHERE id = $1', [cabPass.id]);

        res.json({
            success: true,
            data: { flatNumber: cabPass.flat_number, cabService: cabPass.cab_service }
        });
    } catch (error) { next(error); }
};

module.exports = {
    createPreApproval,
    sharePasscode,
    verifyPasscode,
    listMyPreApprovals,
    revokePreApproval,
    toggleLeaveAtGate,
    blacklistVisitor,
    getBlacklist,
    createCabPass,
    verifyCabPass
};
