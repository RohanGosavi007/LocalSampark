// @ts-check
/**
 * P8 Observability on the web: an error in the browser is reported to Sentry,
 * without personal data, and the API's health endpoints answer.
 *
 * The E2E web build has Sentry switched on with a DSN that goes nowhere
 * (playwright.config.js). Requests to it are intercepted here, so the test sees
 * exactly what a real error would send: the release, and nothing secret.
 */
const { test, expect } = require('@playwright/test');

const SECRET_TEXT = 'P8 e2e failure password=hunter2 token=abc123def456 for +919876543210 a.b@example.com';

/** Every Sentry envelope the page sends, parsed into its events. */
function captureSentry(page) {
  /** @type {{ raw: string, headers: Record<string,string>, events: any[] }[]} */
  const envelopes = [];
  page.route(/\/api\/1\/envelope\//, async (route) => {
    const req = route.request();
    const raw = req.postData() || '';
    const events = raw.split('\n').filter(Boolean).map((line) => { try { return JSON.parse(line); } catch { return null; } })
      .filter((item) => item && (item.exception || item.message || item.event_id) && item.level !== undefined || (item && item.exception));
    envelopes.push({ raw, headers: req.headers(), events });
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{}' });
  });
  return envelopes;
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try { localStorage.setItem('localsampark_consent', 'accepted'); localStorage.setItem('localsampark_tour_seen', 'true'); } catch { /* storage blocked */ }
  });
});

test('[P8.6] an uncaught browser error is reported to Sentry with the release, and without credentials or personal data', async ({ page }) => {
  const envelopes = captureSentry(page);
  await page.goto('/');
  await page.waitForLoadState('load');

  const sent = page.waitForRequest((req) => /\/api\/1\/envelope\//.test(req.url()) && req.method() === 'POST' && /exception/.test(req.postData() || ''), { timeout: 20000 });
  await page.evaluate((text) => { setTimeout(() => { throw new Error(text); }, 0); }, SECRET_TEXT);
  await sent;
  await expect.poll(() => envelopes.some((e) => /exception/.test(e.raw)), { timeout: 10000 }).toBe(true);

  const body = envelopes.filter((e) => /exception/.test(e.raw)).map((e) => e.raw).join('\n');
  // It is our error, from this build.
  expect(body).toContain('P8 e2e failure');
  expect(body).toContain('e2e-release');
  // Nothing secret or personal in it.
  for (const secret of ['hunter2', 'abc123def456', '9876543210', 'a.b@example.com']) expect(body).not.toContain(secret);
  expect(body).toContain('[REDACTED]');
  expect(body).not.toMatch(/"authorization"|"cookie"/i);
});

test('[P8.6] the reporting does not disturb the page: no console errors on a normal visit', async ({ page }) => {
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));
  captureSentry(page);
  await page.goto('/');
  await page.waitForLoadState('load');
  await page.waitForTimeout(1500);
  expect(errors.filter((e) => !/Failed to load resource|net::ERR|favicon|\/api\//i.test(e))).toEqual([]);
});

test('[P8.8] the API answers /health (alive) and /ready (database reachable, migrations applied)', async ({ request }) => {
  const health = await request.get('http://localhost:5000/health');
  expect(health.status()).toBe(200);
  const healthBody = await health.json();
  expect(healthBody.status).toBe('ok');
  expect(healthBody.database).toBe('connected');
  expect(typeof healthBody.commit).toBe('string'); // the deploy check reads this

  const ready = await request.get('http://localhost:5000/ready');
  expect(ready.status()).toBe(200);
  const readyBody = await ready.json();
  expect(readyBody).toMatchObject({ status: 'ready', ready: true });
  expect(readyBody.checks).toMatchObject({ database: 'connected', schema: 'ready' });
  expect(['current', 'not_tracked']).toContain(readyBody.checks.migrations);
  // Neither endpoint gives away a secret or a connection string.
  expect(JSON.stringify([healthBody, readyBody])).not.toMatch(/postgres(ql)?:\/\/|password|secret|token/i);
});
