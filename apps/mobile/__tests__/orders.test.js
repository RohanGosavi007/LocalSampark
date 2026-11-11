/**
 * C9 in the app: milestones, the cancellation window, live updates with a
 * polling fallback, the GST invoice and "order again" (src/services/orders.js).
 */
const fs = require('fs');
const path = require('path');
const {
  ORDER_STEPS, CUSTOMER_CANCELLABLE, stepIndex, canCancel, isFinal, shouldPoll, isEventFor, ORDER_EVENTS,
  orderRef, presentOrder, listMyOrders, cancelOrder, reorderLines, orderAgain, downloadInvoice, invoiceUrl,
} = require('../src/services/orders');

const LIFECYCLE = fs.readFileSync(
  path.join(__dirname, '..', '..', '..', 'backend', 'src', 'services', 'orderLifecycle.service.js'), 'utf8');

/** The server's status names, read from the TRANSITIONS table itself. */
function serverStatuses() {
  const block = LIFECYCLE.match(/const TRANSITIONS = \{([\s\S]*?)\n\};/)[1];
  return [...block.matchAll(/^\s*([a-z_]+):/gm)].map((m) => m[1]);
}

const ORDER = {
  id: 'e2e00000-0000-4000-8000-0000000000b1',
  shopId: 'shop-1',
  shopName: 'Fixture Shop',
  status: 'delivered',
  items: [
    { productId: 'p1', name: 'Rice 1kg', quantity: 2 },
    { productId: 'p2', name: 'Dal 500g', quantity: 1 },
    { productId: 'p3', name: 'Gone item', quantity: 1 },
  ],
};

describe('order milestones', () => {
  test('[C9.18] every status the server can set maps onto a milestone, in order', () => {
    const statuses = serverStatuses();
    expect(statuses).toEqual(expect.arrayContaining(['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled']));
    for (const s of statuses) {
      if (s === 'cancelled') expect(stepIndex(s)).toBe(-1);
      else expect(stepIndex(s)).toBeGreaterThanOrEqual(0);
    }
    // The progress is monotonic along the happy path.
    const path_ = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'].map(stepIndex);
    expect(path_).toEqual([...path_].sort((a, b) => a - b));
    expect(stepIndex('delivered')).toBe(ORDER_STEPS.length - 1);
    // The old screen keyed on "placed"/"packing", which the server never sends.
    expect(ORDER_STEPS.map((s) => s.key)).not.toContain('packing');
  });

  test('[C9.19] an order is presented as the server sent it, with nothing invented', () => {
    const o = presentOrder({ order: { id: 'abc', order_status: 'confirmed', total_amount: '120.5', shop_id: 's' }, items: [] });
    expect(o).toMatchObject({ id: 'abc', status: 'confirmed', total: 120.5, eta: null, driver: null, shopId: 's' });
    expect(presentOrder({})).toBeNull();
    expect(orderRef('e2e00000-0000')).toBe('E2E00000');
  });
});

