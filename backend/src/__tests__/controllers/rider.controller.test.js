/**
 * Rider ownership.
 *
 * PUT /logistics/riders/:id/status and POST /logistics/riders/:id/location were
 * entirely unauthenticated — the route file's own comment read "in reality
 * these would be protected by rider JWT middleware". Adding authenticate() was
 * not enough on its own for two reasons, and both are covered here:
 *
 *   1. delivery_riders.id is a 'RIDER-<hex>' value while users.id is a UUID, so
 *      the controller's `req.user?.id || req.params.id` wrote against the
 *      caller's user id. Once the route required auth, req.user.id was always
 *      set, so the UPDATE matched zero rows and still replied "Status updated".
 *   2. With no link between the two tables, any signed-in user could act on any
 *      rider. Migration 089 adds delivery_riders.user_id; loadOwnedRider()
 *      enforces it and fails closed when it is NULL.
 */

jest.mock('../../config/database', () => ({
  query: jest.fn(),
  queryOne: jest.fn(),
  queryMany: jest.fn(),
}));

const { query, queryOne } = require('../../config/database');
const {
  updateRiderStatus,
  updateLocation,
  RIDER_STATUSES,
} = require('../../modules/logistics/controllers/rider.controller');

const RIDER_ID = 'RIDER-DEADBEEF';
const OWNER_USER_ID = '11111111-1111-1111-1111-111111111111';
const OTHER_USER_ID = '22222222-2222-2222-2222-222222222222';

function mockReqRes(user, body = {}, params = { id: RIDER_ID }) {
  const req = { user, body, params, headers: {}, app: { get: () => null } };
  const res = {
    statusCode: null,
    payload: null,
    status(code) { this.statusCode = code; return this; },
    json(p) { this.payload = p; return this; },
  };
  return { req, res, next: jest.fn() };
}

beforeEach(() => {
  jest.clearAllMocks();
  query.mockResolvedValue({ rowCount: 1, rows: [] });
});

describe('updateRiderStatus', () => {
  it('lets the owning rider set their status, keyed on the rider id', async () => {
    queryOne.mockResolvedValue({ id: RIDER_ID, user_id: OWNER_USER_ID, status: 'offline' });
    const { req, res, next } = mockReqRes({ id: OWNER_USER_ID, role: 'delivery_agent' }, { status: 'available' });

    await updateRiderStatus(req, res, next);

    expect(res.payload).toEqual({ success: true, message: 'Status updated' });
    // The regression that mattered: the UPDATE must target RIDER-…, not the user id.
    expect(query).toHaveBeenCalledWith(
      'UPDATE delivery_riders SET status = $1 WHERE id = $2',
      ['available', RIDER_ID]
    );
  });

  it('refuses a different signed-in user', async () => {
    queryOne.mockResolvedValue({ id: RIDER_ID, user_id: OWNER_USER_ID });
    const { req, res, next } = mockReqRes({ id: OTHER_USER_ID, role: 'user' }, { status: 'available' });

    await updateRiderStatus(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(query).not.toHaveBeenCalled();
  });

  it('fails closed on a rider row that is not linked to any user', async () => {
    // Unlinked rows are exactly the case the old code treated as "anyone may act".
    queryOne.mockResolvedValue({ id: RIDER_ID, user_id: null });
    const { req, res, next } = mockReqRes({ id: OTHER_USER_ID, role: 'user' }, { status: 'available' });

    await updateRiderStatus(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(query).not.toHaveBeenCalled();
  });

  it('lets an admin act on an unlinked rider', async () => {
    queryOne.mockResolvedValue({ id: RIDER_ID, user_id: null });
    const { req, res, next } = mockReqRes({ id: OTHER_USER_ID, role: 'super_admin' }, { status: 'on_delivery' });

    await updateRiderStatus(req, res, next);

    expect(res.payload).toEqual({ success: true, message: 'Status updated' });
  });

  it('404s for a rider that does not exist', async () => {
    queryOne.mockResolvedValue(null);
    const { req, res, next } = mockReqRes({ id: OWNER_USER_ID }, { status: 'available' });

    await updateRiderStatus(req, res, next);

    expect(res.statusCode).toBe(404);
  });

  it('rejects a status outside the allowed set', async () => {
    // The column is bare TEXT with no CHECK, so an arbitrary value would be
    // written and the dispatch engine's status = 'available' filter would stop
    // matching that rider with no error anywhere.
    const { req, res, next } = mockReqRes({ id: OWNER_USER_ID }, { status: 'ONLINE_MAYBE' });

    await updateRiderStatus(req, res, next);

    expect(res.statusCode).toBe(400);
    expect(query).not.toHaveBeenCalled();
  });

  it('exposes the allowed statuses', () => {
    expect(RIDER_STATUSES).toEqual(['offline', 'available', 'on_delivery']);
  });
});

describe('updateLocation', () => {
  it('records a fix against the rider id for the owning rider', async () => {
    queryOne.mockResolvedValue({ id: RIDER_ID, user_id: OWNER_USER_ID });
    const { req, res, next } = mockReqRes(
      { id: OWNER_USER_ID, role: 'delivery_agent' },
      { latitude: 18.5204, longitude: 73.8567, order_id: 'ORD-1' }
    );

    await updateLocation(req, res, next);

    expect(res.payload).toEqual({ success: true });
    expect(query).toHaveBeenCalledWith(
      'INSERT INTO live_tracking (rider_id, order_id, latitude, longitude) VALUES ($1, $2, $3, $4)',
      [RIDER_ID, 'ORD-1', 18.5204, 73.8567]
    );
  });

  it('refuses to post a fix for someone else\'s rider', async () => {
    queryOne.mockResolvedValue({ id: RIDER_ID, user_id: OWNER_USER_ID });
    const { req, res, next } = mockReqRes(
      { id: OTHER_USER_ID, role: 'user' },
      { latitude: 18.5, longitude: 73.8 }
    );

    await updateLocation(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(query).not.toHaveBeenCalled();
  });

  it('rejects coordinates that are out of range or unparseable', async () => {
    queryOne.mockResolvedValue({ id: RIDER_ID, user_id: OWNER_USER_ID });

    for (const body of [
      { latitude: 200, longitude: 73.8 },
      { latitude: 18.5, longitude: 999 },
      { latitude: 'north', longitude: 73.8 },
      {},
    ]) {
      const { req, res, next } = mockReqRes({ id: OWNER_USER_ID }, body);
      await updateLocation(req, res, next);
      expect(res.statusCode).toBe(400);
    }
    expect(query).not.toHaveBeenCalled();
  });
});
