describe('Community Hub Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should navigate to the community trust feed and interact', async () => {
    // Navigate to Community Hub Tab
    await element(by.id('tab-community-hub')).tap();
    
    // Tap on Trust Feed
    await element(by.id('btn-trust-feed')).tap();

    // Verify feed is loaded
    await expect(element(by.text('Trust Feed'))).toBeVisible();

    // Look for verified buyer icon (mocked via testID)
    await expect(element(by.id('verified-badge-0'))).toExist();

    // Swipe up to scroll through videos (simulate flatlist scroll)
    await element(by.id('trust-feed-list')).swipe('up', 'fast', 0.5);

    // Tap back
    await element(by.id('header-back-btn')).tap();
    await expect(element(by.text('Trust Feed'))).not.toBeVisible();
  });
});
