// @ts-check
/**
 * A12 / P6 on the web: an admin's kill switch reaches the navigation and the
 * page itself.
 *
 * The console switches a module on or off (PUT /admin/commerce/feature-flags);
 * the API already answered 403 FEATURE_DISABLED for a module that is off, but
 * the website decided from build-time environment alone, so a switched-off
 * module was still linked from the header and a shared URL still served it.
 * The header and the route gate now follow the live registry
 * (GET /api/v1/features), cached for a few seconds.
 */
const { test, expect } = require('@playwright/test');
const { API, apiSession } = require('../helpers/session');

const SUPER_ADMIN = '+919999999991';
const FLAG = 'carpool'; // off at launch

test.describe.configure({ mode: 'serial' });

let adminToken;

const flip = (request, on) => request.put(`${API}/admin/commerce/feature-flags`, {
  headers: { Authorization: `Bearer ${adminToken}` },
  data: { features: { [FLAG]: on } },
});

/** Links to /carpool anywhere on the page: the header's Services menu (wide screens) and the footer. */
async function carpoolLinkCount(page) {
  await page.goto('/');
  await page.getByRole('button', { name: /Services/ }).first().hover();
  await expect(page.getByRole('link', { name: /Home Chefs|Delivery|Marketplace/i }).first()).toBeVisible();
  return page.locator('a[href="/carpool"]').count();
}

test.beforeAll(async ({ playwright }) => {
  const request = await playwright.request.newContext();
  adminToken = (await apiSession(request, SUPER_ADMIN)).accessToken;
  await request.dispose();
});

test.afterAll(async ({ playwright }) => {
  // Whatever happened, leave the module off, as it is at launch.
  const request = await playwright.request.newContext();
  await flip(request, false);
  await request.dispose();
});

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.addInitScript(() => {
    try { localStorage.setItem('localsampark_consent', 'accepted'); localStorage.setItem('localsampark_tour_seen', 'true'); } catch { /* storage blocked */ }
  });
});

test('[A12.5] [P6.9] a module that is off has no link in the navigation, and its page is Coming Soon', async ({ page }) => {
  expect((await flip(page.request, false)).ok()).toBeTruthy();

  // The server-side gate keeps the answer a few seconds, so allow it to settle.
  await expect.poll(async () => (await page.request.get('/carpool')).text(), { timeout: 45000 }).toContain('Coming soon');

  expect(await carpoolLinkCount(page)).toBe(0);
  await page.goto('/carpool');
  await expect(page).toHaveURL(/\/carpool$/); // the shared URL still works once the module goes live
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByText('Coming soon', { exact: true })).toBeVisible();

  // The footer no longer lists modules that are off, and keeps the launch ones.
  await page.goto('/');
  const footer = page.locator('footer');
  await expect(footer.locator('a[href="/shops"]')).toHaveCount(1);
  await expect(footer.locator('a[href="/jobs"], a[href="/properties"], a[href="/events"]')).toHaveCount(0);

  // The launch module is untouched.
  await page.goto('/shops');
  await expect(page.getByText('Coming soon', { exact: true })).toHaveCount(0);
});

test('[A12.5] [P6.9] switching the module on in the console puts it in the navigation and opens its page; switching it off takes both away again', async ({ page }) => {
  expect((await flip(page.request, true)).ok()).toBeTruthy();
  expect((await (await page.request.get(`${API}/features`)).json()).features[FLAG].is_enabled).toBe(true);

  await expect.poll(async () => (await page.request.get('/carpool')).text(), { timeout: 45000 }).not.toContain('Coming soon');
  await expect.poll(async () => carpoolLinkCount(page), { timeout: 30000 }).toBeGreaterThan(0);

  // Back off: the link and the page go again, with no rebuild.
  expect((await flip(page.request, false)).ok()).toBeTruthy();
  await expect.poll(async () => (await page.request.get('/carpool')).text(), { timeout: 45000 }).toContain('Coming soon');
  await expect.poll(async () => carpoolLinkCount(page), { timeout: 30000 }).toBe(0);
});
