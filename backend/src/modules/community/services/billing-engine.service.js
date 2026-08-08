const { query, queryOne, queryMany, withTransaction } = require('../../../config/database.sqlite');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class BillingEngineService {
    // Calculate Service Charges (Equal split across all active flats per MCS Act)
    async calculateServiceCharges(societyId) {
        const config = await queryOne('SELECT * FROM society_billing_config WHERE society_id = ?', [societyId]);
        if (!config) throw new Error('Billing config not found');

        const activeFlatsCount = (await queryOne('SELECT COUNT(*) as count FROM society_flat_ledger WHERE society_id = ?', [societyId])).count;
        if (activeFlatsCount === 0) return 0;

        const chargeHeads = await queryMany('SELECT * FROM society_charge_heads WHERE society_id = ? AND category = "service_charge" AND is_active = 1', [societyId]);
        
        let totalServiceCharge = 0;
        for (const head of chargeHeads) {
            totalServiceCharge += head.amount;
        }

        // Each flat pays equal share of total service charges
        return totalServiceCharge / activeFlatsCount;
    }

    // Calculate Sinking Fund (Construction Cost * Area * Rate% / 12)
    async calculateSinkingFund(societyId, flatNumber) {
        const config = await queryOne('SELECT construction_cost_per_sqft, sinking_fund_rate FROM society_billing_config WHERE society_id = ?', [societyId]);
        const flat = await queryOne('SELECT carpet_area_sqft, construction_cost FROM society_flat_ledger WHERE society_id = ? AND flat_number = ?', [societyId, flatNumber]);
        
        if (!config || !flat) return 0;

        const cost = flat.construction_cost > 0 ? flat.construction_cost : (flat.carpet_area_sqft * config.construction_cost_per_sqft);
        return (cost * (config.sinking_fund_rate / 100)) / 12;
    }

    // Calculate NOC for Tenants (Max 10% of service charges)
    async calculateNOC(societyId, flatNumber, serviceChargeAmount) {
        const config = await queryOne('SELECT noc_percentage FROM society_billing_config WHERE society_id = ?', [societyId]);
        const flat = await queryOne('SELECT is_tenant FROM society_flat_ledger WHERE society_id = ? AND flat_number = ?', [societyId, flatNumber]);
        
        if (!flat || flat.is_tenant !== 1 || !config) return 0;

        return serviceChargeAmount * (config.noc_percentage / 100);
    }

    // Calculate Parking Charges
    async calculateParkingCharges(societyId, flatNumber) {
        const config = await queryOne('SELECT parking_charge_two_wheeler, parking_charge_four_wheeler FROM society_billing_config WHERE society_id = ?', [societyId]);
        if (!config) return 0;

        // Fetch vehicle count for the flat owner
        const flat = await queryOne('SELECT member_id FROM society_flat_ledger WHERE society_id = ? AND flat_number = ?', [societyId, flatNumber]);
        if (!flat || !flat.member_id) return 0;

        const vehicles = await queryMany('SELECT vehicle_type FROM vehicles WHERE owner_id = ? AND is_active = 1', [flat.member_id]);
        
        let parkingCharge = 0;
        for (const v of vehicles) {
            if (v.vehicle_type === '2-wheeler' || v.vehicle_type === 'bike') parkingCharge += config.parking_charge_two_wheeler;
            if (v.vehicle_type === '4-wheeler' || v.vehicle_type === 'car') parkingCharge += config.parking_charge_four_wheeler;
        }

        return parkingCharge;
    }

    // Generate Monthly Invoices Batch
    async generateMonthlyInvoices(societyId, month, year) {
        const config = await queryOne('SELECT * FROM society_billing_config WHERE society_id = ?', [societyId]);
        if (!config) throw new Error('Billing config not found');

        const flats = await queryMany('SELECT * FROM society_flat_ledger WHERE society_id = ?', [societyId]);
        const baseServiceCharge = await this.calculateServiceCharges(societyId);

        const generatedBills = [];

        for (const flat of flats) {
            const billId = uuidv4();
            let totalAmount = 0;
            const invoiceItems = [];

            // Service Charge Item
            invoiceItems.push({
                charge_head_id: 'service_charge',
                description: 'Monthly Maintenance Service Charge',
                amount: baseServiceCharge,
                gst_amount: config.gst_enabled ? baseServiceCharge * (config.gst_rate / 100) : 0,
                total: config.gst_enabled ? baseServiceCharge * (1 + config.gst_rate / 100) : baseServiceCharge,
                category: 'service_charge'
            });

            // Sinking Fund
            const sinkingFund = await this.calculateSinkingFund(societyId, flat.flat_number);
            if (sinkingFund > 0) {
                invoiceItems.push({
                    charge_head_id: 'sinking_fund',
                    description: 'Sinking Fund Contribution',
                    amount: sinkingFund,
                    gst_amount: 0, // Usually GST exempt
                    total: sinkingFund,
                    category: 'sinking_fund'
                });
            }

            // Non-Occupancy Charges (NOC)
            const noc = await this.calculateNOC(societyId, flat.flat_number, baseServiceCharge);
            if (noc > 0) {
                invoiceItems.push({
                    charge_head_id: 'noc',
                    description: 'Non-Occupancy Charges (NOC)',
                    amount: noc,
                    gst_amount: config.gst_enabled ? noc * (config.gst_rate / 100) : 0,
                    total: config.gst_enabled ? noc * (1 + config.gst_rate / 100) : noc,
                    category: 'noc'
                });
            }

            // Parking Charges
            const parking = await this.calculateParkingCharges(societyId, flat.flat_number);
            if (parking > 0) {
                invoiceItems.push({
                    charge_head_id: 'parking',
                    description: 'Parking Charges',
                    amount: parking,
                    gst_amount: config.gst_enabled ? parking * (config.gst_rate / 100) : 0,
                    total: config.gst_enabled ? parking * (1 + config.gst_rate / 100) : parking,
                    category: 'parking'
                });
            }

            // Sum totals
            totalAmount = invoiceItems.reduce((acc, item) => acc + item.total, 0);

            // Add Previous Arrears
            if (flat.total_arrears > 0) {
                totalAmount += flat.total_arrears;
            }

            // Transaction for bill generation
            await withTransaction(async () => {
                // Determine due date based on config grace period
                const dueDate = new Date();
                dueDate.setDate(dueDate.getDate() + config.grace_period_days);

                // For simplicity, inserting into society_maintenance_bills 
                // Note: society_maintenance_bills table might need structure alignment, assuming standard fields:
                await query(
                    `INSERT INTO society_maintenance_bills 
                    (id, society_id, flat_number, member_id, month, year, total_amount, paid_amount, payment_status, due_date, created_at) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'pending', ?, CURRENT_TIMESTAMP)`,
                    [billId, societyId, flat.flat_number, flat.member_id, month, year, totalAmount, dueDate.toISOString()]
                );

                // Insert Invoice Items
                for (const item of invoiceItems) {
                    await query(
                        `INSERT INTO society_invoice_items (id, bill_id, charge_head_id, description, amount, gst_amount, total, category) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        [uuidv4(), billId, item.charge_head_id, item.description, item.amount, item.gst_amount, item.total, item.category]
                    );
                }

                // Apply advance balance if any
                if (flat.advance_balance > 0) {
                    await this.applyAdvanceBalance(flat.member_id, billId, flat.advance_balance, totalAmount, societyId, flat.flat_number);
                }
            });

            generatedBills.push({ flat: flat.flat_number, amount: totalAmount });
        }

        return generatedBills;
    }

    async applyAdvanceBalance(memberId, billId, advanceBalance, billAmount, societyId, flatNumber) {
        const amountToApply = Math.min(advanceBalance, billAmount);
        
        await query(
            'UPDATE society_maintenance_bills SET paid_amount = paid_amount + ?, payment_status = CASE WHEN total_amount <= (paid_amount + ?) THEN "paid" ELSE "partial" END WHERE id = ?',
            [amountToApply, amountToApply, billId]
        );

        await query(
            'UPDATE society_flat_ledger SET advance_balance = advance_balance - ? WHERE society_id = ? AND flat_number = ?',
            [amountToApply, societyId, flatNumber]
        );

        await query(
            'UPDATE society_advance_account SET utilized_amount = utilized_amount + ?, balance = balance - ? WHERE society_id = ? AND flat_number = ?',
            [amountToApply, amountToApply, societyId, flatNumber]
        );
    }

    // Simple Interest Penalty
    async calculateLatePenalty(billId) {
        const bill = await queryOne('SELECT * FROM society_maintenance_bills WHERE id = ?', [billId]);
        const config = await queryOne('SELECT max_late_interest_rate FROM society_billing_config WHERE society_id = ?', [bill.society_id]);
        
        const principal = bill.total_amount - bill.paid_amount;
        if (principal <= 0) return 0;

        const dueDate = new Date(bill.due_date);
        const now = new Date();
        const daysOverdue = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));

        if (daysOverdue <= 0) return 0;

        const rate = config.max_late_interest_rate;
        const penalty = (principal * rate * daysOverdue) / (365 * 100);

        return penalty;
    }

    // PDF Generation
    async generatePDFReceipt(receiptId) {
        const receipt = await queryOne('SELECT * FROM society_payment_receipts WHERE id = ?', [receiptId]);
        if (!receipt) throw new Error('Receipt not found');

        const pdfPath = path.join(__dirname, '../../../../uploads/receipts', `${receiptId}.pdf`);
        const doc = new PDFDocument();
        doc.pipe(fs.createWriteStream(pdfPath));

        doc.fontSize(20).text('Payment Receipt', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Receipt No: ${receipt.receipt_number}`);
        doc.text(`Date: ${new Date(receipt.payment_date).toLocaleDateString()}`);
        doc.text(`Flat Number: ${receipt.flat_number}`);
        doc.text(`Amount Paid: Rs. ${receipt.amount}`);
        doc.text(`Payment Method: ${receipt.payment_method}`);
        if (receipt.transaction_id) doc.text(`Transaction ID: ${receipt.transaction_id}`);

        doc.end();
        
        const relativeUrl = `/uploads/receipts/${receiptId}.pdf`;
        await query('UPDATE society_payment_receipts SET receipt_pdf_url = ? WHERE id = ?', [relativeUrl, receiptId]);
        
        return relativeUrl;
    }
}

module.exports = new BillingEngineService();
