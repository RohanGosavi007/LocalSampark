// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Admin Panel E2E Tests
 * Tests login, dashboard, territory management, and settings.
 */

test.describe('Admin Panel', () => {

  test('should load admin login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/admin|localsampark/i);
  });

  test('should show login form with required fields', async ({ page }) => {
    await page.goto('/login');
    // Look for input fields
    const inputs = page.locator('input');
    const inputCount = await inputs.count();
    expect(inputCount).toBeGreaterThanOrEqual(1);
  });

  test('should load dashboard page', async ({ page }) => {
    const response = await page.goto('/');
    expect(response.status()).toBe(200);
  });

  test('should load territories page', async ({ page }) => {
    const response = await page.goto('/territories');
    expect(response.status()).toBe(200);
  });

  test('should load audit page', async ({ page }) => {
    const response = await page.goto('/audit');
    expect(response.status()).toBe(200);
  });

  test('should load settings page', async ({ page }) => {
    const response = await page.goto('/settings');
    expect(response.status()).toBe(200);
  });

  test('should not have console errors on dashboard', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const critical = errors.filter(e => !e.includes('favicon') && !e.includes('404'));
    expect(critical).toHaveLength(0);
  });
});
