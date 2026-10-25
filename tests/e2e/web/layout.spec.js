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
