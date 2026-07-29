// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * LocalSampark Web App - Homepage E2E Tests
 * Validates the landing page renders correctly across browsers.
 */

test.describe('Homepage', () => {
  
  test('should load without errors and return 200', async ({ page }) => {
    const response = await page.goto('/');
    expect(response.status()).toBe(200);
  });

  test('should display the main title and tagline', async ({ page }) => {
    await page.goto('/');
    // Check for presence of main heading content
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
  });

  test('should have correct SEO meta tags', async ({ page }) => {
    await page.goto('/');
    
    // Check title tag
    const title = await page.title();
    expect(title.length).toBeGreaterThan(5);
    expect(title.toLowerCase()).toContain('localsampark');

    // Check meta description
    const metaDesc = page.locator('meta[name="description"]');
    await expect(metaDesc).toHaveAttribute('content', /.{20,}/);

    // Check viewport meta
    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toHaveAttribute('content', /width=device-width/);
  });

  test('should have working navigation links', async ({ page }) => {
    await page.goto('/');
    
    // Check that login link exists
    const loginLink = page.locator('a[href*="login"], button:has-text("Login"), a:has-text("Login")').first();
    if (await loginLink.isVisible()) {
      await expect(loginLink).toBeEnabled();
    }
  });

  test('should display platform service pillars', async ({ page }) => {
    await page.goto('/');
    
    // Verify key service categories are mentioned
    const pageContent = await page.textContent('body');
    const expectedServices = ['Delivery', 'Community', 'Services'];
    
    for (const service of expectedServices) {
      expect(pageContent).toContain(service);
    }
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Page should not have horizontal scroll
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5); // 5px tolerance
  });

  test('should not have any console errors', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Filter out known non-critical errors (e.g., favicon 404)
    const criticalErrors = consoleErrors.filter(
      err => !err.includes('favicon') && !err.includes('404')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('should load within 5 seconds (performance check)', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(5000);
  });
});
