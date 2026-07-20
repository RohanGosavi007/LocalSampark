describe('Customer Core E-Commerce Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should navigate to login, authenticate, and browse marketplace', async () => {
    // Navigate to Login
    await expect(element(by.id('login-button-home'))).toBeVisible();
    await element(by.id('login-button-home')).tap();

    // Fill credentials
    await element(by.id('phone-input')).typeText('9876543210');
    await element(by.id('password-input')).typeText('password123');
    await element(by.id('login-submit')).tap();

    // Verify marketplace loaded
    await expect(element(by.id('marketplace-grid'))).toBeVisible();
  });

  it('should search for a product, add to cart, and checkout', async () => {
    // Assuming logged in from previous test or mocked
    
    // Search
    await element(by.id('search-input')).typeText('Milk');
    await element(by.id('search-input')).tapReturnKey();
    
    // Add to cart
    await expect(element(by.id('product-card-101'))).toBeVisible();
    await element(by.id('add-to-cart-101')).tap();
    
    // Go to cart
    await element(by.id('cart-icon-header')).tap();
    
    // Verify item in cart
    await expect(element(by.text('Premium Shampoo'))).toBeVisible(); // Mocked data
    
    // Checkout
    await element(by.id('checkout-button')).tap();
    await expect(element(by.text('Order Placed Successfully!'))).toBeVisible();
  });
});
