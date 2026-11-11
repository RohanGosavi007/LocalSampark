/**
 * C6 cart rules (src/lib/cartModel.js): multi-shop lines (D6), grouping,
 * revalidation against the server cart, and which checkout a cart takes.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addLine, groupByShop, fromServerLine, reconcile, describeChange, checkoutPlan, batchLines, blockers,
} from '../src/lib/cartModel.js';

const rice = { id: 'p1', name: 'Rice', price: 60, shop_id: 's1', shop_name: 'Shop One' };
const soap = { id: 'p9', name: 'Soap', price: 30, shop_id: 's2', shop_name: 'Shop Two' };

test('[C6.5] items from a second shop are kept beside the first, not discarded (D6)', () => {
  let items = addLine([], rice, 2);
  items = addLine(items, soap, 1);
  items = addLine(items, rice, 1);
  assert.equal(items.length, 2);
  assert.equal(items.find((i) => i.id === 'p1').quantity, 3);
  const groups = groupByShop(items);
  assert.deepEqual(groups.map((g) => [g.shopName, g.subtotal]), [['Shop One', 180], ['Shop Two', 30]]);
  // Different options are different lines.
  items = addLine(items, rice, 1, { size: '5kg' });
  assert.equal(items.filter((i) => i.id === 'p1').length, 2);
});

test('[C6.6] a multi-shop cart takes batch checkout, wallet or cash; one shop keeps every method', () => {
  const one = checkoutPlan([{ ...rice, quantity: 1 }]);
  assert.equal(one.mode, 'single');
  assert.equal(one.shopId, 's1');
  assert.ok(one.payments.includes('RAZORPAY'));
  const two = checkoutPlan([{ ...rice, quantity: 1 }, { ...soap, quantity: 2 }]);
  assert.equal(two.mode, 'batch');
  assert.deepEqual(two.payments, ['WALLET', 'COD']);
  assert.deepEqual(batchLines([{ ...soap, quantity: 2 }]), [{ shop_id: 's2', product_id: 'p9', quantity: 2 }]);
});

test('[C6.7] the server cart is the truth: new prices, stock shortfalls and dropped lines are reported', () => {
  const local = [{ ...rice, quantity: 2, options: {} }, { ...soap, quantity: 1, options: {} }];
  const server = {
    cartItems: [{
      id: 'c1', quantity: 2, price: 64, availableStock: 1, isOutOfStock: true, customOptions: null,
      product: { id: 'p1', name: 'Rice', price: 64, imageUrl: null, shop: { id: 's1', name: 'Shop One', category: 'Grocery' } },
    }],
  };
  const { items, changes } = reconcile(local, server);
  assert.equal(items.length, 1);
  assert.equal(items[0].price, 64);
  assert.equal(items[0].shop_id, 's1');
  assert.deepEqual(changes.map((c) => c.type).sort(), ['price', 'removed', 'stock']);
  assert.match(describeChange(changes.find((c) => c.type === 'price')), /₹64 \(was ₹60\)/);
  assert.match(describeChange({ type: 'stock', name: 'Rice', available: 1 }), /only 1 left/);
  assert.deepEqual(blockers(items), ['Rice']);
  assert.equal(fromServerLine(server.cartItems[0]).cartLineId, 'c1');
});
