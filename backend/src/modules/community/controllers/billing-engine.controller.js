const billingService = require('../services/billing-engine.service');
const tallyService = require('../services/tally-integration.service');
const { query, queryMany, queryOne } = require('../../../config/database.sqlite');
const fs = require('fs');
const path = require('path');

const generateBills = async (req, res) => {
    try {
        const { societyId, month, year } = req.body;
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

const getMyBills = async (req, res) => {
    try {
        const residentId = req.user.id;
        // Lookup flat for resident
        const member = await queryOne('SELECT society_id, flat_number FROM society_members WHERE user_id = ?', [residentId]);
        
        if (!member) return res.status(404).json({ error: 'Resident flat not found' });

        const bills = await queryMany('SELECT * FROM society_maintenance_bills WHERE society_id = ? AND flat_number = ? ORDER BY created_at DESC', [member.society_id, member.flat_number]);
        
        res.json({ success: true, data: bills });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getBillDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const bill = await queryOne('SELECT * FROM society_maintenance_bills WHERE id = ?', [id]);
        if (!bill) return res.status(404).json({ error: 'Bill not found' });

        const items = await queryMany('SELECT * FROM society_invoice_items WHERE bill_id = ?', [id]);
        
        res.json({ success: true, data: { ...bill, items } });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

const recordPayment = async (req, res) => {
    try {
        const { billId, amount, paymentMethod, transactionId } = req.body;
        
        const bill = await queryOne('SELECT * FROM society_maintenance_bills WHERE id = ?', [billId]);
        if (!bill) return res.status(404).json({ error: 'Bill not found' });

        const receiptId = require('uuid').v4();
        const receiptNumber = 'REC-' + Date.now();
        
        await query(
            `INSERT INTO society_payment_receipts 
            (id, society_id, bill_id, member_id, flat_number, amount, payment_method, transaction_id, receipt_number, payment_date) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [receiptId, bill.society_id, billId, bill.member_id, bill.flat_number, amount, paymentMethod, transactionId, receiptNumber]
        );

        // Update Bill
        await query(
            'UPDATE society_maintenance_bills SET paid_amount = paid_amount + ?, payment_status = CASE WHEN total_amount <= (paid_amount + ?) THEN "paid" ELSE "partial" END WHERE id = ?',
            [amount, amount, billId]
        );

        // Generate PDF
        const pdfUrl = await billingService.generatePDFReceipt(receiptId);

        res.json({ success: true, message: 'Payment recorded', data: { receiptId, pdfUrl } });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

const syncToTally = async (req, res) => {
    try {
        const { societyId, billId } = req.body;
        // Build mock invoice data for Tally
        const bill = await queryOne('SELECT * FROM society_maintenance_bills WHERE id = ?', [billId]);
        const items = await queryMany('SELECT * FROM society_invoice_items WHERE bill_id = ?', [billId]);

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
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const exportTallyCSV = async (req, res) => {
    try {
        const { societyId } = req.query;
        const csv = await tallyService.exportToCSV(societyId);
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=tally_export_${societyId}.csv`);
        res.send(csv);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    generateBills,
    getMyBills,
    getBillDetails,
    recordPayment,
    syncToTally,
    exportTallyCSV
};
