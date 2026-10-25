// Parsing and checking a product CSV, kept free of React so it can be tested on its own.

/** Splits CSV text into rows of cells: quoted cells, doubled quotes, commas and newlines inside quotes. */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  const src = String(text || '').replace(/^﻿/, '');
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i += 1;
      row.push(cell); cell = '';
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== '')) rows.push(row);
  return rows;
}

const HEADER_ALIASES = {
  name: ['product name', 'name', 'product'],
  sku: ['sku', 'sku / barcode', 'barcode'],
  price: ['price', 'price (₹)', 'price (rs)', 'mrp'],
  category: ['category'],
  stock: ['initial stock', 'stock', 'stock quantity', 'quantity'],
};

export const TEMPLATE_CSV = 'Product Name,SKU / Barcode,Price (₹),Category,Initial Stock\nBasmati Rice 1kg,RICE-001,120,Grocery,50\n';

/**
 * Turns parsed rows into products. Returns { products, errors }: a row with a problem is
 * reported with its line number and left out; nothing is guessed (a missing price is not 0).
 */
export function productsFromRows(rows) {
  if (!rows.length) return { products: [], errors: ['The file is empty.'] };
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = {};
  for (const [key, names] of Object.entries(HEADER_ALIASES)) col[key] = header.findIndex((h) => names.includes(h));
  const missing = ['name', 'price'].filter((k) => col[k] < 0);
  if (missing.length) {
    return { products: [], errors: [`Missing required column: ${missing.map((k) => (k === 'name' ? 'Product Name' : 'Price')).join(', ')}.`] };
  }

  const products = [];
  const errors = [];
  rows.slice(1).forEach((r, i) => {
    const line = i + 2;
    const get = (k) => (col[k] >= 0 ? String(r[col[k]] ?? '').trim() : '');
    const name = get('name');
    const price = Number(get('price'));
    const stockText = get('stock');
    const stock = stockText === '' ? 0 : Number(stockText);
    if (!name) { errors.push(`Line ${line}: product name is empty.`); return; }
    if (!Number.isFinite(price) || price <= 0) { errors.push(`Line ${line} (${name}): price must be a number above 0.`); return; }
    if (!Number.isInteger(stock) || stock < 0) { errors.push(`Line ${line} (${name}): stock must be a whole number, 0 or more.`); return; }
    products.push({ name, sku: get('sku') || undefined, price, category: get('category') || undefined, stockQuantity: stock });
  });
  return { products, errors };
}
