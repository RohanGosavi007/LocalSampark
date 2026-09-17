/**
 * The gate queue.
 *
 * A guard's post is a concrete box at the edge of a compound, usually in a
 * basement or against a boundary wall — which is where mobile signal is worst.
 * The console had no allowance for that: every entry was a live POST, so a
 * visitor arriving during a signal drop either could not be logged at all or
 * was logged later with the wrong time.
 *
 * Three properties matter, and each of them fails silently when it fails:
 *
 *  1. **An entry survives having no signal.** Losing one is losing the record
 *     that somebody entered the compound.
 *  2. **It carries the time it happened**, not the time it uploaded. Otherwise
 *     a reconnection stamps an hour of backlogged arrivals with one instant and
 *     the register cannot answer the only question anyone asks of it.
 *  3. **A retry does not create a second visitor.** A duplicate is worse than
 *     it looks: the check-out matches one row and leaves the other open, so the
 *     register shows someone who never left.
 */

process.env.EXPO_PUBLIC_API_URL = 'http://test.local/api';

const QUEUE_KEY = '@localsampark_gate_queue';

let AsyncStorage;
let NetInfo;
let gateQueue;

const flush = () => new Promise((resolve) => setImmediate(resolve));

function jsonResponse(body, status = 200) {
  return {
    ok: status < 400,
    status,
    headers: { get: (n) => (String(n).toLowerCase() === 'content-type' ? 'application/json' : null) },
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

const visitor = (overrides = {}) => ({
  name: 'Ramesh Kumar',
  flat: 'A-101',
  phone: '9822001122',
  purpose: 'guest',
  ...overrides,
});

beforeEach(() => {
  jest.resetModules();
  global.fetch = jest.fn().mockResolvedValue(jsonResponse({ success: true }));

  AsyncStorage = require('./__mocks__/asyncStorage');
  NetInfo = require('./__mocks__/netinfo');
  AsyncStorage.__store.clear();
  NetInfo.__setOnline(true);

  gateQueue = require('../src/services/gateQueue');
});

describe('recording an entry', () => {
  test('returns immediately with a local entry', async () => {
    // The guard has a person standing in front of them; they are not kept
    // waiting on a round trip.
    const result = await gateQueue.recordEntry(visitor());

    expect(result.queued).toBe(true);
    expect(result.entry.name).toBe('Ramesh Kumar');
    expect(result.entry.clientId).toBeTruthy();
    expect(result.entry.recordedAt).toBeTruthy();
  });

  test('refuses an entry the server would reject anyway', async () => {
    // Caught at the gate rather than at the end of a shift when the backlog is
    // rejected and the guard can no longer remember who it was.
    expect((await gateQueue.recordEntry(visitor({ name: '' }))).queued).toBe(false);
    expect((await gateQueue.recordEntry(visitor({ flat: '   ' }))).queued).toBe(false);
  });

  test('each entry gets its own id', async () => {
    const a = await gateQueue.recordEntry(visitor());
    const b = await gateQueue.recordEntry(visitor({ name: 'Second Visitor' }));
    expect(a.entry.clientId).not.toBe(b.entry.clientId);
  });
});

describe('with no signal', () => {
  beforeEach(() => NetInfo.__setOnline(false));

  test('the entry is kept, not lost', async () => {
    await gateQueue.recordEntry(visitor());
    await flush();

    expect(global.fetch).not.toHaveBeenCalled();
    expect(await gateQueue.pendingCount()).toBe(1);
  });

  test('a whole shift can be logged offline', async () => {
    for (let i = 0; i < 40; i++) {
      await gateQueue.recordEntry(visitor({ name: `Visitor ${i}` }));
    }
    expect(await gateQueue.pendingCount()).toBe(40);
  });

  test('the backlog is bounded', async () => {
    // A device with no signal for a week must not become a storage problem.
    for (let i = 0; i < gateQueue.MAX_QUEUED + 25; i++) {
      await gateQueue.recordEntry(visitor({ name: `Visitor ${i}` }));
    }
    expect(await gateQueue.pendingCount()).toBeLessThanOrEqual(gateQueue.MAX_QUEUED);

    // Oldest dropped, newest kept: a day-old arrival is spent, the last one is not.
    const queue = await gateQueue.pending();
    expect(queue[queue.length - 1].name).toBe(`Visitor ${gateQueue.MAX_QUEUED + 24}`);
  });
});

describe('draining on reconnect', () => {
  test('sends everything, oldest first', async () => {
    NetInfo.__setOnline(false);
    for (const name of ['First', 'Second', 'Third']) {
      await gateQueue.recordEntry(visitor({ name }));
    }
    // recordEntry starts a background sync it does not await. Let those settle
    // while still offline, so the drain under test is the one below.
    await flush();

    NetInfo.__setOnline(true);
    const result = await gateQueue.sync();

    expect(result.sent).toBe(3);
    expect(result.remaining).toBe(0);

    const names = global.fetch.mock.calls.map((c) => JSON.parse(c[1].body).name);
    expect(names).toEqual(['First', 'Second', 'Third']);
  });

  test('each upload carries the time the visitor arrived', async () => {
    NetInfo.__setOnline(false);
    const arrivedAt = new Date(Date.now() - 90 * 60 * 1000).toISOString();
    await gateQueue.recordEntry(visitor({ recordedAt: arrivedAt }));
    await flush();

    NetInfo.__setOnline(true);
    await gateQueue.sync();

    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    // Without this, a reconnection stamps an hour of arrivals with one instant.
    expect(body.recordedAt).toBe(arrivedAt);
  });

  test('every upload carries its client id, so a replay is recognisable', async () => {
    NetInfo.__setOnline(false);
    const { entry } = await gateQueue.recordEntry(visitor());
    await flush();

    NetInfo.__setOnline(true);
    await gateQueue.sync();

    expect(JSON.parse(global.fetch.mock.calls[0][1].body).clientId).toBe(entry.clientId);
  });

  test('a network failure stops the drain and keeps the rest', async () => {
    NetInfo.__setOnline(false);
    for (const name of ['First', 'Second', 'Third']) {
      await gateQueue.recordEntry(visitor({ name }));
    }
    // recordEntry starts a background sync it does not await. Let those settle
    // while still offline, so the drain under test is the one below.
    await flush();

    NetInfo.__setOnline(true);
    global.fetch
      .mockResolvedValueOnce(jsonResponse({ success: true }))
      .mockRejectedValue(Object.assign(new Error('connection lost'), { status: 503 }));

    const result = await gateQueue.sync();

    expect(result.sent).toBe(1);
    // Draining a shift's backlog against a dead link would turn one failure
    // into five hundred.
    expect(result.remaining).toBe(2);
  });

  test('an entry the server refuses is dropped rather than wedging the queue', async () => {
    NetInfo.__setOnline(false);
    for (const name of ['Bad', 'Good']) {
      await gateQueue.recordEntry(visitor({ name }));
    }
    await flush();

    NetInfo.__setOnline(true);
    // A server refusal is a *resolved* fetch carrying a 4xx, not a rejected
    // one. A rejected fetch is a dead link, which api.js reports as a 503 —
    // mocking the rejection here would have tested the retry path instead.
    global.fetch
      .mockResolvedValueOnce(jsonResponse({ error: 'Flat does not exist' }, 400))
      .mockResolvedValue(jsonResponse({ success: true }));

    const result = await gateQueue.sync();

    // A 400 will be a 400 next time too. Keeping it would block everything
    // behind it forever.
    expect(result.rejected).toBe(1);
    expect(result.sent).toBe(1);
    expect(result.remaining).toBe(0);
    expect(result.rejectedEntries[0].name).toBe('Bad');
  });

  test('a rate-limit or timeout is retried, not discarded', async () => {
    NetInfo.__setOnline(false);
    await gateQueue.recordEntry(visitor());
    await flush();

    NetInfo.__setOnline(true);
    global.fetch.mockRejectedValue(Object.assign(new Error('Too many requests'), { status: 429 }));

    const result = await gateQueue.sync();

    // 429 and 408 say "later", not "never".
    expect(result.rejected).toBe(0);
    expect(result.remaining).toBe(1);
  });

  test('syncing an empty queue is a no-op', async () => {
    const result = await gateQueue.sync();
    expect(result).toEqual({ sent: 0, rejected: 0, remaining: 0 });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('a corrupt queue does not stop the gate working', async () => {
    await AsyncStorage.setItem(QUEUE_KEY, 'not json');
    await expect(gateQueue.recordEntry(visitor())).resolves.toMatchObject({ queued: true });
  });
});
