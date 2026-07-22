describe('Shop Directory Browsing', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should navigate to directory and render shop cards', async () => {
    // 1. Navigate to the Directory tab
    // Depending on your bottom tab implementation, you might need a specific testID on the tab bar.
    // Assuming 'Directory' is the text on the bottom tab bar:
    await element(by.text('Directory')).tap();

    // 2. Wait for directory to load and verify the search input exists
    await expect(element(by.id('directory-search-input'))).toBeVisible();

    // 3. Search for a specific shop
    await element(by.id('directory-search-input')).typeText('Golden Crumb');
    // Hide keyboard after typing
    await element(by.id('directory-search-input')).tapReturnKey();

    // 4. Verify the specific shop card (demo-4) is visible
    await expect(element(by.id('shop-card-demo-4'))).toBeVisible();

    // 5. Tap the action button to view shop details
    await element(by.id('shop-action-demo-4')).tap();

    // 6. Verify we navigated to the shop detail page (by looking for a specific text or element)
    await expect(element(by.text('Golden Crumb Bakery'))).toBeVisible();
  });

  it('should filter by categories', async () => {
    await element(by.text('Directory')).tap();
    
    // Tap the 'Pharmacy & Healthcare' category chip
    await element(by.id('category-chip-Pharmacy & Healthcare')).tap();
    
    // Verify a pharmacy shop is visible (e.g., demo-2)
    await expect(element(by.id('shop-card-demo-2'))).toBeVisible();
  });
});
