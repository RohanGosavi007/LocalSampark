const { test, expect } = require('@playwright/test');

test.describe('Order Lifecycle E2E', () => {
  test('should complete the checkout flow and track order', async ({ page }) => {
    // 1. Visit the Shop Explorer
    await page.goto('/shops');
    
    // 2. Select a shop and add item to cart
    await page.click('text=Visit Shop >> nth=0');
    await page.click('text=Add to Cart >> nth=0');
    
    // 3. Go to Checkout
    await page.click('text=Checkout');
    await expect(page.locator('h1')).toContainText('Checkout');
    
    // 4. Submit Order (Simulated Payment)
    await page.fill('input[name="address"]', '123 Test Ave, Pune');
    await page.click('text=Pay with Razorpay / UPI');
    
    // 5. Verify Redirect to Live Tracking
    await page.waitForURL(/\/tracking\/.+/);
    await expect(page.locator('text=Live Order Tracking')).toBeVisible();
    
    // 6. Verify Status Stepper
    await expect(page.locator('text=Order Placed')).toBeVisible();
  });
});
