const { query, queryOne, queryMany } = require('../../../config/database.sqlite');
const { v4: uuidv4 } = require('uuid');

const createVendor = async (req, res) => {
    try {
        const { societyId, vendorName, vendorType, contactPerson, contactPhone, gstNumber, monthlyCost } = req.body;
        const id = uuidv4();

        await query(
            `INSERT INTO society_vendors 
            (id, society_id, vendor_name, vendor_type, contact_person, contact_phone, gst_number, monthly_cost) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, societyId, vendorName, vendorType, contactPerson, contactPhone, gstNumber, monthlyCost]
        );

        res.json({ success: true, message: 'Vendor created', data: { id } });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

const listVendors = async (req, res) => {
    try {
        const { societyId } = req.query;
        const vendors = await queryMany('SELECT * FROM society_vendors WHERE society_id = ? AND is_active = 1', [societyId]);
        res.json({ success: true, data: vendors });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

const createVendorInvoice = async (req, res) => {
    try {
        const { societyId, vendorId, invoiceNumber, amount, gstAmount, tdsAmount, invoiceDate, dueDate } = req.body;
        const id = uuidv4();
        
        const total = amount + gstAmount - tdsAmount;

        await query(
            `INSERT INTO society_vendor_invoices 
            (id, vendor_id, society_id, invoice_number, amount, gst_amount, tds_amount, total, invoice_date, due_date) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, vendorId, societyId, invoiceNumber, amount, gstAmount, tdsAmount, total, invoiceDate, dueDate]
        );

        res.json({ success: true, message: 'Vendor invoice created', data: { id, total } });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

const payVendorInvoice = async (req, res) => {
    try {
        const adminId = req.user.id;
        const { invoiceId, paymentReference, paymentMethod } = req.body;

        await query(
            'UPDATE society_vendor_invoices SET payment_status = "paid", payment_date = CURRENT_TIMESTAMP, payment_reference = ?, payment_method = ?, approved_by = ? WHERE id = ?',
            [paymentReference, paymentMethod, adminId, invoiceId]
        );

        res.json({ success: true, message: 'Vendor invoice marked as paid' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    createVendor,
    listVendors,
    createVendorInvoice,
    payVendorInvoice
};
