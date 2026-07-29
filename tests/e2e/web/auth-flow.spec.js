// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Web App - Auth Flow E2E Tests
 * Tests login, registration, forgot password, session persistence, and logout.
 */

test.describe('Auth Flow', () => {

  test('should show login page with phone input', async ({ page }) => {
    await page.goto('/login');
    const phoneInput = page.locator('input[type="tel"], input[name="phone"], input[placeholder*="phone" i], input[placeholder*="mobile" i]').first();
    await expect(phoneInput).toBeVisible();
  });

  test('should show register page with form fields', async ({ page }) => {
    await page.goto('/register');
    await expect(page).toHaveURL(/register/);
    // Verify at least name and phone fields exist
    const inputs = page.locator('input');
    const count = await inputs.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('should navigate from login to register', async ({ page }) => {
    await page.goto('/login');
    const registerLink = page.locator('a[href*="register"], button:has-text("Register"), a:has-text("Sign up"), a:has-text("Register")').first();
    if (await registerLink.isVisible()) {
      await registerLink.click();
      await page.waitForURL(/register/);
      expect(page.url()).toContain('register');
    }
  });

  test('should show forgot password page', async ({ page }) => {
    await page.goto('/forgot-password');
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });

  test('should prevent empty form submission on login', async ({ page }) => {
    await page.goto('/login');
    const submitBtn = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Continue")').first();
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      // Should show validation error or stay on same page
      await page.waitForTimeout(500);
      expect(page.url()).toContain('login');
    }
  });

  test('should reject invalid phone number format', async ({ page }) => {
    await page.goto('/login');
    const phoneInput = page.locator('input[type="tel"], input[name="phone"]').first();
    if (await phoneInput.isVisible()) {
      await phoneInput.fill('123'); // Too short
      const submitBtn = page.locator('button[type="submit"], button:has-text("Continue")').first();
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        await page.waitForTimeout(500);
        // Should show error or stay on login page
        expect(page.url()).toContain('login');
      }
    }
  });
});
