const crypto = require('crypto');
const { query, queryOne, withTransaction } = require('../../../config/database');

// Counter sales from the shop's POS screen.
//
// The client says which products and how many; every price, the GST and the total are worked out
// here from shop_products, and stock comes off in the same transaction as the sale row. A sale that
// would take stock below zero is refused whole.

const GST_RATES = [0, 5, 12, 18, 28];
const PAYMENT_METHODS = ['cash', 'upi', 'card'];
const round2 = (n) => Math.round(n * 100) / 100;

const rowsOf = (r) => (r && r.rows ? r.rows : (Array.isArray(r) ? r : []));

function badRequest(res, error) {
  return res.status(400).json({ success: false, error });
}

exports.createSale = async (req, res, next) => {
  try {
    const shop = req.shop;
    const { items, discount, gstRate, paymentMethod } = req.body || {};

    if (!Array.isArray(items) || items.length === 0 || items.length > 100) {
      return badRequest(res, 'items must list between 1 and 100 products');
    }
    const wanted = new Map();
    const lineDiscount = new Map(); // percent off a single line
    for (const it of items) {
      const qty = Number(it && it.quantity);
      if (!it || typeof it.productId !== 'string' || !Number.isInteger(qty) || qty < 1 || qty > 1000) {
        return badRequest(res, 'each item needs a productId and a whole quantity from 1 to 1000');
      }
      wanted.set(it.productId, (wanted.get(it.productId) || 0) + qty);
      const pct = it.discountPercent === undefined ? 0 : Number(it.discountPercent);
      if (!Number.isFinite(pct) || pct < 0 || pct > 100) return badRequest(res, 'discountPercent must be between 0 and 100');
      if (pct) lineDiscount.set(it.productId, pct);
    }

    const rate = gstRate === undefined || gstRate === null ? 0 : Number(gstRate);
    if (!GST_RATES.includes(rate)) return badRequest(res, `gstRate must be one of ${GST_RATES.join(', ')}`);
    const method = paymentMethod || 'cash';
    if (!PAYMENT_METHODS.includes(method)) return badRequest(res, `paymentMethod must be one of ${PAYMENT_METHODS.join(', ')}`);

    const ids = [...wanted.keys()];
    const placeholders = ids.map((_, i) => `$${i + 2}`).join(', ');
    const found = rowsOf(await query(
      `SELECT id, name, price, unit, track_inventory, inventory_count, is_available
         FROM shop_products WHERE shop_id = $1 AND id IN (${placeholders})`,
      [shop.id, ...ids]
    ));
    const byId = new Map(found.map((p) => [String(p.id), p]));

    const lines = [];
    let subtotal = 0;
    for (const [productId, quantity] of wanted) {
      const p = byId.get(productId);
      if (!p) return badRequest(res, `product ${productId} is not in this shop's catalogue`);
      if (p.is_available === 0 || p.is_available === false || p.is_available === '0') {
        return badRequest(res, `${p.name} is not available`);
      }
      const unitPrice = Number(p.price) || 0;
      const pct = lineDiscount.get(productId) || 0;
      const lineTotal = round2(unitPrice * quantity * (1 - pct / 100));
      lines.push({ productId, name: p.name, unit: p.unit || 'piece', quantity, unitPrice, discountPercent: pct, lineTotal, tracked: Boolean(Number(p.track_inventory)) });
      subtotal += lineTotal;
    }
    subtotal = round2(subtotal);

    let discountAmount = 0;
    if (discount && Number(discount.value) > 0) {
      const v = Number(discount.value);
      discountAmount = discount.type === 'percent' ? round2((subtotal * Math.min(v, 100)) / 100) : Math.min(v, subtotal);
    }
    const taxable = round2(subtotal - discountAmount);
    const gstAmount = round2((taxable * rate) / 100);
    const total = round2(taxable + gstAmount);

    const sale = await withTransaction(async (client) => {
      for (const line of lines) {
        if (!line.tracked) continue;
        const taken = await client.query(
          `UPDATE shop_products
              SET inventory_count = inventory_count - $1, stock_quantity = stock_quantity - $1
            WHERE id = $2 AND shop_id = $3 AND inventory_count >= $1`,
          [line.quantity, line.productId, shop.id]
        );
        if (!taken || !taken.rowCount) {
          const err = new Error(`Not enough stock for ${line.name}`);
          err.status = 409;
          err.code = 'INSUFFICIENT_STOCK';
          throw err;
        }
      }
      const countRow = await client.query(
        `SELECT COUNT(*) AS n FROM pos_sales WHERE shop_id = $1 AND DATE(created_at) = CURRENT_DATE`, [shop.id]
      );
      const n = Number(((countRow.rows || countRow)[0] || {}).n) || 0;
      const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const billNo = `LS-${stamp}-${String(n + 1).padStart(4, '0')}`;
      const id = crypto.randomUUID();
      await client.query(
        `INSERT INTO pos_sales (id, shop_id, bill_no, items_json, subtotal, discount, gst_rate, gst_amount, total, payment_method, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [id, shop.id, billNo, JSON.stringify(lines.map(({ tracked, ...rest }) => rest)), subtotal, discountAmount, rate, gstAmount, total, method, req.user.id]
      );
      return { id, billNo };
    });

    res.status(201).json({
      success: true,
      sale: { id: sale.id, billNo: sale.billNo, subtotal, discount: discountAmount, gstRate: rate, gstAmount, total, paymentMethod: method },
    });
  } catch (error) {
    if (error && error.code === 'INSUFFICIENT_STOCK') {
      return res.status(409).json({ success: false, code: error.code, error: error.message });
    }
    next(error);
  }
};

exports.listSales = async (req, res, next) => {
  try {
    const rows = rowsOf(await query(
      `SELECT id, bill_no, subtotal, discount, gst_rate, gst_amount, total, payment_method, created_at
         FROM pos_sales WHERE shop_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [req.shop.id]
    ));
    const today = new Date().toISOString().slice(0, 10);
    const todaysTotal = round2(rows.filter((r) => String(r.created_at).slice(0, 10) === today).reduce((a, r) => a + Number(r.total || 0), 0));
    res.json({ success: true, sales: rows, todaysTotal });
  } catch (error) {
    next(error);
  }
};
