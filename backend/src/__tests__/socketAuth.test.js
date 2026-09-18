/**
 * Socket handshake identity, and the order-room authorisation built on it.
 *
 * Two defects this pins:
 *
 * 1. The handshake assigned the decoded JWT verbatim to `socket.user`. The
 *    payload carries the subject as `userId` (generateTokens in
 *    modules/core/routes/auth.routes.js), but every socket handler reads
 *    `socket.user.id` — the society flat room, the gatekeeper room, the
 *    VISITOR_RESPONSE relay. So each of those compared `undefined` against a
 *    real user id and refused *everyone*, including the resident who lives in
 *    the flat. Verified live before the fix: a seeded resident was refused
 *    their own flat's room.
 *
 * 2. There was no `join_order_room` handler at all. orderSocket.js and
 *    trackingSocket.js broadcast every update to `order_<id>`, and nothing ever
 *    joined those rooms, so live order tracking could not work for any client
 *    on any platform. The mobile app covered the gap with a MockSocket that
 *    invented driver coordinates.
 *
 * This runs a real socket.io server in-process against a real client, because
 * the bug was in the wiring rather than in any one function.
 */

const http = require('http');
const jwt = require('jsonwebtoken');

const PORT = 45871; // fixed, well away from the app's own ports

// The handshake verifies against config/secrets, which reads JWT_SECRET.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-localsampark-2026';
process.env.USE_SQLITE = 'true';

const { initSocketIO } = require('../sockets');
const ioClient = require('socket.io-client');

let server;
let io;

const sign = (payload) => jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '5m' });

/** Connect, run one exchange, resolve with the outcome. */
function exchange({ token, event, payload, successEvent, timeout = 6000 }) {
  return new Promise((resolve) => {
    const socket = ioClient.io(`http://127.0.0.1:${PORT}`, {
      transports: ['websocket'],
      auth: token ? { token } : undefined,
      reconnection: false,
      timeout,
    });

    const finish = (outcome, detail) => {
      socket.close();
      resolve({ outcome, detail });
    };

    const timer = setTimeout(() => finish('timeout'), timeout);

    socket.on('connect', () => socket.emit(event, payload));
    socket.on(successEvent, (p) => {
      clearTimeout(timer);
      finish('ok', p);
    });
    socket.on('socket_error', (p) => {
      clearTimeout(timer);
      finish('refused', p && p.reason);
    });
    socket.on('connect_error', (e) => {
      clearTimeout(timer);
      finish('connect_error', e.message);
    });
  });
}

beforeAll((done) => {
  server = http.createServer();
  io = initSocketIO(server);
  server.listen(PORT, '127.0.0.1', done);
});

afterAll(async () => {
  if (io) io.close();
  if (server) await new Promise((r) => server.close(r));
});

describe('socket handshake identity', () => {
  test('a userId-only payload still yields socket.user.id', async () => {
    // The exact shape auth.routes.js issues.
    const token = sign({ userId: 'identity-probe-1', role: 'user', tokenVersion: 0 });

    // join_order_room reports 'not_found' for an unknown order, but only once
    // it has got past the "are you a guest" gate — which is what proves the
    // identity was resolved. A guest is refused with 'not_authorised' first.
    const r = await exchange({
      token,
      event: 'join_order_room',
      payload: 'no-such-order-id',
      successEvent: 'joined_order_room',
    });

    expect(r.outcome).toBe('refused');
    expect(r.detail).toBe('not_found');
  });

  test('an anonymous socket is treated as a guest and refused', async () => {
    const r = await exchange({
      event: 'join_order_room',
      payload: 'no-such-order-id',
      successEvent: 'joined_order_room',
    });
    expect(r.outcome).toBe('refused');
    expect(r.detail).toBe('not_authorised');
  });

  test('a token signed with the wrong secret degrades to guest, not a crash', async () => {
    const bad = jwt.sign({ userId: 'x' }, 'not-the-right-secret');
    const r = await exchange({
      token: bad,
      event: 'join_order_room',
      payload: 'no-such-order-id',
      successEvent: 'joined_order_room',
    });
    expect(r.outcome).toBe('refused');
    expect(r.detail).toBe('not_authorised');
  });
});

describe('join_order_room', () => {
  test('is registered under both event names', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(path.join(__dirname, '../sockets/index.js'), 'utf8');
    expect(src).toContain("socket.on('join_order_room', joinOrderRoom)");
    // The web SocketContext emits 'order:track'; both must reach the same
    // authorised handler. Re-emitting on the server would not work — there,
    // socket.emit sends to the *client*.
    expect(src).toContain("socket.on('order:track', joinOrderRoom)");
  });

  test('ignores a call with no order id rather than throwing', async () => {
    const token = sign({ userId: 'identity-probe-2', role: 'user' });
    const r = await exchange({
      token,
      event: 'join_order_room',
      payload: undefined,
      successEvent: 'joined_order_room',
      timeout: 2500,
    });
    // No reply at all is the correct behaviour for a malformed call.
    expect(r.outcome).toBe('timeout');
  });
});
