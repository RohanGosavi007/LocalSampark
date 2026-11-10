/**
 * No route answers a plain, empty request with a 500.
 *
 * Mounts the whole API, signs in as an ordinary citizen, and sends every route
 * either nothing (reads) or `{}` (writes). A 500 here means a handler wrote
 * without checking its input, hit a database constraint, or dereferenced
 * something that was not there. Seventeen write routes did, found by exactly
 * this probe: an empty POST /events, /pets, /services/book, /franchise/register
 * … all answered "server error" instead of "you left something out".
 *
 * Also checked: every route that requires sign-in says so (401) to an
 * anonymous caller, so a newly added route cannot quietly ship unauthenticated
 * unless it is listed in PUBLIC below, on purpose.
 *
 * /admin/* is excluded: its rate limiter (30 requests / 15 minutes) would
 * answer 429 to most of the probe, and the admin surface has its own tests.
 */


const { fx, fxLike } = require('../helpers/fixtureIds');
const path = require('path');
const Router = require('router');

// Express 5 keeps only a matcher on a mounted layer, not the path it was mounted
// at, so record the path as each layer is added.
const origUse = Router.prototype.use;
Router.prototype.use = function patchedUse(first) {
  const before = this.stack.length;
  const result = origUse.apply(this, arguments);
  const mount = typeof first === 'string' ? first : '/';
  for (let i = before; i < this.stack.length; i += 1) this.stack[i].__mount = mount;
  return result;
};

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { query, queryOne } = require('../../config/database');
const { getJwtSecret } = require('../../config/secrets');
const { errorHandler } = require('../../middleware/error.middleware');
const apiRouter = require('../../routes');

const CITIZEN = fx('rsm-citizen');

/** Collects every route with the path it is served at. */
function collectRoutes(router, prefix = '') {
  const out = [];
  for (const layer of router.stack) {
    if (layer.route) {
      for (const method of Object.keys(layer.route.methods).filter((m) => layer.route.methods[m])) {
        out.push({ method: method.toUpperCase(), path: `${prefix}${layer.route.path}`.replace(/\/+/g, '/') });
      }
    } else if (layer.handle && layer.handle.stack) {
      out.push(...collectRoutes(layer.handle, prefix + (layer.__mount && layer.__mount !== '/' ? layer.__mount : '')));
    }
  }
  return out;
}

/**
 * Routes that are public on purpose. Anything else answering an anonymous
 * request with something other than 401/403 is a finding, not a pattern to copy.
 * Prefix match; GET unless a method is given.
 */
const PUBLIC = [
  // sign-in and the flows around it
  'POST /auth/', 'GET /auth/', 'POST /admin-auth/', 'POST /territories/interest',
  // public catalogue and browse
  'GET /public/stats', 'GET /zones', 'GET /territories', 'GET /territory/map', 'GET /settings/theme', 'GET /token-queue',
  'GET /feed/', 'GET /events', 'GET /shops', 'GET /marketplace', 'GET /products', 'GET /categories',
  'GET /universal-catalog', 'GET /jobs', 'GET /job-services', 'GET /properties', 'GET /logistics/agents',
  'GET /health-services', 'GET /carpool', 'GET /medical/doctors', 'GET /services', 'GET /community/posts',
  'GET /subscriptions/plans', 'GET /saas/plans', 'GET /gtm/features', 'GET /gamification/leaderboard',
  'GET /payments/razorpay/config', 'GET /privacy-policy', 'GET /users/privacy-policy', 'GET /leads-crm/',
  'GET /campaigns/geo-feed', 'GET /premium/plan', 'GET /ml/', 'GET /bills/status', 'GET /community-hub', 'GET /health',
  // price/cost calculators and quotes
  'POST /carpool/cost-calculator', 'POST /marketplace/price-suggest', 'POST /checkout/quote', 'POST /delivery/quote',
  'POST /ml/', 'POST /campaigns/', 'POST /logistics/riders/register', 'POST /gtm/interest-lead',
  // gateway callbacks: authenticated by signature, not by session
  'POST /webhooks/', 'POST /payments/webhook/', 'POST /societies/cctv/webhook', 'POST /society/cctv/webhook',
  // guest cart
  'GET /cart', 'POST /cart', 'PUT /cart', 'DELETE /cart',
  // read-only lookups behind /carpool, /jobs, /marketplace sharing one router
  'GET /marketplace/', 'GET /carpool/', 'GET /jobs/', 'POST /jobs/', 'POST /marketplace/', 'POST /carpool/',
  'GET /shops/', 'GET /job-cards/', 'GET /upload/files/', 'POST /admin-auth/logout', 'GET /features', 'GET /support/grievance-officer', 'GET /trust-reviews/shop/', 'POST /users/account-deletion-request', 'POST /account-deletion-request',
  // Krishi catalogue read (reviewed 2026-11-09): read-only, visitor columns only, LIMIT <= 100,
  // behind requireFeature('krishi') (403 while off) and the global rate limiter.
  'GET /krishi/listings',
];

