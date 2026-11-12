// @ts-check
/**
 * P9 in the admin console: its nonce-based CSP and headers, and a rate-limited
 * sign-in. The console had headers but, deliberately, no CSP until it could be
 * done with a per-request nonce (src/middleware.js).
 */
const { test, expect } = require('@playwright/test');

test.use({ baseURL: 'http://localhost:3001' });

function cspViolations(page) {
  const seen = [];
  page.on('console', (m) => { if (/Content.Security.Policy|violates the following/i.test(m.text())) seen.push(m.text()); });
  return seen;
}

test('[P9.30] the console is served with a nonce-based CSP and runs under it', async ({ page }) => {
  const violations = cspViolations(page);
  const res = await page.goto('/login');
  const h = res.headers();
  const csp = h['content-security-policy'];
  expect(csp, 'CSP header present').toBeTruthy();
  const scriptSrc = csp.split(';').map((d) => d.trim()).find((d) => d.startsWith('script-src'));
  expect(scriptSrc).toMatch(/'nonce-[A-Za-z0-9+/=]{16,}'/);
  expect(scriptSrc).not.toContain("'unsafe-inline'");
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).toMatch(/connect-src [^;]*http:\/\/localhost:5000/);
  expect(h['x-frame-options']).toBe('DENY');
  expect(h['x-content-type-options']).toBe('nosniff');

  // Hydrated: the phone step accepts input and moves on to the code step.
  await page.getByPlaceholder('e.g. +91 99999 99999').fill('+919999999991');
  await page.locator('form button[type="submit"]').first().click();
  await expect(page.getByPlaceholder('XXXXXX')).toBeVisible({ timeout: 30000 });
  expect(violations, violations.join('\n')).toEqual([]);
});

test('[P9.31] a rate-limited admin sign-in shows the server\'s message and stays on the phone step', async ({ page }) => {
  let calls = 0;
  await page.route('**/auth/send-otp', (route) => {
    calls += 1;
    return route.fulfill({
      status: 429,
      contentType: 'application/json',
      headers: { 'Retry-After': '900' },
      body: JSON.stringify({ error: 'Too many auth attempts. Please try again in 15 minutes.' }),
    });
  });
  await page.goto('/login');
  await page.getByPlaceholder('e.g. +91 99999 99999').fill('+919999999991');
  await page.locator('form button[type="submit"]').first().click();
  await expect(page.getByText(/Too many auth attempts\. Please try again in 15 minutes\./)).toBeVisible();
  await expect(page.getByPlaceholder('XXXXXX')).toHaveCount(0);
  expect(calls).toBe(1);
});
