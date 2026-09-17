const { query, queryMany, queryOne } = require('../../../config/database');
const { v4: uuidv4 } = require('uuid');

const createShift = async (req, res, next) => {
    try {
        const societyId = await getSocietyIdForUser(req.user.id, req);
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
        const societyId = await getSocietyIdForUser(req.user.id, req);
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
            await query('UPDATE society_guard_shifts SET actual_start = CURRENT_TIMESTAMP WHERE id = $1', [shiftId]);
        } else if (action === 'check_out') {
            await query('UPDATE society_guard_shifts SET actual_end = CURRENT_TIMESTAMP WHERE id = $1', [shiftId]);
        }
        res.json({ success: true, message: `Shift ${action === 'check_in' ? 'checked in' : 'checked out'}` });
    } catch (error) { next(error); }
};

/**
 * The society for this request comes from req.societyId, set by
 * requireCapability after it has verified the caller holds the capability *in
 * that society*.
 *
 * Each of these controllers used to carry its own copy of this helper, which
 * returned the caller's first active membership with no ordering. The guard in
 * front validated a different id — the one the request named — so the society
 * that was authorised and the society that was written to were resolved
 * independently. For a committee member who also lives elsewhere that is a
 * privilege escalation.
 */
async function getSocietyIdForUser(userId, req) {
  if (req && req.societyId) return req.societyId;
  // No resolved society means the guard did not run. Refusing is the only safe
  // answer; guessing a membership is the behaviour being removed.
  return null;
}

module.exports = {
    createShift,
    getRoster,
    markShiftAttendance
};
