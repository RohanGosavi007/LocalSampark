const { query, queryOne, queryMany } = require('../../../config/database.sqlite');
const { v4: uuidv4 } = require('uuid');

const configureGate = async (req, res) => {
    try {
        const { societyId, gateName, gateType, locationDescription } = req.body;
        const id = uuidv4();
        await query(
            'INSERT INTO society_gates (id, society_id, gate_name, gate_type, location_description) VALUES (?, ?, ?, ?, ?)',
            [id, societyId, gateName, gateType, locationDescription]
        );
        res.json({ success: true, message: 'Gate configured successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

const assignGuardToGate = async (req, res) => {
    try {
        const { gateId, guardIds } = req.body;
        await query('UPDATE society_gates SET assigned_guards = ? WHERE id = ?', [JSON.stringify(guardIds), gateId]);
        res.json({ success: true, message: 'Guards assigned to gate' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

const lookupVehicle = async (req, res) => {
    try {
        const { societyId, vehicleNumber } = req.query;
        const vehicle = await queryOne('SELECT * FROM vehicles WHERE vehicle_number = ?', [vehicleNumber]);
        
        if (vehicle) {
            const owner = await queryOne('SELECT flat_number, tenant_name FROM society_flat_ledger WHERE society_id = ? AND member_id = ?', [societyId, vehicle.owner_id]);
            res.json({ success: true, data: { vehicle, owner } });
        } else {
            res.json({ success: true, data: null, message: 'Vehicle not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getVehicleLog = async (req, res) => {
    try {
        const { societyId } = req.query;
        const logs = await queryMany('SELECT * FROM society_vehicle_log WHERE society_id = ? ORDER BY created_at DESC LIMIT 100', [societyId]);
        res.json({ success: true, data: logs });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getUtilityHistory = async (req, res) => {
    try {
        const { societyId } = req.query;
        const logs = await queryMany('SELECT * FROM society_utility_deliveries WHERE society_id = ? ORDER BY created_at DESC LIMIT 100', [societyId]);
        res.json({ success: true, data: logs });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getGateDashboard = async (req, res) => {
    try {
        const { societyId } = req.query;
        const gates = await queryMany('SELECT * FROM society_gates WHERE society_id = ? AND is_active = 1', [societyId]);
        
        for (const gate of gates) {
            gate.todayVehicles = (await queryOne('SELECT COUNT(*) as cnt FROM society_vehicle_log WHERE gate_id = ? AND date(created_at) = date("now")', [gate.id])).cnt;
            gate.todayUtilities = (await queryOne('SELECT COUNT(*) as cnt FROM society_utility_deliveries WHERE society_id = ? AND date(created_at) = date("now")', [societyId])).cnt; // usually utilities aren't strictly by gate, just for the society, but we can aggregate here
        }
        
        res.json({ success: true, data: gates });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    configureGate,
    assignGuardToGate,
    lookupVehicle,
    getVehicleLog,
    getUtilityHistory,
    getGateDashboard
};
