const { query, queryOne, withTransaction } = require('../../../config/database');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const requestMovePass = async (req, res, next) => {
    try {
        const residentId = req.user.id;
        const { societyId, moveType, moveDate, moversCompany, moversVehicleNumber, flatNumber } = req.body;
        // moveType: 'move_in' or 'move_out'

        const id = uuidv4();
        
        // Auto-check dues for Move-Out
        let outstandingDues = 0;
        if (moveType === 'move_out') {
            const flat = await queryOne('SELECT advance_balance FROM society_flat_ledger WHERE society_id = $1 AND flat_number = $2', [societyId, flatNumber]);
            const arrears = await queryOne('SELECT SUM(total_amount - paid_amount) as due FROM society_maintenance_bills WHERE society_id = $1 AND flat_number = $2 AND payment_status != "paid"', [societyId, flatNumber]);
            outstandingDues = (arrears?.due || 0) - (flat?.advance_balance || 0);
        }

        const passcode = crypto.randomInt(100000, 999999).toString();

        await query(`INSERT INTO move_passes 
            (id, society_id, requested_by, flat_owner_id, move_type, move_date, clearance_status, outstanding_dues, gate_passcode, movers_company, movers_vehicle_number) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [id, societyId, residentId, null, moveType, moveDate, outstandingDues > 0 ? 'pending_dues' : 'pending_admin', outstandingDues > 0 ? outstandingDues : 0, passcode, moversCompany, moversVehicleNumber]
        );

        res.json({ success: true, message: 'Move pass requested', data: { id, outstandingDues, clearance_status: outstandingDues > 0 ? 'pending_dues' : 'pending_admin' } });
    } catch (error) { next(error); }
};

const getMovePasses = async (req, res, next) => {
    try {
        const residentId = req.user.id;
        const passes = await query('SELECT * FROM move_passes WHERE requested_by = $1 ORDER BY created_at DESC', [residentId]);
        res.json({ success: true, data: passes.rows || passes });
    } catch (error) { next(error); }
};

const adminApproveMovePass = async (req, res, next) => {
    try {
        const adminId = req.user.id;
        const { passId } = req.body;

        const pass = await queryOne('SELECT * FROM move_passes WHERE id = $1', [passId]);
        if (!pass) return res.status(404).json({ error: 'Pass not found' });

        if (pass.outstanding_dues > 0) {
            return res.status(400).json({ error: 'Cannot approve pass until dues are cleared.' });
        }

        await query('UPDATE move_passes SET clearance_status = "approved", admin_approved_at = CURRENT_TIMESTAMP, admin_approved_by = $1 WHERE id = $2', [adminId, passId]);
        
        res.json({ success: true, message: 'Move pass approved' });
    } catch (error) { next(error); }
};

const initiatePoliceVerification = async (req, res, next) => {
    try {
        const residentId = req.user.id;
        const { societyId, flatNumber, personType, personName, personPhone, idProofType, idProofNumber, idProofUrl } = req.body;
        // personType: 'tenant', 'staff'

        const id = uuidv4();
        await query(`INSERT INTO society_police_verification 
            (id, society_id, flat_number, person_type, person_name, person_phone, id_proof_type, id_proof_number, id_proof_url) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [id, societyId, flatNumber, personType, personName, personPhone, idProofType, idProofNumber, idProofUrl]
        );

        res.json({ success: true, message: 'Verification initiated', data: { id } });
    } catch (error) { next(error); }
};

module.exports = {
    requestMovePass,
    getMovePasses,
    adminApproveMovePass,
    initiatePoliceVerification
};
