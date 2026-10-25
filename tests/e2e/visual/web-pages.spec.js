// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Visual Regression Tests
 * Takes full-page screenshots and compares against golden baselines.
 * On first run, baselines are generated. Subsequent runs compare pixel-by-pixel.
 */

/**
 * Brings a page to rest before it is photographed. The home page reveals sections as they scroll into
 * view and runs looping animations, so two screenshots of the same build came out 13,352 px and
 * 10,552 px tall and 24-28% different. Reduced motion stops the loops; scrolling the page through
 * once reveals the lazily shown sections; the stats strip is given a moment to arrive.
 */
async function settle(pw) {
  await pw.emulateMedia({ reducedMotion: 'reduce' });
  await pw.evaluate(async () => {
    const step = Math.max(400, window.innerHeight - 100);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  await pw.waitForTimeout(1500);
}

const PAGES = [
  { name: 'homepage', url: '/' },
  { name: 'login', url: '/login' },
  { name: 'register', url: '/register' },
  { name: 'shops', url: '/shops' },
  { name: 'services', url: '/services' },
  { name: 'community', url: '/community' },
  { name: 'about', url: '/about' },
  { name: 'download', url: '/download' },
  { name: 'not-found', url: '/this-page-does-not-exist-404' },
];

test.describe('Visual Regression - Desktop', () => {
  for (const page of PAGES) {
    test(`${page.name} should match baseline screenshot`, async ({ page: pw }) => {
      await pw.goto(page.url, { waitUntil: 'networkidle' });
      await settle(pw);
      await expect(pw).toHaveScreenshot(`desktop-${page.name}.png`, {
        fullPage: true,
        animations: 'disabled',
        maxDiffPixelRatio: 0.02, // Allow 2% pixel difference
      });
    });
  }
});

test.describe('Visual Regression - Mobile (375px)', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  for (const page of PAGES.slice(0, 5)) {
    test(`${page.name} mobile should match baseline`, async ({ page: pw }) => {
      await pw.goto(page.url, { waitUntil: 'networkidle' });
      await settle(pw);
      await expect(pw).toHaveScreenshot(`mobile-${page.name}.png`, {
        fullPage: true,
        animations: 'disabled',
        maxDiffPixelRatio: 0.03,
      });
    });
  }
});

test.describe('Visual Regression - Tablet (768px)', () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  for (const page of PAGES.slice(0, 3)) {
    test(`${page.name} tablet should match baseline`, async ({ page: pw }) => {
      await pw.goto(page.url, { waitUntil: 'networkidle' });
      await settle(pw);
      await expect(pw).toHaveScreenshot(`tablet-${page.name}.png`, {
        fullPage: true,
        animations: 'disabled',
        maxDiffPixelRatio: 0.03,
      });
    });
  }
});
