/**
 * The bulk-upload page reports what was really imported, so the parser must not guess:
 * a missing price is a rejected row, not a product priced at 0.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, productsFromRows, TEMPLATE_CSV } from '../src/lib/catalogCsv.js';

test('quoted cells, doubled quotes, embedded commas/newlines and CRLF parse', () => {
  const rows = parseCsv('a,b\r\n"x, y","say ""hi"""\r\n"line1\nline2",z\r\n');
  assert.deepEqual(rows, [['a', 'b'], ['x, y', 'say "hi"'], ['line1\nline2', 'z']]);
});

test('the downloadable template is itself a valid import', () => {
  const { products, errors } = productsFromRows(parseCsv(TEMPLATE_CSV));
  assert.deepEqual(errors, []);
  assert.deepEqual(products, [{ name: 'Basmati Rice 1kg', sku: 'RICE-001', price: 120, category: 'Grocery', stockQuantity: 50 }]);
});

test('bad rows are reported with their line number and left out', () => {
  const csv = 'Product Name,Price (₹),Initial Stock\nGood,10,5\n,10,1\nNoPrice,,1\nNegative,-4,1\nFraction,10,1.5\nAlsoGood,2.5,\n';
  const { products, errors } = productsFromRows(parseCsv(csv));
  assert.deepEqual(products.map((p) => p.name), ['Good', 'AlsoGood']);
  assert.equal(products[1].stockQuantity, 0);
  assert.equal(errors.length, 4);
  assert.match(errors[0], /^Line 3/);
  assert.match(errors[1], /^Line 4 \(NoPrice\)/);
});

test('a file without the required columns is refused outright', () => {
  const { products, errors } = productsFromRows(parseCsv('SKU,Category\nA,B\n'));
  assert.equal(products.length, 0);
  assert.match(errors[0], /Missing required column/);
  assert.deepEqual(productsFromRows([]).products, []);
});
