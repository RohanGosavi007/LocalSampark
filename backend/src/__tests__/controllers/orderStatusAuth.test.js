/**
 * Authorisation for PATCH /orders/:id/status.
 *
 * The route was registered with no auth middleware at all, and the handler
 * applied whatever status it was given. Because DELIVERED also writes
 * payment_status = 'paid', that was a way for anyone at all to mark an order
 * paid without paying.
 *
 * authenticate() alone does not fix it — it only proves who is calling. These
 * tests pin the actual rule (services/orderLifecycle.service.js): admins and the
 * owning vendor move it through its states, the assigned rider may mark it picked
 * up but completes delivery only with the customer's code, the customer may only
 * cancel their own order and only before preparation starts, and everyone else is
 * refused.
 *
 * The handler was moved off Prisma onto raw SQL (`orders` joined to
 * `local_shops`) when the dual-schema split was closed, so these mock the
 * database helpers rather than the Prisma client. The rules under test did not
 * change; only where the order is read from and written to.
 */

const mockQueryOne = jest.fn();
const mockQuery = jest.fn();

jest.mock('../../config/database', () => ({
  query: (...args) => mockQuery(...args),
  queryOne: (...args) => mockQueryOne(...args),
  queryMany: jest.fn(),
  // The status change and its effects are one transaction; the mock client
  // sends its statements to the same spy.
  withTransaction: (callback) => callback({ query: (...args) => mockQuery(...args) }),
}));

// The controller constructs a Razorpay client at module load.
jest.mock('razorpay', () => jest.fn().mockImplementation(() => ({ orders: { create: jest.fn() } })));

const { updateOrderStatus } = require('../../modules/ecommerce/controllers/unified-superapp.controller');

const VENDOR_ID = 'vendor-1';
const RUNNER_ID = 'runner-1';
const CUSTOMER_ID = 'customer-1';
const STRANGER_ID = 'stranger-1';

/**
 * A row shaped the way the handler's SELECT returns it: `orders` columns plus
 * the shop owner joined in from local_shops.
 */
function order(overrides = {}) {
  return {
    id: 'ORD-1',
    user_id: CUSTOMER_ID,
    order_status: 'pending',
    shop_owner_id: VENDOR_ID,
    assigned_agent_id: RUNNER_ID,
    ...overrides,
  };
}

function mockReqRes(user, status, orderRow = order()) {
  // First queryOne is the order lookup; the second is the re-read after update.
  mockQueryOne.mockReset();
  mockQueryOne.mockResolvedValueOnce(orderRow).mockResolvedValue({ ...orderRow, order_status: status });

  const req = {
    params: { id: 'ORD-1' },
    body: { status },
    user,
    app: { get: () => null },
  };
  const res = {
    statusCode: null,
    payload: null,
    status(c) { this.statusCode = c; return this; },
    json(p) { this.payload = p; return this; },
  };
  return { req, res, next: jest.fn() };
}

/** Did the handler actually write? UPDATE goes through query(), not queryOne(). */
const wrote = () => mockQuery.mock.calls.some(([sql]) => /^\s*UPDATE\s+orders/i.test(sql));

beforeEach(() => {
  jest.clearAllMocks();
  mockQuery.mockResolvedValue({ rowCount: 1, rows: [] });
});

const allowed = (res) => res.statusCode !== 403;

describe('who may change an order status', () => {
  it('refuses an unrelated signed-in user', async () => {
    const { req, res, next } = mockReqRes({ id: STRANGER_ID, role: 'user' }, 'DELIVERED');
    await updateOrderStatus(req, res, next);
    expect(res.statusCode).toBe(403);
    expect(wrote()).toBe(false);
  });

  it('refuses a stranger even for an innocuous-looking transition', async () => {
    const { req, res, next } = mockReqRes({ id: STRANGER_ID, role: 'user' }, 'ACCEPTED');
    await updateOrderStatus(req, res, next);
    expect(res.statusCode).toBe(403);
  });

  it('allows the shop owner', async () => {
    const { req, res, next } = mockReqRes({ id: VENDOR_ID, role: 'shop_owner' }, 'ACCEPTED');
    await updateOrderStatus(req, res, next);
    expect(allowed(res)).toBe(true);
    expect(wrote()).toBe(true);
  });

  it('allows an admin', async () => {
    const { req, res, next } = mockReqRes({ id: STRANGER_ID, role: 'super_admin' }, 'CANCELLED');
    await updateOrderStatus(req, res, next);
    expect(allowed(res)).toBe(true);
  });

  it('does not leak whether the order exists or its state', async () => {
    const { req, res, next } = mockReqRes({ id: STRANGER_ID, role: 'user' }, 'DELIVERED');
    await updateOrderStatus(req, res, next);
    expect(res.payload.error).toBe('You are not allowed to change this order to that status.');
  });
});

