const { query, queryMany } = require('../../../config/database');
const { v4: uuidv4 } = require('uuid');

/**
 * Builds the month's payroll from the staff register and the attendance log.
 *
 * This used to write a single hard-coded row — "Security Guard Team", 30 days
 * present out of 30, ₹15,000 — for whichever society and month was posted, and
 * report success. That is a fabricated entry in a payment ledger. (It also
 * never reached the table: society_staff_payroll.staff_id is NOT NULL and the
 * row had none, so the insert failed on the constraint.)
 *
 * One row is now written per active member of society_domestic_staff, with the
 * days counted from society_staff_attendance for that month.
 *
 * The register holds no wage, so the amount cannot be derived here. A rate is
 * taken from the request — `rates: { <staffId>: perDay }`, or `perDayRate` for
 * everyone — and where neither is given the row is recorded with the
 * attendance and a null rate, to be priced before it is paid. Inventing a
 * figure is the thing this replaces.
 *
 * Re-running for the same month adds rows only for staff who have none yet.
 */
const generateMonthlyPayroll = async (req, res, next) => {
    try {
        const adminId = req.user.id;
        const { societyId, perDayRate, rates } = { ...req.body, societyId: req.societyId || (req.body || {}).societyId };
        const month = Number(req.body.month);
        const year = Number(req.body.year);

        if (!societyId
            || !Number.isInteger(month) || month < 1 || month > 12
            || !Number.isInteger(year) || year < 2000 || year > 2100) {
            return res.status(400).json({ success: false, error: 'societyId, month (1-12) and year are required' });
        }

        const flatRate = perDayRate === undefined || perDayRate === null || perDayRate === '' ? null : Number(perDayRate);
        if (flatRate !== null && (!Number.isFinite(flatRate) || flatRate < 0)) {
            return res.status(400).json({ success: false, error: 'perDayRate must be a non-negative number' });
        }

        const monthStr = `${year}-${String(month).padStart(2, '0')}`; // format YYYY-MM
        const daysInMonth = new Date(year, month, 0).getDate();
        // A half-open range on the YYYY-MM-DD string, which sorts as a date does.
        const from = `${monthStr}-01`;
        const to = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`;

        // is_active is an INTEGER column on both engines; bound, not written as
        // `= true`, which PostgreSQL refuses to compare with an integer.
        const staff = await queryMany(
            'SELECT id, staff_name FROM society_domestic_staff WHERE society_id = $1 AND (is_active = $2 OR is_active IS NULL)',
            [societyId, 1]
        );

        const attendance = await queryMany(
            `SELECT staff_id, status, COUNT(*) AS days
               FROM society_staff_attendance
              WHERE society_id = $1 AND date >= $2 AND date < $3
              GROUP BY staff_id, status`,
            [societyId, from, to]
        );
        const byStaff = new Map();
        for (const row of attendance) {
            if (!byStaff.has(row.staff_id)) byStaff.set(row.staff_id, { present: 0, late: 0, absent: 0 });
            const tally = byStaff.get(row.staff_id);
            const days = Number(row.days) || 0;
            const status = String(row.status || 'present').toLowerCase();
            if (status === 'absent') tally.absent += days;
            else {
                // A late arrival is still a day worked.
                tally.present += days;
                if (status === 'late') tally.late += days;
            }
        }

        const existing = await queryMany(
            'SELECT staff_id FROM society_staff_payroll WHERE society_id = $1 AND month = $2',
            [societyId, monthStr]
        );
        const alreadyDone = new Set(existing.map((r) => r.staff_id));

        const generated = [];
        let skipped = 0;
        for (const member of staff) {
            if (alreadyDone.has(member.id)) { skipped += 1; continue; }

            const tally = byStaff.get(member.id) || { present: 0, late: 0, absent: 0 };
            const ownRate = rates && rates[member.id] !== undefined ? Number(rates[member.id]) : null;
            const rate = Number.isFinite(ownRate) && ownRate >= 0 ? ownRate : flatRate;
            const netPayable = rate === null ? 0 : Math.round(rate * tally.present * 100) / 100;

            await query(`INSERT INTO society_staff_payroll
                (id, staff_id, society_id, staff_name, month, total_working_days, present_days, absent_days,
                 late_arrivals, per_day_rate, net_payable, payment_status, approved_by)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending', $12)`,
                [uuidv4(), member.id, societyId, member.staff_name, monthStr, daysInMonth, tally.present,
                 tally.absent, tally.late, rate, netPayable, adminId]
            );
            generated.push({
                staff_id: member.id,
                staff_name: member.staff_name,
                present_days: tally.present,
                absent_days: tally.absent,
                late_arrivals: tally.late,
                per_day_rate: rate,
                net_payable: netPayable,
            });
        }

        const unpriced = generated.filter((row) => row.per_day_rate === null).length;
        let message;
        if (staff.length === 0) message = `No active staff are registered for this society; nothing to generate for ${monthStr}`;
        else if (generated.length === 0) message = `Payroll for ${monthStr} was already generated`;
        else {
            message = `Payroll generated for ${generated.length} staff for ${monthStr}`;
            if (unpriced > 0) message += `; ${unpriced} have no per-day rate yet`;
        }

        res.json({
            success: true,
            message,
            data: { month: monthStr, total_working_days: daysInMonth, generated, skipped },
        });
    } catch (error) { next(error); }
};

const getPayrollSummary = async (req, res, next) => {
    try {
        const { societyId, month } = req.query;
        if (!societyId || !month) {
            return res.status(400).json({ success: false, error: 'societyId and month (YYYY-MM) are required' });
        }
        const payroll = await queryMany('SELECT * FROM society_staff_payroll WHERE society_id = $1 AND month = $2', [societyId, month]);
        res.json({ success: true, data: payroll });
    } catch (error) { next(error); }
};

module.exports = {
    generateMonthlyPayroll,
    getPayrollSummary
};
