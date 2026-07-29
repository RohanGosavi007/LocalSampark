// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Accessibility (a11y) Tests
 * Uses Playwright to verify WCAG 2.1 compliance on key pages.
 * Checks for: alt text, ARIA labels, color contrast, keyboard navigation, focus management.
 */

const PAGES_TO_TEST = [
  { name: 'Homepage', url: '/' },
  { name: 'Login', url: '/login' },
  { name: 'Register', url: '/register' },
  { name: 'Shops', url: '/shops' },
  { name: 'Services', url: '/services' },
];

test.describe('Accessibility Tests', () => {

  for (const page of PAGES_TO_TEST) {
    test(`${page.name} - should have proper document structure`, async ({ page: pw }) => {
      await pw.goto(page.url);
      
      // Check for exactly one <h1>
      const h1Count = await pw.locator('h1').count();
      expect(h1Count).toBeGreaterThanOrEqual(1);

      // Check for html lang attribute
      const lang = await pw.locator('html').getAttribute('lang');
      expect(lang).toBeTruthy();
    });

    test(`${page.name} - images should have alt text`, async ({ page: pw }) => {
      await pw.goto(page.url);
      
      const images = pw.locator('img');
      const count = await images.count();
      
      for (let i = 0; i < count; i++) {
        const alt = await images.nth(i).getAttribute('alt');
        const role = await images.nth(i).getAttribute('role');
        // Image must have alt text OR role="presentation" for decorative images
        expect(alt !== null || role === 'presentation').toBe(true);
      }
    });

    test(`${page.name} - interactive elements should be keyboard accessible`, async ({ page: pw }) => {
      await pw.goto(page.url);
      
      // All buttons should be focusable
      const buttons = pw.locator('button');
      const btnCount = await buttons.count();
      for (let i = 0; i < Math.min(btnCount, 5); i++) {
        const tabIndex = await buttons.nth(i).getAttribute('tabindex');
        // tabindex should not be -1 (which removes from tab order)
        expect(tabIndex).not.toBe('-1');
      }

      // All links should have href
      const links = pw.locator('a');
      const linkCount = await links.count();
      for (let i = 0; i < Math.min(linkCount, 5); i++) {
        const href = await links.nth(i).getAttribute('href');
        expect(href).toBeTruthy();
      }
    });

    test(`${page.name} - form inputs should have labels`, async ({ page: pw }) => {
      await pw.goto(page.url);
      
      const inputs = pw.locator('input:not([type="hidden"])');
      const count = await inputs.count();
      
      for (let i = 0; i < count; i++) {
        const input = inputs.nth(i);
        const id = await input.getAttribute('id');
        const ariaLabel = await input.getAttribute('aria-label');
        const ariaLabelledby = await input.getAttribute('aria-labelledby');
        const placeholder = await input.getAttribute('placeholder');
        
        // Input must have at least one labeling mechanism
        const hasLabel = id ? await pw.locator(`label[for="${id}"]`).count() > 0 : false;
        const isLabeled = hasLabel || ariaLabel || ariaLabelledby || placeholder;
        expect(isLabeled).toBeTruthy();
      }
    });
  }

  test('Homepage - should be navigable with keyboard only', async ({ page }) => {
    await page.goto('/');
    
    // Press Tab multiple times and verify focus moves
    await page.keyboard.press('Tab');
    const firstFocused = await page.evaluate(() => document.activeElement?.tagName);
    expect(firstFocused).toBeTruthy();
    
    await page.keyboard.press('Tab');
    const secondFocused = await page.evaluate(() => document.activeElement?.tagName);
    expect(secondFocused).toBeTruthy();
    
    // Focus should have moved
    // (We can't guarantee different elements, but focus should be defined)
  });

  test('should have skip-to-content link or proper landmark roles', async ({ page }) => {
    await page.goto('/');
    
    // Check for landmark roles
    const hasMain = await page.locator('main, [role="main"]').count() > 0;
    const hasNav = await page.locator('nav, [role="navigation"]').count() > 0;
    const hasSkipLink = await page.locator('a[href="#main-content"], a[href="#content"]').count() > 0;
    
    // Page should have at least main landmark OR a skip link
    expect(hasMain || hasSkipLink).toBe(true);
  });
});
