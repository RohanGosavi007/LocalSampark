// @ts-check
/**
 * P13 on the web: what a visitor on a low-end phone and a slow connection has
 * to download, measured in a real browser against the production build.
 *
 * The earlier "performance" checks read source files for next/dynamic. They
 * cannot see that a page grew from 300 KB to 3 MB because someone imported a
 * charting library. These measure the bytes that actually cross the wire
 * (compressed, as served), per page, with a budget each.
 *
 * Budgets are the measured size plus headroom (about +35%): they exist to stop
 * a regression, and are raised on purpose, in a commit that says why.
 */
const { test, expect } = require('@playwright/test');

// Bytes over the wire (gzip/br as served). Measured 2026-11-14, after the
// header logo went from a 528 KB / 1024 px JPEG (shown at 48 px, on EVERY page:
// half of each page's weight) to a 11 KB / 192 px one:
//   /        js 370 KB, total 536 KB, 39 requests
//   /shops   js 375 KB, total 544 KB, 42 requests
//   /login   js 336 KB, total 461 KB, 29 requests
//   /search  js 354 KB, total 495 KB, 34 requests
const BUDGETS = {
  '/': { js: 480 * 1024, total: 700 * 1024, requests: 52 },
  '/shops': { js: 490 * 1024, total: 710 * 1024, requests: 56 },
  '/login': { js: 440 * 1024, total: 600 * 1024, requests: 40 },
  '/search': { js: 460 * 1024, total: 650 * 1024, requests: 46 },
};
// No single image on first load may be bigger than this: a logo is a few KB.
const MAX_IMAGE = 150 * 1024;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try { localStorage.setItem('localsampark_consent', 'accepted'); localStorage.setItem('localsampark_tour_seen', 'true'); } catch { /* storage blocked */ }
  });
});

/** Bytes transferred for everything the page loads, by kind. */
async function weigh(page, url) {
  const totals = { js: 0, css: 0, images: 0, fonts: 0, other: 0, total: 0, requests: 0, biggestImage: { bytes: 0, url: '' } };
  const sizing = [];
  page.on('requestfinished', (request) => {
    sizing.push((async () => {
      try {
        const sizes = await request.sizes();
        const bytes = sizes.responseBodySize + sizes.responseHeadersSize;
        const type = request.resourceType();
        const key = { script: 'js', stylesheet: 'css', image: 'images', font: 'fonts' }[type] || 'other';
        totals[key] += bytes;
        if (key === 'images' && bytes > totals.biggestImage.bytes) totals.biggestImage = { bytes, url: request.url() };
        totals.total += bytes;
        totals.requests += 1;
      } catch { /* a request that was cancelled mid-flight */ }
    })());
  });
  await page.goto(url, { waitUntil: 'networkidle' });
  await Promise.all(sizing);
  return totals;
}

const kb = (n) => `${Math.round(n / 1024)} KB`;

for (const [url, budget] of Object.entries(BUDGETS)) {
  test(`[P13.4] ${url} stays within its download budget`, async ({ page }) => {
    const w = await weigh(page, url);
    if (process.env.PERF_REPORT) {
      require('fs').appendFileSync(process.env.PERF_REPORT, `${url} js=${kb(w.js)} css=${kb(w.css)} images=${kb(w.images)} fonts=${kb(w.fonts)} total=${kb(w.total)} requests=${w.requests}\n`);
    }
    expect(w.js, `JavaScript on ${url}: ${kb(w.js)} (budget ${kb(budget.js)})`).toBeLessThanOrEqual(budget.js);
    expect(w.total, `Total on ${url}: ${kb(w.total)} (budget ${kb(budget.total)})`).toBeLessThanOrEqual(budget.total);
    expect(w.requests, `Requests on ${url}: ${w.requests} (budget ${budget.requests})`).toBeLessThanOrEqual(budget.requests);
    expect(w.biggestImage.bytes, `Largest image on ${url}: ${w.biggestImage.url} is ${kb(w.biggestImage.bytes)} (limit ${kb(MAX_IMAGE)})`).toBeLessThanOrEqual(MAX_IMAGE);
  });
}
