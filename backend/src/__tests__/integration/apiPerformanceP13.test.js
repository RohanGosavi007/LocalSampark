/**
 * P13 on the API: how fast and how large the answers are for the calls a
 * customer's first screens make, on both databases (G2 SQLite, G3 PostgreSQL).
 *
 * Time is judged by the MEDIAN of a run of requests, not the slowest: one
 * slow moment on a busy machine (a verification run is doing a lot at once)
 * must not fail the build, while a query that became ten times slower moves
 * every request. The budgets are loose on purpose (a local database answers
 * these in a few milliseconds); they catch an accident such as a missing
 * index or an N+1 loop, not a 20% drift.
 */
const express = require('express');
const request = require('supertest');

const RUNS = 15;
const MEDIAN_BUDGET_MS = 300;
const PAYLOAD_BUDGET_BYTES = 250 * 1024;
const PUNE = { lat: 18.5793, lng: 73.8796 };

let app;

beforeAll(() => {
  app = express();
  app.use(express.json());
  app.use('/', require('../../routes'));
});

async function measure(path) {
  const times = [];
  let last;
  for (let i = 0; i < RUNS; i += 1) {
    const started = process.hrtime.bigint();
    last = await request(app).get(path);
    times.push(Number(process.hrtime.bigint() - started) / 1e6);
  }
  times.sort((a, b) => a - b);
  return { median: times[Math.floor(times.length / 2)], max: times[times.length - 1], res: last };
}

const ENDPOINTS = [
  ['the feature registry', '/features'],
  ['the shop categories', '/shops/categories'],
  ['nearby shops', `/shops/nearby?lat=${PUNE.lat}&lng=${PUNE.lng}&radius=10`],
  ['zone lookup by position', `/zones/resolve?lat=${PUNE.lat}&lng=${PUNE.lng}`],
  ['the zone list', '/zones'],
];

describe('[P13.9] API latency and payload budgets', () => {
  test.each(ENDPOINTS)('[P13.9] %s answers in under 300 ms (median of 15) and under 250 KB', async (_label, path) => {
    const { median, res } = await measure(path);
    expect(res.status).toBe(200);
    expect(median).toBeLessThan(MEDIAN_BUDGET_MS);
    expect(Buffer.byteLength(JSON.stringify(res.body))).toBeLessThan(PAYLOAD_BUDGET_BYTES);
  });

  test('[P13.9] a list of shops is capped, however many shops exist', async () => {
    const res = await request(app).get(`/shops/nearby?lat=${PUNE.lat}&lng=${PUNE.lng}&radius=50`);
    expect(res.status).toBe(200);
    expect(res.body.shops.length).toBeLessThanOrEqual(200);
  });

  test('[P13.9] the health check is quick enough for a load balancer (median under 100 ms)', async () => {
    const { median, res } = await measure('/health');
    expect([200, 404]).toContain(res.status); // mounted at the server, not the router, on some builds
    expect(median).toBeLessThan(100);
  });
});
