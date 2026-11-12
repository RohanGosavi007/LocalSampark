// @ts-check
/**
 * C1 on the website: signing up and in with an emailed code (Decision D3),
 * signing out of this browser only, and signing out of every device.
 */
const { test, expect } = require('@playwright/test');
const { API } = require('../helpers/session');

const uniqueEmail = (tag) => `c1-${tag}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;

async function emailSession(request, email, fullName) {
  const sent = await request.post(`${API}/auth/email/send-otp`, { data: { email } });
  expect(sent.ok(), `send ${sent.status()} ${await sent.text()}`).toBeTruthy();
  const { otp } = await sent.json();
  const verified = await request.post(`${API}/auth/email/verify-otp`, { data: { email, otp, fullName } });
  expect(verified.ok(), `verify ${verified.status()} ${await verified.text()}`).toBeTruthy();
  return verified.json();
}

const me = (request, token) => request.get(`${API}/users/me`, { headers: { Authorization: `Bearer ${token}` } });

/** Puts a session into this browser once (not on every navigation). */
async function useSession(page, session) {
  await page.goto('/about');
  await page.evaluate((s) => {
    localStorage.setItem('auth_token', s.accessToken);
    localStorage.setItem('auth_refresh_token', s.refreshToken);
    localStorage.setItem('auth_user', JSON.stringify(s.user));
    localStorage.setItem('localsampark_tour_seen', 'true');
    localStorage.setItem('localsampark_consent', 'accepted');
  }, session);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try { localStorage.setItem('localsampark_consent', 'accepted'); localStorage.setItem('localsampark_tour_seen', 'true'); } catch { /* storage blocked */ }
  });
});

test('[C1.19] a new customer signs up with a code emailed to them; the email code is the default way in', async ({ page }) => {
  const email = uniqueEmail('signup');
  await page.goto('/login');
  await expect(page.getByRole('button', { name: 'Email code' })).toHaveAttribute('aria-pressed', 'true');

  await page.locator('#otp-email').fill(email);
  const [sent] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/auth/email/send-otp') && r.request().method() === 'POST'),
    page.getByRole('button', { name: 'Email me a code' }).click(),
  ]);
  const code = (await sent.json()).otp;
  expect(code, 'the E2E backend returns the code it issued').toBeTruthy();

  await page.locator('#email-code').fill(String(code));
  await page.getByRole('button', { name: 'Sign in' }).click();
  // A new address: the page asks for a name before making the account.
  await expect(page.locator('#full-name')).toBeVisible();
  await page.locator('#full-name').fill('Meera Email');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'));

  const token = await page.evaluate(() => localStorage.getItem('auth_token'));
  const res = await me(page.request, token);
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(JSON.stringify(body)).toContain(email);
});

test('[C1.20] signing out from the account menu ends this browser’s session only', async ({ page, request }) => {
  const email = uniqueEmail('single');
  const here = await emailSession(request, email, 'Single Signout');
  const phone = await emailSession(request, email);
  await useSession(page, here);
  await page.goto('/about');

  await page.getByRole('button', { name: 'Account menu' }).click();
  await Promise.all([
    page.waitForResponse((r) => r.url().includes('/auth/logout') && r.status() === 200),
    page.getByRole('button', { name: 'Sign Out' }).click(),
  ]);
  await expect.poll(async () => page.evaluate(() => localStorage.getItem('auth_token'))).toBeNull();

  expect((await me(request, here.accessToken)).status()).toBe(401);
  expect((await me(request, phone.accessToken)).status()).toBe(200);
});

test('[C1.21] "Sign out of all devices" ends every session of the account', async ({ page, request }) => {
  const email = uniqueEmail('all');
  const here = await emailSession(request, email, 'All Devices');
  const phone = await emailSession(request, email);
  await useSession(page, here);
  await page.goto('/profile/security');

  await page.getByRole('button', { name: 'Sign out of all devices' }).click();
  await page.waitForURL(/\/login/);

  expect((await me(request, here.accessToken)).status()).toBe(401);
  expect((await me(request, phone.accessToken)).status()).toBe(401);
  const refreshed = await request.post(`${API}/auth/refresh-token`, { data: { refreshToken: phone.refreshToken } });
  expect(refreshed.status()).toBe(401);
});
