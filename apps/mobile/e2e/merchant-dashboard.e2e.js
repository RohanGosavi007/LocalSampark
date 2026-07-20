describe('Merchant Dashboard Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should allow merchant to view AI insights and schedule a campaign', async () => {
    // Navigate to Login as Merchant
    await expect(element(by.id('login-button-home'))).toBeVisible();
    await element(by.id('login-button-home')).tap();

    // Fill merchant credentials
    await element(by.id('phone-input')).typeText('9998887776');
    await element(by.id('password-input')).typeText('merchant123');
    await element(by.id('login-submit')).tap();

    // Navigate to Merchant Dashboard Tab
    await element(by.id('tab-shop-dashboard')).tap();
    
    // Verify AI Insights loaded
    await expect(element(by.text('AI Smart Insights'))).toBeVisible();
    await expect(element(by.text('Dynamic Demand'))).toBeVisible();

    // Navigate to Campaign Builder
    await element(by.id('btn-create-campaign')).tap();
    await element(by.id('campaign-title-input')).typeText('Weekend Mega Sale');
    await element(by.id('campaign-discount-input')).typeText('25');
    await element(by.id('campaign-flash-toggle')).tap();
    await element(by.id('campaign-submit-btn')).tap();

    // Verify success alert
    await expect(element(by.text('Campaign Created'))).toBeVisible();
    await element(by.text('OK')).tap();
  });
});
