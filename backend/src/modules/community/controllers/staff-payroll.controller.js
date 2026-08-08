const { query, queryMany } = require('../../../config/database.sqlite');
const { v4: uuidv4 } = require('uuid');

const generateMonthlyPayroll = async (req, res) => {
    try {
        const adminId = req.user.id;
        const { societyId, month, year } = req.body;
        const monthStr = `${year}-${String(month).padStart(2, '0')}`; // format YYYY-MM

        // In a real system, you'd fetch active staff, iterate them, and calculate
        // For demonstration, we assume we fetch staff and their attendance
        
        // Mock processing:
        // const staffList = await queryMany('SELECT * FROM society_staff WHERE society_id = ? AND is_active = 1', [societyId]);
        
        const id = uuidv4();
        await query(
            `INSERT INTO society_staff_payroll 
            (id, society_id, staff_name, month, total_working_days, present_days, net_payable, approved_by) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, societyId, 'Security Guard Team', monthStr, 30, 30, 15000, adminId]
        );

        res.json({ success: true, message: 'Payroll generated successfully for ' + monthStr });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getPayrollSummary = async (req, res) => {
    try {
        const { societyId, month } = req.query;
        const payroll = await queryMany('SELECT * FROM society_staff_payroll WHERE society_id = ? AND month = ?', [societyId, month]);
        res.json({ success: true, data: payroll });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    generateMonthlyPayroll,
    getPayrollSummary
};
