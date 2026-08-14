const { query, queryOne, queryMany } = require('../../../config/database');
const { v4: uuidv4 } = require('uuid');

const createVendor = async (req, res, next) => {
    try {
        const { societyId, vendorName, vendorType, contactPerson, contactPhone, gstNumber, monthlyCost } = req.body;
        const id = uuidv4();

        await query(`INSERT INTO society_vendors 
            (id, society_id, vendor_name, vendor_type, contact_person, contact_phone, gst_number, monthly_cost) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [id, societyId, vendorName, vendorType, contactPerson, contactPhone, gstNumber, monthlyCost]
        );

        res.json({ success: true, message: 'Vendor created', data: { id } });
    } catch (error) { next(error); }
};

const listVendors = async (req, res, next) => {
    try {
        const { societyId } = req.query;
        const vendors = await queryMany('SELECT * FROM society_vendors WHERE society_id = $1 AND is_active = 1', [societyId]);
        res.json({ success: true, data: vendors });
    } catch (error) { next(error); }
};

const createVendorInvoice = async (req, res, next) => {
    try {
        const { societyId, vendorId, invoiceNumber, amount, gstAmount, tdsAmount, invoiceDate, dueDate } = req.body;
        const id = uuidv4();
        
        const total = amount + gstAmount - tdsAmount;

        await query(`INSERT INTO society_vendor_invoices 
            (id, vendor_id, society_id, invoice_number, amount, gst_amount, tds_amount, total, invoice_date, due_date) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [id, vendorId, societyId, invoiceNumber, amount, gstAmount, tdsAmount, total, invoiceDate, dueDate]
        );

        res.json({ success: true, message: 'Vendor invoice created', data: { id, total } });
    } catch (error) { next(error); }
};

const payVendorInvoice = async (req, res, next) => {
    try {
        const adminId = req.user.id;
        const { invoiceId, paymentReference, paymentMethod } = req.body;

        await query('UPDATE society_vendor_invoices SET payment_status = "paid", payment_date = CURRENT_TIMESTAMP, payment_reference = $1, payment_method = $2, approved_by = $3 WHERE id = $4',
            [paymentReference, paymentMethod, adminId, invoiceId]
        );

        res.json({ success: true, message: 'Vendor invoice marked as paid' });
    } catch (error) { next(error); }
};

module.exports = {
    createVendor,
    listVendors,
    createVendorInvoice,
    payVendorInvoice
};
