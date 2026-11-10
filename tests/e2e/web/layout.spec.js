/**
 * No page scrolls sideways.
 *
 * The header's right-hand cluster was wider than the screen: 360 px past a 1280 px window (the full
 * desktop menu does not fit there) and 53 px past a 375 px phone (three language buttons). Pages
 * without an overflow guard on their wrapper then scrolled horizontally, and every full-page
 * screenshot came out wider than the viewport.
 */
const { test, expect } = require('@playwright/test');

const PAGES = ['/', '/community', '/shops', '/login', '/services'];
const SIZES = [[1280, 720], [375, 800]];

for (const [width, height] of SIZES) {
  for (const url of PAGES) {
    test(`${url} does not overflow a ${width}px screen`, async ({ page }) => {
      test.setTimeout(180000);
      await page.addInitScript(() => {
        try { localStorage.setItem('localsampark_tour_seen', 'true'); localStorage.setItem('localsampark_consent', 'accepted'); } catch (e) { /* storage blocked */ }
      });
      await page.setViewportSize({ width, height });
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 150000 });
      await page.waitForTimeout(4000);
      const { vw, scrollW } = await page.evaluate(() => ({ vw: document.documentElement.clientWidth, scrollW: document.documentElement.scrollWidth }));
      expect(scrollW, `scrollWidth ${scrollW} vs viewport ${vw}`).toBeLessThanOrEqual(vw);
    });
  }
}

/*
 * The same check while the page is still loading. The skeleton placeholders
 * used to grow to 1.6x on a loop (a global `@keyframes pulse` replaced
 * Tailwind's), so /shops and /services overflowed only when the API was slow,
 * which made the check above pass or fail depending on machine load. Holding
 * every API response makes the loading state deterministic.
 */
for (const [width, height] of SIZES) {
  for (const url of ['/shops', '/services']) {
    test(`${url} does not overflow a ${width}px screen while loading`, async ({ page }) => {
      test.setTimeout(180000);
      await page.addInitScript(() => {
        try { localStorage.setItem('localsampark_tour_seen', 'true'); localStorage.setItem('localsampark_consent', 'accepted'); } catch (e) { /* storage blocked */ }
      });
      let release;
      const held = new Promise((resolve) => { release = resolve; });
      await page.route('**/api/v1/**', async (route) => { await held; await route.continue().catch(() => {}); });
      await page.setViewportSize({ width, height });
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 150000 });
      await expect(page.locator('.animate-pulse').first()).toBeVisible({ timeout: 60000 });
      // Sample across a full pulse cycle (2 s), not a single frame.
      for (let i = 0; i < 5; i++) {
        const { vw, scrollW } = await page.evaluate(() => ({ vw: document.documentElement.clientWidth, scrollW: document.documentElement.scrollWidth }));
        expect(scrollW, `scrollWidth ${scrollW} vs viewport ${vw} (sample ${i})`).toBeLessThanOrEqual(vw);
        await page.waitForTimeout(500);
      }
      release();
    });
  }
}
