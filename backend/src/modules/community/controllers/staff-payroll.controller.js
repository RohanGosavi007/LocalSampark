const { query, queryMany } = require('../../../config/database');
const { v4: uuidv4 } = require('uuid');

const generateMonthlyPayroll = async (req, res, next) => {
    try {
        const adminId = req.user.id;
        const { societyId, month, year } = req.body;
        const monthStr = `${year}-${String(month).padStart(2, '0')}`; // format YYYY-MM

        // In a real system, you'd fetch active staff, iterate them, and calculate
        // For demonstration, we assume we fetch staff and their attendance
        
        // Mock processing:
        // const staffList = await queryMany('SELECT * FROM society_staff WHERE society_id = $1 AND is_active = true', [societyId]);
        
        const id = uuidv4();
        await query(`INSERT INTO society_staff_payroll 
            (id, society_id, staff_name, month, total_working_days, present_days, net_payable, approved_by) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [id, societyId, 'Security Guard Team', monthStr, 30, 30, 15000, adminId]
        );

        res.json({ success: true, message: 'Payroll generated successfully for ' + monthStr });
    } catch (error) { next(error); }
};

const getPayrollSummary = async (req, res, next) => {
    try {
        const { societyId, month } = req.query;
        const payroll = await queryMany('SELECT * FROM society_staff_payroll WHERE society_id = $1 AND month = $2', [societyId, month]);
        res.json({ success: true, data: payroll });
    } catch (error) { next(error); }
};

module.exports = {
    generateMonthlyPayroll,
    getPayrollSummary
};