describe('cancellation window', () => {
  test('[C9.20] the app offers cancel exactly where the server allows a customer to cancel', () => {
    const server = LIFECYCLE.match(/CUSTOMER_CANCELLABLE_FROM = new Set\(\[([^\]]*)\]\)/)[1]
      .split(',').map((s) => s.trim().replace(/'/g, '')).filter(Boolean);
    expect([...CUSTOMER_CANCELLABLE].sort()).toEqual(server.sort());
    for (const s of serverStatuses()) expect(canCancel(s)).toBe(server.includes(s));
  });

  test('[C9.21] cancelling sends the status change, and a refusal is shown as the server worded it', async () => {
    const apiPut = jest.fn().mockResolvedValue({ success: true, status: 'cancelled' });
    await expect(cancelOrder({ id: 'o1', status: 'confirmed' }, { apiPut })).resolves.toBe('cancelled');
    expect(apiPut).toHaveBeenCalledWith('/orders/o1/status', { status: 'cancelled', reason: 'Cancelled by customer' });

    // Outside the window nothing is sent.
    apiPut.mockClear();
    await expect(cancelOrder({ id: 'o1', status: 'preparing' }, { apiPut })).rejects.toThrow(/no longer be cancelled/);
    expect(apiPut).not.toHaveBeenCalled();

    // The server's own message (the shop moved first) reaches the customer.
    const refusing = jest.fn().mockRejectedValue(new Error('The shop has started preparing this order, so it can no longer be cancelled.'));
    await expect(cancelOrder({ id: 'o1', status: 'pending' }, { apiPut: refusing })).rejects.toThrow(/started preparing/);
  });
});

describe('live updates', () => {
  test('[C9.22] polling runs only while the socket is down and the order can still change', () => {
    expect(shouldPoll('confirmed', false)).toBe(true);
    expect(shouldPoll('out_for_delivery', false)).toBe(true);
    expect(shouldPoll('confirmed', true)).toBe(false);
    for (const s of ['delivered', 'cancelled', 'returned']) {
      expect(isFinal(s)).toBe(true);
      expect(shouldPoll(s, false)).toBe(false);
    }
    // The event the status route emits is one the screen listens for.
    const route = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'backend', 'src', 'modules', 'ecommerce', 'routes', 'order.routes.js'), 'utf8');
    const emitted = route.match(/\.emit\('([A-Z_]+)', \{ orderId: req\.params\.orderId, status/)[1];
    expect(ORDER_EVENTS).toContain(emitted);
    expect(isEventFor({ orderId: 'o1', status: 'preparing' }, 'o1')).toBe(true);
    expect(isEventFor({ orderId: 'o2' }, 'o1')).toBe(false);
    expect(isEventFor(null, 'o1')).toBe(false);
  });
});

describe('order again', () => {
  const listed = [
    { id: 'p1', name: 'Rice 1kg', price: '64.00', is_available: '1' },
    { id: 'p2', name: 'Dal 500g', price: 55, is_available: 1, stock_quantity: 0 },
  ];

  test('[C9.23] only items still listed and in stock go back in the cart, at today\'s price', () => {
    const { lines, missing } = reorderLines(ORDER, listed);
    expect(lines).toHaveLength(1);
    expect(lines[0].product).toMatchObject({ id: 'p1', price: 64, shop_id: 'shop-1', shop_name: 'Fixture Shop' });
    expect(lines[0].quantity).toBe(2);
    expect(missing).toEqual(['Dal 500g', 'Gone item']);
  });

  test('[C9.24] a cart holding another shop is left alone and the customer is told why', async () => {
    const apiGet = jest.fn().mockResolvedValue(listed);
    const ok = { addItem: jest.fn().mockReturnValue({ added: true }) };
    await expect(orderAgain(ORDER, ok, { apiGet })).resolves.toMatchObject({ added: 1, reason: null });
    expect(apiGet).toHaveBeenCalledWith('/shops/shop-1/products');
    expect(ok.addItem).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1', price: 64 }), 2);

    const other = { addItem: jest.fn().mockReturnValue({ added: false, reason: 'different_shop', currentShopName: 'Other Shop' }) };
    await expect(orderAgain(ORDER, other, { apiGet })).resolves.toMatchObject({ added: 0, reason: 'different_shop', currentShopName: 'Other Shop' });

    const none = { addItem: jest.fn() };
    await expect(orderAgain(ORDER, none, { apiGet: jest.fn().mockResolvedValue([]) })).resolves.toMatchObject({ added: 0, reason: 'none_available' });
    expect(none.addItem).not.toHaveBeenCalled();
  });
});

describe('invoice', () => {
  function fakeFs() {
    const made = [];
    class File {
      constructor(dir, name) { this.uri = `${dir.uri}/${name}`; this.name = name; this.exists = false; made.push(this); }
      delete() { this.deleted = true; }
    }
    File.downloadFileAsync = jest.fn(async (url, target) => target);
    return { File, Paths: { cache: { uri: 'file:///cache' } }, made };
  }

  test('[C9.25] the GST invoice PDF is downloaded with the session and handed to the share sheet', async () => {
    const fs_ = fakeFs();
    const sharing = { isAvailableAsync: jest.fn().mockResolvedValue(true), shareAsync: jest.fn() };
    const apiGet = jest.fn().mockResolvedValue({ success: true, invoice: {} });
    const uri = await downloadInvoice(ORDER.id, {
      api: { apiGet }, fs: fs_, sharing, headers: async () => ({ Authorization: 'Bearer t0k' }),
    });
    expect(apiGet).toHaveBeenCalledWith(`/orders/${ORDER.id}/invoice`);
    expect(fs_.File.downloadFileAsync).toHaveBeenCalledWith(
      invoiceUrl(ORDER.id), expect.anything(), { headers: { Authorization: 'Bearer t0k', Accept: 'application/pdf' } });
    expect(invoiceUrl(ORDER.id)).toMatch(new RegExp(`/orders/${ORDER.id}/invoice/pdf$`));
    expect(uri).toBe('file:///cache/Invoice-E2E00000.pdf');
    expect(sharing.shareAsync).toHaveBeenCalledWith(uri, expect.objectContaining({ mimeType: 'application/pdf' }));
  });

  test('[C9.26] a refused invoice stops before any download, with the server\'s reason', async () => {
    const fs_ = fakeFs();
    const apiGet = jest.fn().mockRejectedValue(new Error('Not authorized to view invoice for this order'));
    await expect(downloadInvoice('o1', { api: { apiGet }, fs: fs_, sharing: {}, headers: async () => ({}) }))
      .rejects.toThrow(/Not authorized/);
    expect(fs_.File.downloadFileAsync).not.toHaveBeenCalled();
  });
});

describe('order history', () => {
  test('[C9.27] an empty history is empty; the list screen has no sample rows', async () => {
    await expect(listMyOrders({ apiGet: jest.fn().mockResolvedValue({ success: true, data: [] }) })).resolves.toEqual([]);
    await expect(listMyOrders({ apiGet: jest.fn().mockResolvedValue({ data: [{ id: 'x' }] }) })).resolves.toEqual([{ id: 'x' }]);
    const screen = fs.readFileSync(path.join(__dirname, '..', 'app', 'orders', 'index.js'), 'utf8');
    expect(screen).not.toMatch(/mock1|mock2|orders\?\.length \? orders :/);
    expect(screen).toMatch(/\/orders\/track\/\$\{item\.id\}/);
  });
});
