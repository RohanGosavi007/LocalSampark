const { query, queryOne, queryMany, withTransaction } = require('../../../config/database');
const { v4: uuidv4 } = require('uuid');

const getPatrolRoutes = async (req, res, next) => {
    try {
        const { societyId } = req.query;
        const routes = await queryMany('SELECT * FROM society_patrol_routes WHERE society_id = $1 AND is_active = true', [societyId]);
        res.json({ success: true, data: routes });
    } catch (error) { next(error); }
};

const startPatrol = async (req, res, next) => {
    try {
        const guardId = req.user.id;
        const { routeId, societyId } = req.body;

        const route = await queryOne('SELECT * FROM society_patrol_routes WHERE id = $1', [routeId]);
        if (!route) return res.status(404).json({ error: 'Route not found' });

        const logId = uuidv4();
        await query(`INSERT INTO society_patrol_logs 
            (id, route_id, guard_id, society_id, started_at, status, checkpoints_scanned) 
            VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, 'in_progress', '[]')`,
            [logId, routeId, guardId, societyId]
        );

        res.json({ success: true, data: { logId } });
    } catch (error) { next(error); }
};

const scanCheckpoint = async (req, res, next) => {
    try {
        const guardId = req.user.id;
        const { logId, checkpointId } = req.body;

        const log = await queryOne('SELECT * FROM society_patrol_logs WHERE id = $1 AND guard_id = $2', [logId, guardId]);
        if (!log) return res.status(404).json({ error: 'Patrol log not found' });

        let scanned = JSON.parse(log.checkpoints_scanned || '[]');
        if (!scanned.includes(checkpointId)) {
            scanned.push(checkpointId);
            await query('UPDATE society_patrol_logs SET checkpoints_scanned = $1 WHERE id = $2', [JSON.stringify(scanned), logId]);
        }

        res.json({ success: true, message: 'Checkpoint scanned', data: scanned });
    } catch (error) { next(error); }
};

const endPatrol = async (req, res, next) => {
    try {
        const guardId = req.user.id;
        const { logId, notes } = req.body;

        const log = await queryOne('SELECT * FROM society_patrol_logs WHERE id = $1 AND guard_id = $2', [logId, guardId]);
        if (!log) return res.status(404).json({ error: 'Patrol log not found' });

        const route = await queryOne('SELECT * FROM society_patrol_routes WHERE id = $1', [log.route_id]);
        const expectedCheckpoints = JSON.parse(route.checkpoints || '[]');
        const scannedCheckpoints = JSON.parse(log.checkpoints_scanned || '[]');

        const total = expectedCheckpoints.length;
        const missed = total - scannedCheckpoints.length;
        const status = missed === 0 ? 'completed' : 'incomplete';

        await query('UPDATE society_patrol_logs SET completed_at = CURRENT_TIMESTAMP, status = $1, missed_checkpoints = $2, total_checkpoints = $3, notes = $4 WHERE id = $5',
            [status, missed, total, notes, logId]
        );

        res.json({ success: true, message: `Patrol ${status}. ${missed} missed checkpoints.` });
    } catch (error) { next(error); }
};

const logVehicle = async (req, res, next) => {
    try {
        const guardId = req.user.id;
        const { societyId, vehicleNumber, vehicleType, flatNumber, direction, gateId, photo_url, ocr_confidence } = req.body;
        // Direction: 'in' or 'out'

        // Check if it's a resident vehicle
        const residentVehicle = await queryOne('SELECT id, flat_number FROM society_vehicles WHERE vehicle_number = $1 AND society_id = $2 AND is_active = true', [vehicleNumber, societyId]);
        const isResident = residentVehicle ? 1 : 0;
        const finalFlatNumber = residentVehicle ? residentVehicle.flat_number : flatNumber;

        const id = uuidv4();
        await query(`INSERT INTO society_vehicle_log 
            (id, society_id, vehicle_number, vehicle_type, flat_number, direction, gate_id, guard_id, photo_url, ocr_confidence, is_resident_vehicle) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [id, societyId, vehicleNumber, vehicleType, finalFlatNumber, direction, gateId, guardId, photo_url, ocr_confidence, isResident]
        );

        res.json({ success: true, message: `Vehicle ${direction} logged successfully`, data: { isResident, flatNumber: finalFlatNumber } });
    } catch (error) { next(error); }
};

const logUtilityDelivery = async (req, res, next) => {
    try {
        const guardId = req.user.id;
        const { societyId, vehicleType, vehicleNumber, vendorName, quantity, challanNumber, notes } = req.body;
        // vehicleType e.g., 'water_tanker', 'diesel', 'lpg'

        const id = uuidv4();
        await query(`INSERT INTO society_utility_deliveries 
            (id, society_id, vehicle_type, vehicle_number, vendor_name, quantity, challan_number, entry_time, logged_by, notes) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, $8, $9)`,
            [id, societyId, vehicleType, vehicleNumber, vendorName, quantity, challanNumber, guardId, notes]
        );

        res.json({ success: true, message: `${vehicleType} logged successfully` });
    } catch (error) { next(error); }
};

const rateTarget = async (req, res, next) => {
    try {
        const residentId = req.user.id;
        const { societyId, targetId, targetType, rating, feedback } = req.body;
        
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Rating must be between 1 and 5' });
        }

        const id = uuidv4();
        await query(`INSERT INTO society_ratings 
            (id, society_id, resident_id, target_id, target_type, rating, feedback, created_at) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
            [id, societyId, residentId, targetId, targetType, rating, feedback || '']
        );

        res.json({ success: true, message: 'Rating submitted successfully' });
    } catch (error) { next(error); }
};

const triggerIntercom = async (req, res, next) => {
    try {
        const callerId = req.user.id;
        const { societyId, receiverId, flatNumber } = req.body;

        const id = uuidv4();
        await query(`INSERT INTO society_intercom_logs 
            (id, society_id, caller_id, receiver_id, flat_number, call_status, created_at) 
            VALUES ($1, $2, $3, $4, $5, 'initiated', CURRENT_TIMESTAMP)`,
            [id, societyId, callerId, receiverId, flatNumber || '']
        );

        // Emit SIP/WebRTC call signal via Supabase Realtime
        const supabaseRealtime = req.app.get('supabaseRealtime');
        if (supabaseRealtime) {
            supabaseRealtime.broadcast(`user:${receiverId}`, 'society:intercom:incoming', { 
                callId: id, 
                callerId, 
                flatNumber,
                timestamp: new Date().toISOString() 
            });
        }

        res.json({ success: true, message: 'Intercom call initiated', data: { callId: id } });
    } catch (error) { next(error); }
};

module.exports = {
    getPatrolRoutes,
    startPatrol,
    scanCheckpoint,
    endPatrol,
    logVehicle,
    logUtilityDelivery,
    rateTarget,
    triggerIntercom
};
