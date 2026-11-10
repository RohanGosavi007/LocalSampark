const billingService = require('../services/billing-engine.service');
const tallyService = require('../services/tally-integration.service');
const { query, queryMany, queryOne } = require('../../../config/database');
const { hasSocietyCapability, CAPABILITIES } = require('../middleware/society-capability');
const fs = require('fs');
const path = require('path');

const generateBills = async (req, res, next) => {
    try {
        const { societyId, month, year } = { ...req.body, societyId: req.societyId || (req.body || {}).societyId };
        // In reality, this requires Admin/Treasurer role
        
        const generated = await billingService.generateMonthlyInvoices(societyId, month, year);
        
        res.json({
            success: true,
            message: `Generated ${generated.length} bills successfully`,
            data: generated
        });
    } catch (error) {
        console.error('Generate bills error:', error);
        res.status(500).json({ error: error.message });
    }
};

const getMyBills = async (req, res, next) => {
    try {
        const residentId = req.user.id;
        // Lookup flat for resident
        const member = await queryOne('SELECT society_id, flat_number FROM society_members WHERE user_id = $1', [residentId]);
        
        if (!member) return res.status(404).json({ error: 'Resident flat not found' });

        const bills = await queryMany('SELECT * FROM society_maintenance_bills WHERE society_id = $1 AND flat_number = $2 ORDER BY created_at DESC', [member.society_id, member.flat_number]);
        
        res.json({ success: true, data: bills });
    } catch (error) { next(error); }
};

const getBillDetails = async (req, res, next) => {
    try {
        const { id } = req.params;
                const bill = await queryOne('SELECT * FROM society_maintenance_bills WHERE id = $1', [id]);
        if (!bill) return res.status(404).json({ error: 'Bill not found' });

        // The route has established membership of the bill's society. A
        // resident sees the bill of their own flat; the office sees any.
        const ownFlat = req.societyMembership?.flat_number
            && String(req.societyMembership.flat_number).trim().toLowerCase() === String(bill.flat_number).trim().toLowerCase();
        if (!ownFlat && !(await hasSocietyCapability(req, bill.society_id, CAPABILITIES.MANAGE_SOCIETY))) {
            return res.status(403).json({ error: 'This bill is for another flat.' });
        }

        const items = await queryMany('SELECT * FROM society_invoice_items WHERE bill_id = $1', [id]);
        
        res.json({ success: true, data: { ...bill, items } });
    } catch (error) { next(error); }
};

const recordPayment = async (req, res, next) => {
    try {
                const { billId, paymentMethod, transactionId } = req.body;
        const amount = Number(req.body.amount);
        if (!Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({ error: 'amount must be more than zero' });
        }

        const bill = await queryOne('SELECT * FROM society_maintenance_bills WHERE id = $1', [billId]);
        if (!bill) return res.status(404).json({ error: 'Bill not found' });


        const receiptId = require('uuid').v4();
        const receiptNumber = 'REC-' + Date.now();
        
        await query(`INSERT INTO society_payment_receipts 
            (id, society_id, bill_id, member_id, flat_number, amount_paid, amount, payment_method, transaction_id, receipt_number, payment_date)
            VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $8, $9, CURRENT_TIMESTAMP)`,
            [receiptId, bill.society_id, billId, bill.member_id, bill.flat_number, amount, paymentMethod, transactionId, receiptNumber]
        );

        // Update Bill
        await query('UPDATE society_maintenance_bills SET paid_amount = paid_amount + $1, payment_status = CASE WHEN total_amount <= (paid_amount + $2) THEN \'paid\' ELSE \'partial\' END WHERE id = $3',
            [amount, amount, billId]
        );

        // Generate PDF
        const pdfUrl = await billingService.generatePDFReceipt(receiptId);

        res.json({ success: true, message: 'Payment recorded', data: { receiptId, pdfUrl } });
    } catch (error) { next(error); }
};

const syncToTally = async (req, res, next) => {
    try {
        const { societyId, billId } = { ...req.body, societyId: req.societyId || (req.body || {}).societyId };
        // Build mock invoice data for Tally
        const bill = await queryOne('SELECT * FROM society_maintenance_bills WHERE id = $1', [billId]);
        const items = await queryMany('SELECT * FROM society_invoice_items WHERE bill_id = $1', [billId]);

        const invoiceData = {
            societyName: 'LocalSampark Society',
            date: new Date(bill.created_at).toLocaleDateString('en-GB').replace(/\//g, '-'),
            flatNumber: bill.flat_number,
            totalAmount: bill.total_amount,
            items: items.map(i => ({ category: i.category, amount: i.total }))
        };

        const ledgerMapping = {
            'service_charge': 'Maintenance Charges',
            'sinking_fund': 'Sinking Fund A/C',
            'parking': 'Parking Income',
            'noc': 'NOC Charges'
        };

        const xml = tallyService.generateSalesInvoiceXML(invoiceData, ledgerMapping);
        const result = await tallyService.pushToTally(xml);

        res.json(result);
    } catch (error) { next(error); }
};

const exportTallyCSV = async (req, res, next) => {
    try {
        const { societyId } = { ...req.query, societyId: req.societyId || req.query.societyId };
        const csv = await tallyService.exportToCSV(societyId);
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=tally_export_${societyId}.csv`);
        res.send(csv);
    } catch (error) { next(error); }
};

module.exports = {
    generateBills,
    getMyBills,
    getBillDetails,
    recordPayment,
    syncToTally,
    exportTallyCSV
};
