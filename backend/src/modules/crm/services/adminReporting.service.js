/**
 * Admin Reporting Service (A13)
 *
 * Supports dual-format exports:
 * 1. Standard operational orders/sales CSV
 * 2. Statutory GST Section 52 Tax Collected at Source (TCS) reconciliation for Chartered Accountants
 */

/**
 * Quotes a CSV field. A text value starting with =, +, -, @, tab or carriage
 * return is prefixed with an apostrophe: these reports are opened in Excel by
 * the CA, and a shop or customer named "=HYPERLINK(...)" would otherwise be
 * evaluated as a formula there. Numbers (including negative ones) are left as
 * numbers.
 */
function escapeCsvField(val) {
  if (val === null || val === undefined) return '""';
  let str = String(val);
  if (typeof val !== 'number' && /^[=+\-@\t\r]/.test(str) && !/^-?\d+(\.\d+)?$/.test(str)) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

function generateStandardOrdersCsv(orders = []) {
  const headers = [
    'Order ID',
    'Date',
    'Shop ID',
    'Shop Name',
    'Customer ID',
    'Customer Name',
    'Subtotal (INR)',
    'Delivery Fee (INR)',
    'Total Amount (INR)',
    'Payment Method',
    'Payment Status',
    'Order Status',
  ];

  const lines = [headers.join(',')];

  for (const o of orders) {
    const row = [
      escapeCsvField(o.id),
      escapeCsvField(o.created_at),
      escapeCsvField(o.shop_id),
      escapeCsvField(o.shop_name || 'N/A'),
      escapeCsvField(o.user_id || o.customer_id),
      escapeCsvField(o.customer_name || 'N/A'),
      escapeCsvField(o.subtotal || 0),
      escapeCsvField(o.delivery_fee || 0),
      escapeCsvField(o.total_amount || 0),
      escapeCsvField(o.payment_method || 'cod'),
      escapeCsvField(o.payment_status || 'pending'),
      escapeCsvField(o.order_status || o.status || 'placed'),
    ];
    lines.push(row.join(','));
  }

  return lines.join('\n');
}

function generateGstTcsSection52Csv(records = [], period = '') {
  const headers = [
    'Period',
    'Seller Legal Name',
    'Seller Trade Name',
    'Seller GSTIN',
    'Seller PAN',
    'Gross Taxable Supplies (INR)',
    'Returns & Cancellations (INR)',
    'Net Taxable Supplies (INR)',
    'TCS Rate (%)',
    'CGST TCS 0.5% (INR)',
    'SGST TCS 0.5% (INR)',
    'Total TCS Collected (INR)',
  ];

  const lines = [headers.join(',')];

  for (const r of records) {
    const gross = Math.max(0, Number(r.gross_supplies) || 0);
    const returns = Math.max(0, Number(r.returned_supplies) || 0);
    const net = Math.max(0, gross - returns);
    const tcsTotal = Math.round(net * 0.01 * 100) / 100;
    const cgst = Math.round(tcsTotal * 0.5 * 100) / 100;
    const sgst = Math.round((tcsTotal - cgst) * 100) / 100;

    const row = [
      escapeCsvField(period || r.period || new Date().toISOString().slice(0, 7)),
      escapeCsvField(r.legal_name || r.shop_name || 'Unregistered Seller'),
      escapeCsvField(r.shop_name || 'N/A'),
      escapeCsvField(r.gstin || 'NOT_REGISTERED'),
      escapeCsvField(r.pan || 'N/A'),
      escapeCsvField(gross.toFixed(2)),
      escapeCsvField(returns.toFixed(2)),
      escapeCsvField(net.toFixed(2)),
      escapeCsvField('1.00%'),
      escapeCsvField(cgst.toFixed(2)),
      escapeCsvField(sgst.toFixed(2)),
      escapeCsvField(tcsTotal.toFixed(2)),
    ];
    lines.push(row.join(','));
  }

  return lines.join('\n');
}

/**
 * Seller-wise sales and payout reconciliation (A13): for each shop, what it
 * sold, what the platform kept, what has been paid out and what is still owed.
 */
function generateSellerReconciliationCsv(rows = []) {
  const headers = [
    'Shop ID', 'Shop Name', 'Seller GSTIN', 'Delivered Orders', 'Gross Sales (INR)',
    'Commission Rate (%)', 'Commission (INR)', 'Paid Out (INR)', 'Pending Payout (INR)', 'Outstanding (INR)',
  ];
  const lines = [headers.map(escapeCsvField).join(',')];
  const money = (n) => (Math.round((Number(n) || 0) * 100) / 100).toFixed(2);
  for (const r of rows) {
    const gross = Number(r.gross_sales) || 0;
    const rate = Number(r.commission_rate) || 0;
    const commission = Math.round(gross * rate) / 100;
    const paid = Number(r.paid_out) || 0;
    const pending = Number(r.pending_payout) || 0;
    const outstanding = gross - commission - paid;
    lines.push([
      r.shop_id, r.shop_name, r.gstin || 'Not registered', Number(r.delivered_orders) || 0,
      money(gross), rate.toFixed(2), money(commission), money(paid), money(pending), money(outstanding),
    ].map(escapeCsvField).join(','));
  }
  return lines.join('\n');
}

module.exports = {
  escapeCsvField,
  generateStandardOrdersCsv,
  generateGstTcsSection52Csv,
  generateSellerReconciliationCsv,
};
