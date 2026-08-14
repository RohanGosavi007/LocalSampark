const { query, queryMany, queryOne } = require('../../../config/database');
const { v4: uuidv4 } = require('uuid');

const createShift = async (req, res, next) => {
    try {
        const societyId = await getSocietyIdForUser(req.user.id);
        const { guardId, shiftDate, shiftType, startTime, endTime } = req.body;
        if (!guardId || !shiftDate || !shiftType) return res.status(400).json({ error: 'Missing required fields' });

        const id = uuidv4();
        await query('INSERT INTO society_guard_shifts (id, society_id, guard_id, shift_date, shift_type, start_time, end_time, created_by, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)',
            [id, societyId, guardId, shiftDate, shiftType, startTime, endTime, req.user.id]
        );
        res.status(201).json({ success: true, data: { id } });
    } catch (error) { next(error); }
};

const getRoster = async (req, res, next) => {
    try {
        const societyId = await getSocietyIdForUser(req.user.id);
        const { dateFrom, dateTo } = req.query;
        let sql = `
            SELECT sgs.*, u.full_name as guard_name, u.phone_number 
            FROM society_guard_shifts sgs 
            JOIN users u ON sgs.guard_id = u.id 
            WHERE sgs.society_id = $1
        `;
        const params = [societyId];
        
        if (dateFrom) { sql += ' AND sgs.shift_date >= ?'; params.push(dateFrom); }
        if (dateTo) { sql += ' AND sgs.shift_date <= ?'; params.push(dateTo); }
        
        sql += ' ORDER BY sgs.shift_date ASC, sgs.start_time ASC';

        const shifts = await queryMany(sql, params);
        res.json({ success: true, data: shifts });
    } catch (error) { next(error); }
};

const markShiftAttendance = async (req, res, next) => {
    try {
        const { shiftId, action } = req.body; // action: 'check_in' or 'check_out'
        const shift = await queryOne('SELECT * FROM society_guard_shifts WHERE id = $1', [shiftId]);
        if (!shift) return res.status(404).json({ error: 'Shift not found' });

        if (action === 'check_in') {
            await query('UPDATE society_guard_shifts SET check_in_time = CURRENT_TIMESTAMP WHERE id = $1', [shiftId]);
        } else if (action === 'check_out') {
            await query('UPDATE society_guard_shifts SET check_out_time = CURRENT_TIMESTAMP WHERE id = $1', [shiftId]);
        }
        res.json({ success: true, message: `Shift ${action === 'check_in' ? 'checked in' : 'checked out'}` });
    } catch (error) { next(error); }
};

async function getSocietyIdForUser(userId) {
    const member = await queryOne('SELECT society_id FROM society_members WHERE user_id = $1 AND is_active = true', [userId]);
    return member ? member.society_id : null;
}

module.exports = {
    createShift,
    getRoster,
    markShiftAttendance
};
