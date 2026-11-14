// @ts-check
/**
 * P11 on the web: no analytics event leaves the browser unless the visitor said yes.
 *
 * The consent banner used to be decoration: telemetry collected and sent for
 * everyone, whatever the banner said. These tests watch the network, which is
 * the only place that matters: a POST to /ml/events either happens or it does not.
 *
 * Events are sent when the page is hidden (or after 10 s), so a page-hide is
 * simulated instead of waiting.
 */
const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  // Tour seen (so it does not cover the page); consent deliberately NOT set.
  await page.addInitScript(() => {
    try { localStorage.setItem('localsampark_tour_seen', 'true'); } catch { /* storage blocked */ }
  });
});

/** Collects every analytics POST the page makes. */
function watchAnalytics(page) {
  /** @type {{ url: string, body: any }[]} */
  const posts = [];
  page.on('request', (req) => {
    if (req.method() === 'POST' && /\/ml\/events/.test(req.url())) {
      let body = null;
      try { body = JSON.parse(req.postData() || 'null'); } catch { /* not JSON */ }
      posts.push({ url: req.url(), body });
    }
  });
  return posts;
}

/**
 * Scrolls the first shop card into view and leaves it there for the 1 s an
 * impression needs. Without a card on screen nothing would be tracked even for
 * a visitor who agreed, and the "nothing is sent" checks would prove nothing.
 */
async function viewFirstShop(page) {
  const card = page.getByRole('article').first();
  await expect(card).toBeVisible({ timeout: 15000 });
  await card.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1800);
}

/** Makes the page report it is hidden, which is when events are sent. */
async function hidePage(page) {
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(800);
}

async function seeShopsThenHide(page) {
  await page.goto('/shops');
  await viewFirstShop(page);
  await hidePage(page);
}

test('[P11.7] a visitor who has not answered is not tracked, and is asked', async ({ page }) => {
  const posts = watchAnalytics(page);
  await page.goto('/shops');
  await expect(page.getByRole('dialog', { name: /privacy/i })).toBeVisible({ timeout: 8000 });
  await expect(page.getByRole('button', { name: 'Only necessary' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Allow analytics' })).toBeVisible();
  await seeShopsThenHide(page);
  expect(posts).toHaveLength(0);
  expect(await page.evaluate(() => sessionStorage.getItem('ls_telemetry_session'))).toBeNull();
});

test('[P11.8] "Only necessary" is remembered and nothing is sent', async ({ page }) => {
  const posts = watchAnalytics(page);
  await page.goto('/shops');
  await page.getByRole('button', { name: 'Only necessary' }).click();
  await expect(page.getByRole('dialog', { name: /privacy/i })).toBeHidden();
  expect(await page.evaluate(() => localStorage.getItem('localsampark_consent'))).toBe('declined');
  await seeShopsThenHide(page);
  expect(posts).toHaveLength(0);
  // Still not tracked, and not asked again, on the next visit.
  await page.reload();
  await page.waitForTimeout(2200);
  await expect(page.getByRole('dialog', { name: /privacy/i })).toBeHidden();
  expect(posts).toHaveLength(0);
});

test('[P11.9] "Allow analytics" starts tracking, and the payload carries no personal data', async ({ page }) => {
  const posts = watchAnalytics(page);
  await page.goto('/shops');
  await page.getByRole('button', { name: 'Allow analytics' }).click();
  expect(await page.evaluate(() => localStorage.getItem('localsampark_consent'))).toBe('accepted');
  await page.reload();
  await viewFirstShop(page);
  await hidePage(page);
  expect(posts.length).toBeGreaterThan(0);

  const events = posts.flatMap((p) => p.body?.events || []);
  expect(events.length).toBeGreaterThan(0);
  const allowed = ['event_type', 'item_type', 'item_id', 'local_hour', 'platform', 'surface', 'position', 'is_exploration'];
  for (const event of events) {
    expect(Object.keys(event).filter((k) => !allowed.includes(k))).toEqual([]);
  }
  expect(JSON.stringify(posts.map((p) => p.body))).not.toMatch(/@|phone|email|address|\+91/i);
});

test('[P11.10] withdrawing consent from the footer stops tracking at once', async ({ page }) => {
  const posts = watchAnalytics(page);
  // A visitor who accepted earlier (only if no answer is stored, so the withdrawal below sticks).
  await page.addInitScript(() => {
    try { if (!localStorage.getItem('localsampark_consent')) localStorage.setItem('localsampark_consent', 'accepted'); } catch { /* blocked */ }
  });
  await page.goto('/shops');
  await page.waitForLoadState('networkidle');

  // The footer says what the choice is, and reopens it.
  await page.getByRole('button', { name: 'Privacy choices' }).click();
  await expect(page.getByText('Analytics are currently on.')).toBeVisible();
  await page.getByRole('button', { name: 'Only necessary' }).click();
  expect(await page.evaluate(() => localStorage.getItem('localsampark_consent'))).toBe('declined');

  const before = posts.length;
  await seeShopsThenHide(page);
  // seeShopsThenHide navigates again; the stored answer now stays "declined".
  expect(await page.evaluate(() => localStorage.getItem('localsampark_consent'))).toBe('declined');
  expect(posts.length).toBe(before);
  expect(await page.evaluate(() => sessionStorage.getItem('ls_telemetry_session'))).toBeNull();
});
