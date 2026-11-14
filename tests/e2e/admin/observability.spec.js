// @ts-check
/**
 * P8 Observability on the admin console: an error in the console is reported to
 * Sentry (it had no error reporting at all), without credentials or personal
 * data. The admin console handles KYC documents, payouts and customers' phone
 * numbers, so what leaves the browser matters more here than anywhere.
 *
 * The E2E admin build has Sentry on with a DSN that goes nowhere
 * (playwright.config.js); requests to it are intercepted.
 */
const { test, expect } = require('@playwright/test');

const SECRET_TEXT = 'P8 admin failure password=hunter2 token=abc123def456 for +919876543210 a.b@example.com';

test('[P8.7] an uncaught error in the admin console is reported with the release, and without credentials or personal data', async ({ page }) => {
  const bodies = [];
  await page.route(/\/api\/1\/envelope\//, async (route) => {
    bodies.push(route.request().postData() || '');
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{}' });
  });

  await page.goto('/login');
  await page.waitForLoadState('load');

  const sent = page.waitForRequest((req) => /\/api\/1\/envelope\//.test(req.url()) && req.method() === 'POST' && /exception/.test(req.postData() || ''), { timeout: 20000 });
  await page.evaluate((text) => { setTimeout(() => { throw new Error(text); }, 0); }, SECRET_TEXT);
  await sent;
  await expect.poll(() => bodies.some((b) => /exception/.test(b)), { timeout: 10000 }).toBe(true);

  const body = bodies.filter((b) => /exception/.test(b)).join('\n');
  expect(body).toContain('P8 admin failure');
  expect(body).toContain('e2e-release');
  for (const secret of ['hunter2', 'abc123def456', '9876543210', 'a.b@example.com']) expect(body).not.toContain(secret);
  expect(body).toContain('[REDACTED]');
  expect(body).not.toMatch(/"authorization"|"cookie"/i);
});

test('[P8.7] the console may talk to Sentry: its Content-Security-Policy allows the ingest hosts and nothing broader', async ({ page }) => {
  const response = await page.goto('/login');
  const csp = response.headers()['content-security-policy'] || '';
  const connect = (csp.split(';').map((d) => d.trim()).find((d) => d.startsWith('connect-src')) || '');
  expect(connect).toContain('https://*.ingest.sentry.io');
  expect(connect).not.toMatch(/\s\*(\s|$)/); // never a bare wildcard
  expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
});