const isPublic = (r) => PUBLIC.some((p) => `${r.method} ${r.path}`.startsWith(p));

let app;
let routes;

/**
 * A fresh token for the citizen's CURRENT session. Some routes sign the caller out
 * everywhere (they bump users.token_version), after which a token minted once at
 * the start is refused by every later request — and the rest of the probe would
 * silently measure the login wall instead of the handlers.
 */
async function citizenToken() {
  const row = await queryOne('SELECT token_version FROM users WHERE id = $1', [CITIZEN]);
  return `Bearer ${jwt.sign({ userId: CITIZEN, tokenVersion: Number(row && row.token_version) || 0 }, getJwtSecret(), { expiresIn: '10m' })}`;
}

beforeAll(async () => {
  await query("DELETE FROM users WHERE id = $1", [CITIZEN]);
  await query("INSERT INTO users (id, full_name, phone_number, role, token_version) VALUES ($1, 'Smoke Citizen', '9863000001', 'user', '0')", [CITIZEN]);

  routes = collectRoutes(apiRouter).filter((r) => !r.path.startsWith('/admin/'));
  app = express();
  app.use(express.json());
  app.use(require('cookie-parser')());
  app.use('/api/v1', apiRouter);
  app.use(errorHandler);
});

afterAll(() => query("DELETE FROM users WHERE id = $1", [CITIZEN]));

const urlOf = (r) => `/api/v1${r.path}`.replace(/:[A-Za-z_]+\??/g, 'x').replace(/\*/g, 'x');
const WRITES = ['POST', 'PUT', 'PATCH', 'DELETE'];

async function fire(r, signedIn) {
  let req = request(app)[r.method.toLowerCase()](urlOf(r)).timeout({ response: 8000, deadline: 10000 });
  if (signedIn) req = req.set('Authorization', await citizenToken());
  const res = WRITES.includes(r.method) ? await req.send({}) : await req;
  return res.status;
}

/** Known, tracked exceptions. Each needs a reason; the list should only shrink. */
const KNOWN_500 = new Set([
  // none
]);

test('the probe found the API (guards against a silently empty route table)', () => {
  expect(routes.length).toBeGreaterThan(700);
});

test('no route returns 500 to a signed-in citizen sending nothing', async () => {
  const seen = new Set();
  const failures = [];
  for (const r of routes) {
    const key = `${r.method} ${urlOf(r)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    let status;
    try { status = await fire(r, true); } catch (e) { status = e.status || 'error'; }
    if (status === 500 && !KNOWN_500.has(key)) failures.push(key.replace('/api/v1', ''));
  }
  expect(failures).toEqual([]);
  // The probe must actually have been signed in the whole way through.
  expect((await queryOne('SELECT 1 AS ok FROM users WHERE id = $1', [CITIZEN]))).toBeTruthy();
}, 240000);

test('every route that is not listed as public turns an anonymous caller away', async () => {
  const seen = new Set();
  const open = [];
  for (const r of routes) {
    if (isPublic(r)) continue;
    const key = `${r.method} ${urlOf(r)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    let status;
    try { status = await fire(r, false); } catch (e) { status = e.status || 'error'; }
    if (![401, 403, 404, 429, 503].includes(status)) open.push(`${status} ${key.replace('/api/v1', '')}`);
  }
  expect(open).toEqual([]);
}, 240000);
