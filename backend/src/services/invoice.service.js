const PDFDocument = require('pdfkit');
const crypto = require('crypto');
const { query, queryOne } = require('../config/database');
const logger = require('../config/logger');

class InvoiceService {
  /**
   * Generates or retrieves an invoice record from shop_invoices table.
   */
  async generateOrderInvoice(orderId) {
    if (!orderId) throw new Error('orderId is required');

    // Check if invoice already exists
    const existing = await queryOne(
      'SELECT * FROM shop_invoices WHERE order_id = $1 LIMIT 1',
      [String(orderId)]
    );
    if (existing) {
      let items = [];
      try { items = JSON.parse(existing.items); } catch { items = []; }
      return { ...existing, items };
    }

    // Lookup order details across orders tables
    let order = await queryOne(
      `SELECT o.*, s.name AS shop_name, s.address AS shop_address, s.gstin, s.fssai_license_number,
              u.full_name AS customer_name, u.phone_number AS customer_phone
         FROM orders o
         LEFT JOIN local_shops s ON s.id = o.shop_id
         LEFT JOIN users u ON u.id = o.user_id
        WHERE o.id = $1 LIMIT 1`,
      [String(orderId)]
    );

    if (!order) {
      // Check universal_orders
      order = await queryOne(
        `SELECT uo.id, uo.user_id, uo.shop_id, uo.total_amount, uo.items, uo.delivery_fee,
                uo.payment_method, uo.payment_status,
                s.name AS shop_name, s.address AS shop_address, s.gstin, s.fssai_license_number,
                u.full_name AS customer_name, u.phone_number AS customer_phone
           FROM universal_orders uo
           LEFT JOIN local_shops s ON s.id = uo.shop_id
           LEFT JOIN users u ON u.id = uo.user_id
          WHERE uo.id = $1 LIMIT 1`,
        [String(orderId)]
      );
    }

    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    // Parse items
    let parsedItems = [];
    if (typeof order.items === 'string') {
      try { parsedItems = JSON.parse(order.items); } catch { parsedItems = []; }
    } else if (Array.isArray(order.items)) {
      parsedItems = order.items;
    }

    // If order_items table exists, try fetching from there
    if (parsedItems.length === 0) {
      const dbItems = await query(
        'SELECT name, quantity, price FROM order_items WHERE order_id = $1',
        [String(orderId)]
      ).then((r) => r.rows || r || []);
      if (dbItems.length > 0) {
        parsedItems = dbItems;
      }
    }

    const subtotal = Number(order.subtotal || order.total_amount || 0);
    const deliveryFee = Number(order.delivery_fee || 0);
    const discount = Number(order.discount_amount || 0);
    const totalAmount = Number(order.total_amount || (subtotal + deliveryFee - discount));

    const invoiceId = crypto.randomUUID();
    const year = new Date().getFullYear();
    const shortId = String(orderId).replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase();
    const invoiceNumber = `INV-${year}-${shortId}`;

    const itemsJson = JSON.stringify(parsedItems);

    await query(
      `INSERT INTO shop_invoices
         (id, invoice_number, shop_id, user_id, order_id, order_type, items, subtotal, convenience_fee, delivery_fee, discount_amount, total_amount, payment_method, payment_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        invoiceId,
        invoiceNumber,
        order.shop_id || null,
        order.user_id || null,
        String(orderId),
        'delivery',
        itemsJson,
        subtotal,
        0,
        deliveryFee,
        discount,
        totalAmount,
        order.payment_method || 'COD',
        order.payment_status || 'paid'
      ]
    );

    logger.info(`[Invoice] Generated invoice ${invoiceNumber} for order ${orderId}`);

    return {
      id: invoiceId,
      invoice_number: invoiceNumber,
      shop_id: order.shop_id,
      shop_name: order.shop_name,
      shop_address: order.shop_address,
      gstin: order.gstin,
      fssai_license_number: order.fssai_license_number,
      user_id: order.user_id,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      order_id: String(orderId),
      items: parsedItems,
      subtotal,
      delivery_fee: deliveryFee,
      discount_amount: discount,
      total_amount: totalAmount,
      payment_method: order.payment_method || 'COD',
      payment_status: order.payment_status || 'paid',
      created_at: new Date().toISOString()
    };
  }

  /**
   * Generates a GST-ready tax invoice PDF and streams it to output.
   */
  async streamInvoicePdf(orderId, writeStream) {
    const invoice = await this.generateOrderInvoice(orderId);

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    doc.pipe(writeStream);

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text('TAX INVOICE', { align: 'right' });
    doc.fontSize(10).font('Helvetica').text(`Invoice #: ${invoice.invoice_number}`, { align: 'right' });
    doc.text(`Date: ${new Date(invoice.created_at || Date.now()).toLocaleDateString('en-IN')}`, { align: 'right' });
    doc.moveDown();

    // Seller & Customer Details Box
    const startY = doc.y;
    doc.font('Helvetica-Bold').fontSize(11).text('Sold By (Seller):', 40, startY);
    doc.font('Helvetica').fontSize(10);
    doc.text(invoice.shop_name || 'Verified Neighbourhood Shop', 40);
    doc.text(invoice.shop_address || 'Dhanori, Pune, Maharashtra', 40);
    if (invoice.gstin) doc.text(`GSTIN: ${invoice.gstin}`, 40);
    if (invoice.fssai_license_number) doc.text(`FSSAI: ${invoice.fssai_license_number}`, 40);

    doc.font('Helvetica-Bold').fontSize(11).text('Billed To / Delivered To:', 320, startY);
    doc.font('Helvetica').fontSize(10);
    doc.text(invoice.customer_name || 'Customer', 320);
    if (invoice.customer_phone) doc.text(`Phone: ${invoice.customer_phone}`, 320);
    doc.text(`Order ID: ${invoice.order_id}`, 320);
    doc.text(`Payment Mode: ${invoice.payment_method || 'COD'} (${invoice.payment_status || 'paid'})`, 320);

    doc.moveDown(2);
    const tableTop = Math.max(doc.y, startY + 80);

    // Table Header
    doc.rect(40, tableTop, 515, 20).fill('#f3f4f6');
    doc.fillColor('#111827').font('Helvetica-Bold').fontSize(9);
    doc.text('Item Description', 45, tableTop + 5);
    doc.text('Qty', 360, tableTop + 5, { width: 40, align: 'center' });
    doc.text('Unit Price', 410, tableTop + 5, { width: 60, align: 'right' });
    doc.text('Total (INR)', 480, tableTop + 5, { width: 70, align: 'right' });

    // Table Items
    let currentY = tableTop + 25;
    doc.font('Helvetica').fontSize(9);

    const items = invoice.items && invoice.items.length > 0 ? invoice.items : [
      { name: 'Local Store Products', quantity: 1, price: invoice.subtotal }
    ];

    for (const item of items) {
      const name = item.name || item.product_name || 'Product';
      const qty = Number(item.quantity) || 1;
      const price = Number(item.price) || 0;
      const lineTotal = qty * price;

      doc.text(name, 45, currentY, { width: 300 });
      doc.text(String(qty), 360, currentY, { width: 40, align: 'center' });
      doc.text(`INR ${price.toFixed(2)}`, 410, currentY, { width: 60, align: 'right' });
      doc.text(`INR ${lineTotal.toFixed(2)}`, 480, currentY, { width: 70, align: 'right' });

      currentY += 20;
    }

    doc.moveDown();
    doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(40, currentY).lineTo(555, currentY).stroke();
    currentY += 10;

    // Totals Box
    doc.font('Helvetica').fontSize(10);
    doc.text('Items Subtotal:', 350, currentY, { width: 120, align: 'right' });
    doc.text(`INR ${Number(invoice.subtotal).toFixed(2)}`, 480, currentY, { width: 70, align: 'right' });
    currentY += 16;

    if (Number(invoice.delivery_fee) > 0) {
      doc.text('Delivery Fee:', 350, currentY, { width: 120, align: 'right' });
      doc.text(`INR ${Number(invoice.delivery_fee).toFixed(2)}`, 480, currentY, { width: 70, align: 'right' });
      currentY += 16;
    }

    if (Number(invoice.discount_amount) > 0) {
      doc.text('Discount:', 350, currentY, { width: 120, align: 'right' });
      doc.text(`- INR ${Number(invoice.discount_amount).toFixed(2)}`, 480, currentY, { width: 70, align: 'right' });
      currentY += 16;
    }

    doc.rect(340, currentY, 215, 24).fill('#e0e7ff');
    doc.fillColor('#1e1b4b').font('Helvetica-Bold').fontSize(11);
    doc.text('Grand Total:', 350, currentY + 6, { width: 120, align: 'right' });
    doc.text(`INR ${Number(invoice.total_amount).toFixed(2)}`, 480, currentY + 6, { width: 70, align: 'right' });

    // Footer
    doc.fillColor('#6b7280').font('Helvetica').fontSize(8);
    doc.text(
      'This is a computer-generated tax invoice. No signature required. Powered by LocalSampark Hyperlocal Marketplace.',
      40,
      760,
      { align: 'center', width: 515 }
    );

    doc.end();
  }
}

module.exports = new InvoiceService();