describe('assigned rider', () => {
  it('may mark the order picked up', async () => {
    const { req, res, next } = mockReqRes({ id: RUNNER_ID, role: 'delivery_agent' }, 'OUT_FOR_DELIVERY', order({ order_status: 'assigned' }));
    await updateOrderStatus(req, res, next);
    expect(allowed(res)).toBe(true);
    expect(wrote()).toBe(true);
  });

  it("may not mark it delivered here: that needs the customer's code", async () => {
    const { req, res, next } = mockReqRes({ id: RUNNER_ID, role: 'delivery_agent' }, 'DELIVERED', order({ order_status: 'out_for_delivery' }));
    await updateOrderStatus(req, res, next);
    expect(res.statusCode).toBe(403);
    expect(res.payload.code).toBe('HANDOVER_CODE_REQUIRED');
    expect(wrote()).toBe(false);
  });

  it('may not cancel it', async () => {
    const { req, res, next } = mockReqRes({ id: RUNNER_ID, role: 'delivery_agent' }, 'CANCELLED', order({ order_status: 'assigned' }));
    await updateOrderStatus(req, res, next);
    expect(res.statusCode).toBe(403);
  });

  it('is refused when they are not the rider assigned to this order', async () => {
    const { req, res, next } = mockReqRes(
      { id: 'runner-2', role: 'delivery_agent' },
      'DELIVERED',
      order({ assigned_agent_id: RUNNER_ID })
    );
    await updateOrderStatus(req, res, next);
    expect(res.statusCode).toBe(403);
  });

  it('is refused when no rider is assigned at all', async () => {
    const { req, res, next } = mockReqRes(
      { id: RUNNER_ID, role: 'delivery_agent' },
      'DELIVERED',
      order({ assigned_agent_id: null })
    );
    await updateOrderStatus(req, res, next);
    expect(res.statusCode).toBe(403);
  });
});

describe('customer', () => {
  it('may cancel their own pending order', async () => {
    const { req, res, next } = mockReqRes({ id: CUSTOMER_ID, role: 'user' }, 'CANCELLED');
    await updateOrderStatus(req, res, next);
    expect(allowed(res)).toBe(true);
  });

  it('may not cancel once the shop is preparing it', async () => {
    for (const status of ['preparing', 'out_for_delivery']) {
      const { req, res, next } = mockReqRes({ id: CUSTOMER_ID, role: 'user' }, 'CANCELLED', order({ order_status: status }));
      await updateOrderStatus(req, res, next);
      expect(res.statusCode).toBe(409);
      expect(res.payload.code).toBe('TOO_LATE_TO_CANCEL');
    }
    expect(wrote()).toBe(false);
  });

  it('may not mark their own order delivered', async () => {
    // This was the headline case: delivered used to set payment_status = 'paid'.
    const { req, res, next } = mockReqRes({ id: CUSTOMER_ID, role: 'user' }, 'DELIVERED');
    await updateOrderStatus(req, res, next);
    expect(res.statusCode).toBe(403);
    expect(wrote()).toBe(false);
  });
});

describe('input validation', () => {
  it('rejects a status outside the state machine before any lookup', async () => {
    const { req, res, next } = mockReqRes({ id: VENDOR_ID, role: 'shop_owner' }, 'TELEPORTED');
    await updateOrderStatus(req, res, next);
    expect(res.statusCode).toBe(400);
    expect(mockQueryOne).not.toHaveBeenCalled();
  });

  it('accepts ACCEPTED as an alias for the stored status confirmed', async () => {
    // The old Prisma enum used ACCEPTED; orders.order_status stores confirmed.
    // Existing clients send the former, so it is mapped rather than rejected.
    const { req, res, next } = mockReqRes({ id: VENDOR_ID, role: 'shop_owner' }, 'ACCEPTED');
    await updateOrderStatus(req, res, next);
    expect(allowed(res)).toBe(true);
    const update = mockQuery.mock.calls.find(([sql]) => /^\s*UPDATE\s+orders/i.test(sql));
    expect(update[1][0]).toBe('confirmed');
  });
});
