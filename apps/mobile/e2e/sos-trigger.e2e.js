describe('SOS Trigger Flow', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should trigger a Medical SOS alert and show confirmation', async () => {
    // 1. Navigate to SOS dashboard/module. 
    // Assuming there's a button on the home screen to go to SOS, or it's accessible via a specific tab.
    // For this example, we assume we can navigate there by tapping 'SOS' on the bottom tab or a floating button.
    await element(by.text('SOS')).tap();

    // 2. Verify we are on the SOS screen by checking for the medical button
    await expect(element(by.id('sos-trigger-medical'))).toBeVisible();

    // 3. Tap the medical emergency button
    await element(by.id('sos-trigger-medical')).tap();

    // 4. Wait for the React Native Alert to appear
    // The alert title is "SOS SENT"
    await expect(element(by.text('SOS SENT'))).toBeVisible();
    
    // 5. Dismiss the alert
    await element(by.text('OK')).tap();
  });
  
  it('should allow adding a new emergency contact', async () => {
    await element(by.text('SOS')).tap();
    
    // 1. Find the contact input and type a number
    await element(by.id('sos-contact-input')).typeText('9876543210');
    await element(by.id('sos-contact-input')).tapReturnKey();
    
    // 2. Tap the Add button
    await element(by.text('Add')).tap();
    
    // 3. Verify success alert
    await expect(element(by.text('Success'))).toBeVisible();
    await element(by.text('OK')).tap();
  });
});
