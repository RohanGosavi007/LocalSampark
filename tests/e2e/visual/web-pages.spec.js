// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Visual Regression Tests
 * Takes full-page screenshots and compares against golden baselines.
 * On first run, baselines are generated. Subsequent runs compare pixel-by-pixel.
 */

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
      await pw.waitForTimeout(500); // Allow animations to settle
      await expect(pw).toHaveScreenshot(`desktop-${page.name}.png`, {
        fullPage: true,
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
      await pw.waitForTimeout(500);
      await expect(pw).toHaveScreenshot(`mobile-${page.name}.png`, {
        fullPage: true,
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
      await pw.waitForTimeout(500);
      await expect(pw).toHaveScreenshot(`tablet-${page.name}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.03,
      });
    });
  }
});
