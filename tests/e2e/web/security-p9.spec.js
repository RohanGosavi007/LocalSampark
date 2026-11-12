// @ts-check
/**
 * P9 on the web: the page's Content-Security-Policy and security headers, and
 * what a customer sees when the server rate-limits them.
 *
 * The CSP test is also the check that the policy does not break the site:
 * every page here hydrates and runs its own scripts under it, and any script
 * or connection the policy refuses is reported as a console error.
 */
const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try { localStorage.setItem('localsampark_consent', 'accepted'); localStorage.setItem('localsampark_tour_seen', 'true'); } catch { /* storage blocked */ }
  });
});

/** Console messages the browser writes when the CSP refuses something. */
function cspViolations(page) {
  const seen = [];
  page.on('console', (m) => { if (/Content.Security.Policy|violates the following/i.test(m.text())) seen.push(m.text()); });
  page.on('pageerror', (e) => { if (/Content.Security.Policy/i.test(String(e))) seen.push(String(e)); });
  return seen;
}

test('[P9.40] pages carry a nonce-based CSP and the security headers, and run under them', async ({ page }) => {
  const violations = cspViolations(page);
  const res = await page.goto('/login');
  const h = res.headers();

  const csp = h['content-security-policy'];
  expect(csp, 'CSP header present').toBeTruthy();
  const scriptSrc = csp.split(';').map((d) => d.trim()).find((d) => d.startsWith('script-src'));
  expect(scriptSrc).toMatch(/'nonce-[A-Za-z0-9+/=]{16,}'/);
  expect(scriptSrc).toContain("'strict-dynamic'");
  expect(scriptSrc).not.toContain("'unsafe-inline'");
  expect(csp).toContain("object-src 'none'");
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).toMatch(/connect-src [^;]*http:\/\/localhost:5000/);

  expect(h['x-frame-options']).toBe('DENY');
  expect(h['x-content-type-options']).toBe('nosniff');
  expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(h['permissions-policy']).toContain('microphone=()');

  // A new nonce for every response: a nonce that repeats is no protection.
  const again = (await page.request.get('/login')).headers()['content-security-policy'];
  expect(again.match(/'nonce-([^']+)'/)[1]).not.toBe(csp.match(/'nonce-([^']+)'/)[1]);

  // The app hydrated under the policy: the code-login form responds, which
  // needs Next's scripts and the page's own to have run.
  await expect(page.getByRole('button', { name: 'Email code' })).toHaveAttribute('aria-pressed', 'true');
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect(violations, violations.join('\n')).toEqual([]);
});

test.describe('rate limiting', () => {
  // The site's service worker would otherwise fetch on the page's behalf,
  // and requests it makes are not seen by page.route().
  test.use({ serviceWorkers: 'block' });

test('[P9.41] a rate-limited sign-in shows the server\'s message and is not retried behind the customer\'s back', async ({ page }) => {
  let calls = 0;
  // The server's own 429 body and header (backend authLimiter), served for this
  // request only: the E2E backend's limits are raised so specs can run.
  await page.route('**/auth/email/send-otp', (route) => {
    calls += 1;
    return route.fulfill({
      status: 429,
      contentType: 'application/json',
      headers: { 'Retry-After': '900' },
      body: JSON.stringify({ error: 'Too many auth attempts. Please try again in 15 minutes.' }),
    });
  });

  await page.goto('/login');
  await page.locator('#otp-email').fill('p9-limit@example.com');
  await page.getByRole('button', { name: 'Email me a code' }).click();
  await expect(page.getByText('Too many auth attempts. Please try again in 15 minutes.')).toBeVisible();
  // Still on the email step: no code field, nothing pretended to be sent.
  await expect(page.locator('#email-code')).toHaveCount(0);
  await page.waitForTimeout(1500);
  expect(calls).toBe(1);
});
});
