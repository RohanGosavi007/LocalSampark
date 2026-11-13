// @ts-check
/**
 * C2 and C3 on the web, against the E2E backend.
 *
 * C2: "Use my current location" in the header checks the visitor's position
 *     against the pilot zone's verified boundary (scripts/e2e/fixtures.js,
 *     "E2E Dhanori Pilot"). Inside, it sets the location; outside, it says so
 *     and takes a waitlist sign-up (POST /zones/waitlist).
 * C3: the shop directory lists nearby shops and shows whether each is open
 *     now, from its hours.
 */
const { test, expect } = require('@playwright/test');

const DHANORI = { latitude: 18.5793, longitude: 73.8796 };
const OUTSIDE = { latitude: 19.8762, longitude: 75.3433 }; // Aurangabad: no zone there

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('localsampark_consent', 'accepted');
      localStorage.setItem('localsampark_tour_seen', 'true');
    } catch { /* storage blocked */ }
  });
});

async function useMyLocation(page, context, where) {
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation(where);
  await page.goto('/');
  await page.getByRole('button', { name: 'Select Delivery Location' }).click();
  await page.getByTestId('serviceability').getByRole('button', { name: 'Use my current location' }).click();
}

test('[C2.3] inside the pilot zone, "use my current location" sets the area', async ({ page, context }) => {
  await useMyLocation(page, context, DHANORI);
  await expect(page.getByRole('button', { name: 'Select Delivery Location' })).toContainText('E2E Dhanori Pilot');
  await expect(page.getByText("We don't deliver to your area yet.")).toHaveCount(0);
});

test('[C2.4] outside every zone, the visitor is told so and can join the waitlist', async ({ page, context }) => {
  await useMyLocation(page, context, OUTSIDE);
  const panel = page.getByTestId('serviceability');
  await expect(panel.getByText("We don't deliver to your area yet.")).toBeVisible();

  const form = panel.getByRole('form', { name: 'Join the waitlist' });
  // Nothing to reach them by: refused before it is sent.
  await form.getByRole('button', { name: 'Join the waitlist' }).click();
  await expect(form.getByRole('alert')).toContainText('mobile number or email');

  // A malformed number is refused by the server, and the message shown.
  await form.getByLabel('Tell me when you reach my area').fill('12ab');
  await form.getByRole('button', { name: 'Join the waitlist' }).click();
  await expect(form.getByRole('alert')).toBeVisible();

  const email = `c2-web-${Date.now()}@example.com`;
  await form.getByLabel('Tell me when you reach my area').fill(email);
  const saved = page.waitForResponse((r) => r.url().includes('/zones/waitlist') && r.request().method() === 'POST');
  await form.getByRole('button', { name: 'Join the waitlist' }).click();
  expect((await saved).status()).toBe(201);
  await expect(panel.getByText("You're on the list.")).toBeVisible();
});

test('[C3.3] the shop directory shows nearby shops and whether each is open now', async ({ page }) => {
  // The page may ask more than once (without, then with, a location); keep the
  // latest answer, which is what ends up on screen.
  const byName = new Map();
  page.on('response', async (r) => {
    // The directory reads /shops/pincode/:pin when the visitor has a pincode,
    // /shops/nearby otherwise; both carry is_open_now.
    if (!/\/shops\/(nearby|pincode\/)/.test(r.url()) || !r.ok()) return;
    try {
      const body = await r.json();
      for (const s of body.shops || []) byName.set(s.name, s);
    } catch { /* not JSON */ }
  });
  await page.goto('/shops');

  const cards = page.getByRole('article');
  await expect(cards.first()).toBeVisible();
  const names = await cards.getByRole('heading', { level: 3 }).allTextContents();
  expect(names.length).toBeGreaterThan(0);

  // Every card shows exactly what the API knows about its hours: "Open now",
  // "Closed now", or nothing when the hours are unknown.
  let shownOpen = 0;
  for (const name of names.slice(0, 12)) {
    const shop = byName.get(name.trim());
    if (!shop) continue;
    const status = cards.filter({ has: page.getByRole('heading', { level: 3, name: name.trim(), exact: true }) }).first().getByTestId('open-status');
    if (shop.is_open_now === true) { await expect(status).toHaveText('Open now'); shownOpen += 1; }
    else if (shop.is_open_now === false) await expect(status).toHaveText('Closed now');
    else await expect(status).toHaveCount(0);
  }
  // The seed's 24-hour shops ({"open":"00:00","close":"00:00"}) are open at any hour.
  expect(shownOpen).toBeGreaterThan(0);
});
