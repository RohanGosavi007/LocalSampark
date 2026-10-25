/**
 * A scheduled job runs once across instances, not once per instance.
 *
 * node-cron and the polling workers run inside every web instance, so scaling to
 * two ran everything twice — including the job that creates each subscription's
 * delivery order. They now take a short-lived row in job_locks first.
 */

process.env.USE_SQLITE = 'true';

const { query, queryOne } = require('../config/database');
const { acquireLock, locked } = require('../utils/jobLock');

const NAME = 'test:lock';
beforeEach(() => query("DELETE FROM job_locks WHERE name LIKE 'test:%'"));
afterAll(() => query("DELETE FROM job_locks WHERE name LIKE 'test:%'"));

test('the first instance takes the lock; a second, arriving together, does not', async () => {
  expect(await acquireLock(NAME, 60000)).toBe(true);
  expect(await acquireLock(NAME, 60000)).toBe(false);
});

test('two simultaneous attempts have exactly one winner', async () => {
  const results = await Promise.all(Array.from({ length: 8 }, () => acquireLock(NAME, 60000)));
  expect(results.filter(Boolean)).toHaveLength(1);
});

test('an expired lock can be taken again', async () => {
  await acquireLock(NAME, 60000);
  await query("UPDATE job_locks SET locked_until = '2000-01-01 00:00:00' WHERE name = $1", [NAME]);
  expect(await acquireLock(NAME, 60000)).toBe(true);
  expect((await queryOne('SELECT locked_until FROM job_locks WHERE name = $1', [NAME])).locked_until > '2020').toBe(true);
});

test('different jobs do not block each other', async () => {
  expect(await acquireLock('test:a', 60000)).toBe(true);
  expect(await acquireLock('test:b', 60000)).toBe(true);
});

test('a wrapped job body runs once however many times it is fired', async () => {
  const body = jest.fn(async () => 'ran');
  const job = locked('test:wrapped', 60000, body);
  await Promise.all([job(), job(), job()]);
  expect(body).toHaveBeenCalledTimes(1);
});

test('JOB_LOCKS=off runs every time (for a single-instance deploy that wants no extra table traffic)', async () => {
  process.env.JOB_LOCKS = 'off';
  try {
    const body = jest.fn(async () => {});
    const job = locked('test:off', 60000, body);
    await job(); await job();
    expect(body).toHaveBeenCalledTimes(2);
  } finally { delete process.env.JOB_LOCKS; }
});

test('the cron wrapper schedules a locked callback and exposes the rest of node-cron', () => {
  const cron = require('../utils/cron');
  expect(typeof cron.validate).toBe('function');
  const task = cron.schedule('0 0 1 1 *', () => {});
  expect(task).toBeTruthy();
  task.stop();
});
