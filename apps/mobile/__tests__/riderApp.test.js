/**
 * The rider's side of delivery in the app (R1–R5), and rate-limit handling (P9).
 *
 * src/services/rider.js is what the rider tabs call. Each test drives it
 * against a stubbed fetch and checks the request the server would receive,
 * and how the app treats the server's answer. The route checks read
 * backend/src/modules/services/routes/delivery.routes.js, so a renamed route
 * fails here rather than on a rider's phone.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const ROUTES = fs.readFileSync(
  path.join(ROOT, '..', '..', 'backend', 'src', 'modules', 'services', 'routes', 'delivery.routes.js'), 'utf8');

/** Is METHOD /delivery<route> served? Route params match any segment. */
function served(method, url) {
  const p = url.replace(/^\/delivery/, '').split('?')[0];
  const decls = [...ROUTES.matchAll(/router\.(get|post|put|patch|delete)\(\s*'([^']+)'/g)];
  return decls.some(([, m, r]) => m === method.toLowerCase()
    && new RegExp(`^${r.replace(/:[A-Za-z]+/g, '[^/]+')}$`).test(p));
}

function respond(status, body, headers = {}) {
  const h = { 'content-type': 'application/json', ...headers };
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (n) => h[String(n).toLowerCase()] ?? null },
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

let rider;
let Location;
const calls = () => global.fetch.mock.calls.map(([url, init]) => ({
  method: (init && init.method) || 'GET',
  path: String(url).replace(/^.*\/api\/v1/, ''),
  body: init && init.body ? JSON.parse(init.body) : undefined,
}));

beforeEach(() => {
  jest.resetModules();
  global.fetch = jest.fn();
  Location = require('./__mocks__/expoLocation');
  Location.__reset();
  Location.watchPositionAsync.mockClear();
  rider = require('../src/services/rider');
});

describe('R1 onboarding status and duty', () => {
  test('[R1.20] a rider whose documents are not approved is not offered the duty switch', () => {
    expect(rider.dutyState(null)).toMatchObject({ canToggle: false, reason: 'apply' });
    expect(rider.dutyState({ kycStatus: 'pending' })).toMatchObject({ canToggle: false, reason: 'pending' });
    expect(rider.dutyState({ kycStatus: 'rejected', rejectionReason: 'Licence photo unreadable' }))
      .toMatchObject({ canToggle: false, reason: 'rejected', rejectionReason: 'Licence photo unreadable' });
    expect(rider.dutyState({ kycStatus: 'approved', isOnline: true })).toMatchObject({ canToggle: true, online: true });
    // The same set the server accepts in updateDutyStatus.
    const ctrl = fs.readFileSync(path.join(ROOT, '..', '..', 'backend', 'src', 'modules', 'services', 'controllers', 'delivery.controller.js'), 'utf8');
    const serverSet = ctrl.match(/APPROVED_STATUSES = \[([^\]]+)\]/)[1].split(',').map((s) => s.trim().replace(/'/g, ''));
    expect([...rider.APPROVED_KYC].sort()).toEqual(serverSet.sort());
  });

  test('[R1.21] a rider who has not applied gets no profile, not an error', async () => {
    global.fetch.mockResolvedValueOnce(respond(404, { success: false, error: 'Delivery agent profile not found' }));
    await expect(rider.getRiderProfile()).resolves.toBeNull();
    global.fetch.mockResolvedValueOnce(respond(200, { success: true, profile: { kycStatus: 'approved', isOnline: false } }));
    await expect(rider.getRiderProfile()).resolves.toMatchObject({ kycStatus: 'approved' });
    expect(calls().every((c) => c.method === 'GET' && c.path === '/delivery/profile')).toBe(true);
    expect(served('GET', '/delivery/profile')).toBe(true);
  });

  test('[R1.22] going online sends the current position to PUT /delivery/duty; going offline sends none', async () => {
    global.fetch.mockResolvedValue(respond(200, { success: true }));
    await rider.setDuty(true);
    await rider.setDuty(false);
    const [on, off] = calls();
    expect(on).toEqual({ method: 'PUT', path: '/delivery/duty', body: { isOnline: true, latitude: 18.53, longitude: 73.87 } });
    expect(off).toEqual({ method: 'PUT', path: '/delivery/duty', body: { isOnline: false } });
    expect(served('PUT', '/delivery/duty')).toBe(true);
  });

  test('[R1.23] the server\'s refusal to go online reaches the rider in its own words', async () => {
    global.fetch.mockResolvedValueOnce(respond(409, { success: false, code: 'CASH_LIMIT_REACHED', error: 'You are holding ₹3500 in cash. Deposit it before going online.' }));
    await expect(rider.setDuty(true)).rejects.toMatchObject({ status: 409, message: 'You are holding ₹3500 in cash. Deposit it before going online.' });
  });

  test('[R1.24] the dashboard switch is the server\'s state, not a local flag', () => {
    const src = read('src/screens/dashboards/DeliveryDashboard.js');
    expect(src).toMatch(/setDutyOnServer\(next\)/);
    expect(src).toMatch(/getRiderProfile\(\)/);
    // The header used to read "Online" and offer GO OFFLINE whatever the state.
    expect(src).not.toMatch(/>Online\{user/);
  });
});

describe('R2 dispatch', () => {
  test('[R2.20] accepting a job claims it on the server, and a lost race is reported', async () => {
    global.fetch.mockResolvedValueOnce(respond(200, { success: true }));
    await rider.acceptJob('job-1');
    global.fetch.mockResolvedValueOnce(respond(409, { success: false, error: 'Another rider has already accepted this job.' }));
    await expect(rider.acceptJob('job-2')).rejects.toMatchObject({ status: 409 });
    expect(calls().map((c) => `${c.method} ${c.path}`)).toEqual(['POST /delivery/jobs/job-1/accept', 'POST /delivery/jobs/job-2/accept']);
    expect(served('POST', '/delivery/jobs/x/accept')).toBe(true);
    expect(served('GET', '/delivery/jobs')).toBe(true);
    expect(served('GET', '/delivery/my-jobs')).toBe(true);
  });
});

describe('R3 fulfilment and proof of delivery', () => {
  test('[R3.20] pickup goes through /pickup, the route that tells the customer', async () => {
    global.fetch.mockResolvedValueOnce(respond(200, { success: true, status: 'out_for_delivery' }));
    await rider.pickUp('job-1');
    expect(calls()[0]).toMatchObject({ method: 'POST', path: '/delivery/jobs/job-1/pickup' });
    expect(served('POST', '/delivery/jobs/x/pickup')).toBe(true);
    expect(read('app/(tabs)/active.js')).toMatch(/await pickUp\(job\.id\)/);
    expect(read('app/(tabs)/active.js')).not.toMatch(/\/status`/);
  });

  test('[R3.21] delivery closes only with the customer\'s handover code, checked by the server', async () => {
    await expect(rider.completeJob('job-1', ' 12 ')).rejects.toMatchObject({ code: 'OTP_REQUIRED' });
    expect(global.fetch).not.toHaveBeenCalled();

    global.fetch.mockResolvedValueOnce(respond(400, { success: false, error: 'The handover code does not match.' }));
    await expect(rider.completeJob('job-1', '9999')).rejects.toMatchObject({ message: 'The handover code does not match.' });
    global.fetch.mockResolvedValueOnce(respond(200, { success: true, data: { earnings: 40 } }));
    await expect(rider.completeJob('job-1', ' 4821 ')).resolves.toMatchObject({ data: { earnings: 40 } });
    expect(calls()[1]).toEqual({ method: 'POST', path: '/delivery/jobs/job-1/complete', body: { otp: '4821' } });
  });
});

describe('R4 live location', () => {
  test('[R4.20] positions go to POST /delivery/location for the open order, no more than once per interval', async () => {
    global.fetch.mockResolvedValue(respond(200, { success: true }));
    let t = 1_000_000;
    const stop = await rider.startTracking('order-9', { now: () => t });
    expect(typeof stop).toBe('function');

    const opts = Location.__watchOptions;
    expect(opts.accuracy).toBe(Location.Accuracy.Balanced); // not High: battery
    expect(opts.distanceInterval).toBeGreaterThanOrEqual(20);

    const fix = (lat, lng, mocked = false) => Location.__watchCallback({ coords: { latitude: lat, longitude: lng }, mocked });
    fix(18.581, 73.889);
    t += 2000; fix(18.582, 73.889); // too soon: dropped
    t += rider.TRACK_MIN_INTERVAL_MS; fix(18.583, 73.889);
    // The upload awaits the stored token before fetch is called.
    await new Promise((r) => setImmediate(r));

    expect(calls()).toEqual([
      { method: 'POST', path: '/delivery/location', body: { latitude: 18.581, longitude: 73.889, orderId: 'order-9' } },
      { method: 'POST', path: '/delivery/location', body: { latitude: 18.583, longitude: 73.889, orderId: 'order-9' } },
    ]);
    expect(served('POST', '/delivery/location')).toBe(true);
  });

  test('[R4.21] a mocked (spoofed) fix is never sent to the customer', async () => {
    global.fetch.mockResolvedValue(respond(200, { success: true }));
    await rider.startTracking('order-9', { now: () => 5_000_000 });
    Location.__watchCallback({ coords: { latitude: 19.07, longitude: 72.87 }, mocked: true });
    await new Promise((r) => setImmediate(r));
    expect(global.fetch).not.toHaveBeenCalled();
    // ...while a genuine fix through the same watcher is sent (the drop is the flag, not the watcher).
    Location.__watchCallback({ coords: { latitude: 18.58, longitude: 73.88 }, mocked: false });
    await new Promise((r) => setImmediate(r));
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('[R4.22] without location permission nothing is watched, and the screen says so', async () => {
    Location.__state.requestStatus = 'denied';
    await expect(rider.startTracking('order-9')).resolves.toBeNull();
    expect(Location.watchPositionAsync).not.toHaveBeenCalled();
    const screen = read('app/(tabs)/active.js');
    expect(screen).toMatch(/startTracking\(job\.id\)/);
    expect(screen).toMatch(/Location not shared/);
  });
});

describe('R5 COD cash', () => {
  test('[R5.20] the rider sees the cash they hold, the limit and the ledger from GET /delivery/cash', async () => {
    global.fetch.mockResolvedValueOnce(respond(200, { success: true, data: {
      cashInHand: '3500', limit: 3000, isBlocked: true,
      ledger: [{ id: 'l1', order_id: 'o1', entry_type: 'collected', amount: 3500 }],
    } }));
    await expect(rider.getCash()).resolves.toEqual({
      cashInHand: 3500, limit: 3000, isBlocked: true,
      ledger: [{ id: 'l1', order_id: 'o1', entry_type: 'collected', amount: 3500 }],
    });
    expect(served('GET', '/delivery/cash')).toBe(true);
    expect(read('app/(tabs)/earnings.js')).toMatch(/<RiderCashCard/);
  });

  test('[R5.21] settling from the wallet posts the amount; nonsense amounts are not sent', async () => {
    await expect(rider.settleCash('abc')).rejects.toThrow(/greater than zero/);
    await expect(rider.settleCash(0)).rejects.toThrow(/greater than zero/);
    expect(global.fetch).not.toHaveBeenCalled();

    global.fetch.mockResolvedValueOnce(respond(409, { success: false, error: 'That is more than the cash you are holding.' }));
    await expect(rider.settleCash('5000')).rejects.toMatchObject({ status: 409 });
    expect(calls()[0]).toEqual({ method: 'POST', path: '/delivery/cash/settle', body: { amount: 5000 } });
    expect(served('POST', '/delivery/cash/settle')).toBe(true);
  });

  test('[R5.22] ledger labels are the entry types the server writes', () => {
    const card = read('src/components/RiderCashCard.js');
    const labels = [...card.match(/const LABEL = \{([^}]*)\}/)[1].matchAll(/(\w+):/g)].map((m) => m[1]);
    const written = new Set();
    // Every backend source file, so a new writer of the ledger is not missed.
    const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (
      e.isDirectory() ? (e.name === '__tests__' || e.name === 'node_modules' ? [] : walk(path.join(dir, e.name)))
        : e.name.endsWith('.js') ? [path.join(dir, e.name)] : []));
    for (const f of walk(path.join(ROOT, '..', '..', 'backend', 'src'))) {
      const src = fs.readFileSync(f, 'utf8');
      if (!src.includes('rider_cash_ledger')) continue;
      for (const m of src.matchAll(/INSERT INTO rider_cash_ledger[\s\S]{0,300}?VALUES\s*\([^)]*'(\w+)'/g)) written.add(m[1]);
    }
    expect([...written].sort()).toEqual([...labels].sort());
  });
});

describe('P9 rate limiting in the app', () => {
  test('[P9.20] a 429 carries the server\'s message and the wait, and is not retried', async () => {
    const api = require('../src/lib/api');
    global.fetch.mockResolvedValueOnce(respond(429, { error: 'Too many auth attempts. Please try again in 15 minutes.' }, { 'retry-after': '840' }));
    const err = await api.apiPost('/auth/send-otp', { email: 'a@b.c' }).catch((e) => e);
    expect(err).toMatchObject({ status: 429, retryAfter: 840 });
    expect(err.message).toBe('Too many auth attempts. Please try again in 15 minutes. (try again in 14 minutes)');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('[P9.21] Retry-After is read as seconds or as an HTTP date', () => {
    const { parseRetryAfter, formatWait } = require('../src/lib/api');
    expect(parseRetryAfter('30')).toBe(30);
    expect(parseRetryAfter(new Date(1_000_000 + 90_000).toUTCString(), 1_000_000)).toBe(90);
    expect(parseRetryAfter('soon')).toBeNull();
    expect(parseRetryAfter(null)).toBeNull();
    expect(formatWait(1)).toBe('1 second');
    expect(formatWait(61)).toBe('2 minutes');
  });
});
