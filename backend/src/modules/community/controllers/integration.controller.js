const { query, queryMany, queryOne } = require('../../../config/database');
const exceljs = require('exceljs');

// ═══════════════════════════════════════════════════════════════
// TALLY TDL / XML EXPORT (Phase 10.2)
// ═══════════════════════════════════════════════════════════════

const exportTallyXML = async (req, res, next) => {
    try {
        const societyId = await getSocietyIdForUser(req.user.id);
        const { month } = req.query; // Format: YYYY-MM
        
        const result = await query(`SELECT smb.*, u.name as member_name 
             FROM society_maintenance_bills smb
             JOIN society_members sm ON smb.member_id = sm.id
             JOIN users u ON sm.user_id = u.id
             WHERE smb.society_id = $1 AND smb.month = $2 AND smb.payment_status = 'paid'`,
            [societyId, month]
        );
        const bills = result.rows || result || [];

        // Generate Tally XML
        let xml = `<ENVELOPE>\n<HEADER>\n<TALLYREQUEST>Import Data</TALLYREQUEST>\n</HEADER>\n<BODY>\n<IMPORTDATA>\n<REQUESTDESC>\n<REPORTNAME>Vouchers</REPORTNAME>\n</REQUESTDESC>\n<REQUESTDATA>\n`;

        for (const bill of bills) {
            xml += `<TALLYMESSAGE xmlns:UDF="TallyUDF">\n`;
            xml += `<VOUCHER VCHTYPE="Receipt" ACTION="Create">\n`;
            xml += `<DATE>${bill.paid_at ? new Date(bill.paid_at).toISOString().split('T')[0].replace(/-/g, '') : ''}</DATE>\n`;
            xml += `<NARRATION>Maintenance Receipt for Flat ${bill.flat_number} - ${month}</NARRATION>\n`;
            xml += `<VOUCHERTYPENAME>Receipt</VOUCHERTYPENAME>\n`;
            xml += `<VOUCHERNUMBER>${bill.id.toString().substring(0, 8)}</VOUCHERNUMBER>\n`;
            xml += `<ALLLEDGERENTRIES.LIST>\n`;
            xml += `<LEDGERNAME>${bill.member_name} (Flat ${bill.flat_number})</LEDGERNAME>\n`;
            xml += `<ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>\n`;
            xml += `<AMOUNT>${bill.paid_amount}</AMOUNT>\n`;
            xml += `</ALLLEDGERENTRIES.LIST>\n`;
            xml += `<ALLLEDGERENTRIES.LIST>\n`;
            xml += `<LEDGERNAME>Bank Account</LEDGERNAME>\n`;
            xml += `<ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>\n`;
            xml += `<AMOUNT>-${bill.paid_amount}</AMOUNT>\n`;
            xml += `</ALLLEDGERENTRIES.LIST>\n`;
            xml += `</VOUCHER>\n`;
            xml += `</TALLYMESSAGE>\n`;
        }

        xml += `</REQUESTDATA>\n</IMPORTDATA>\n</BODY>\n</ENVELOPE>`;

        res.set('Content-Type', 'text/xml');
        res.attachment(`Tally_Export_${month}.xml`);
        res.send(xml);
    } catch (error) { next(error); }
};

// ═══════════════════════════════════════════════════════════════
// CSV EXPORTS (Phase 10.3)
// ═══════════════════════════════════════════════════════════════

const exportVisitorsCSV = async (req, res, next) => {
    try {
        const societyId = await getSocietyIdForUser(req.user.id);
        const { dateFrom, dateTo } = req.query;

        let sql = `
            SELECT sv.visitor_name, sv.visitor_phone, sv.purpose, sv.flat_number, 
                   sv.status, sv.created_at, sv.checked_in_at, sv.checked_out_at,
                   u.name as resident_name 
            FROM society_visitors sv
            LEFT JOIN users u ON sv.resident_id = u.id
            WHERE sv.society_id = $1
        `;
        const params = [societyId];
        let paramIndex = 2;
        if (dateFrom) { sql += ` AND date(sv.created_at) >= $${paramIndex}`; params.push(dateFrom); paramIndex++; }
        if (dateTo) { sql += ` AND date(sv.created_at) <= $${paramIndex}`; params.push(dateTo); paramIndex++; }
        sql += ' ORDER BY sv.created_at DESC';

        const result = await query(sql, params);
        const visitors = result.rows || result || [];

        const workbook = new exceljs.Workbook();
        const worksheet = workbook.addWorksheet('Visitors');

        worksheet.columns = [
            { header: 'Visitor Name', key: 'visitor_name', width: 20 },
            { header: 'Phone', key: 'visitor_phone', width: 15 },
            { header: 'Purpose', key: 'purpose', width: 15 },
            { header: 'Flat', key: 'flat_number', width: 10 },
            { header: 'Resident', key: 'resident_name', width: 20 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Logged At', key: 'created_at', width: 20 },
            { header: 'In', key: 'checked_in_at', width: 20 },
            { header: 'Out', key: 'checked_out_at', width: 20 },
        ];

        worksheet.addRows(visitors);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=Visitors_Export.xlsx');

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) { next(error); }
};

const exportBillsCSV = async (req, res, next) => {
    try {
        const societyId = await getSocietyIdForUser(req.user.id);
        const { month } = req.query;

        const result = await query(`SELECT smb.*, u.name as member_name 
             FROM society_maintenance_bills smb
             JOIN society_members sm ON smb.member_id = sm.id
             JOIN users u ON sm.user_id = u.id
             WHERE smb.society_id = $1 AND smb.month = $2`,
            [societyId, month]
        );
        const bills = result.rows || result || [];

        const workbook = new exceljs.Workbook();
        const worksheet = workbook.addWorksheet('Bills');

        worksheet.columns = [
            { header: 'Flat', key: 'flat_number', width: 10 },
            { header: 'Resident', key: 'member_name', width: 20 },
            { header: 'Month', key: 'month', width: 15 },
            { header: 'Base Amount', key: 'base_amount', width: 15 },
            { header: 'Total Amount', key: 'total_amount', width: 15 },
            { header: 'Paid Amount', key: 'paid_amount', width: 15 },
            { header: 'Status', key: 'payment_status', width: 15 },
            { header: 'Due Date', key: 'due_date', width: 15 },
        ];

        worksheet.addRows(bills);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Bills_${month}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) { next(error); }
};

async function getSocietyIdForUser(userId) {
    const result = await queryOne('SELECT society_id FROM society_members WHERE user_id = $1 AND is_active = true', [userId]);
    return result ? result.society_id : null;
}

module.exports = {
    exportTallyXML,
    exportVisitorsCSV,
    exportBillsCSV
};
