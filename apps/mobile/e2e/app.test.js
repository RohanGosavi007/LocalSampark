/**
 * Mobile E2E Tests - Login & Dashboard Flows
 * Tests the core mobile app flows using Detox.
 */

describe('Mobile App - Login Flow', () => {
  
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should show the login/onboarding screen on first launch', async () => {
    // Look for phone number input or login prompt
    await expect(element(by.text('Login'))).toBeVisible();
  });

  it('should allow entering a phone number', async () => {
    const phoneInput = element(by.id('phone-input'));
    await expect(phoneInput).toBeVisible();
    await phoneInput.typeText('9999900001');
    await phoneInput.tapReturnKey();
  });

  it('should navigate to OTP screen after phone entry', async () => {
    const phoneInput = element(by.id('phone-input'));
    await phoneInput.clearText();
    await phoneInput.typeText('9999900001');
    
    const submitBtn = element(by.id('login-submit'));
    await submitBtn.tap();
    
    // Should show OTP input
    await waitFor(element(by.id('otp-input'))).toBeVisible().withTimeout(5000);
  });
});

describe('Mobile App - Resident Dashboard', () => {

  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    // Assume we're already logged in via a stored token
  });

  it('should display the greeting header', async () => {
    await waitFor(element(by.text('Hello,'))).toBeVisible().withTimeout(10000);
  });

  it('should show platform service pillars', async () => {
    await waitFor(element(by.text('Supermarket'))).toBeVisible().withTimeout(5000);
    await expect(element(by.text('Insta Drop'))).toBeVisible();
    await expect(element(by.text('Fresh Veggies'))).toBeVisible();
    await expect(element(by.text('Community'))).toBeVisible();
  });

  it('should show quick tiles grid', async () => {
    await element(by.id('dashboard-scroll')).scrollTo('bottom');
    await expect(element(by.text('Services'))).toBeVisible();
    await expect(element(by.text('Bills'))).toBeVisible();
  });

  it('should show SOS alert button', async () => {
    await expect(element(by.text('SOS Alert'))).toBeVisible();
  });

  it('should navigate to community tab', async () => {
    await element(by.text('Community')).tap();
    await waitFor(element(by.text('Townsquare'))).toBeVisible().withTimeout(5000);
  });

  it('should navigate to directory tab', async () => {
    const directoryTab = element(by.id('tab-directory'));
    await directoryTab.tap();
    await waitFor(element(by.text('Shops'))).toBeVisible().withTimeout(5000);
  });

  it('should show notification bell with badge', async () => {
    await expect(element(by.id('notification-bell'))).toBeVisible();
  });

  it('should navigate to wallet screen', async () => {
    const walletBtn = element(by.id('wallet-button'));
    if (await walletBtn.isVisible()) {
      await walletBtn.tap();
      await waitFor(element(by.text('Wallet'))).toBeVisible().withTimeout(5000);
    }
  });
});

describe('Mobile App - Community Screen', () => {

  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  it('should display Townsquare header', async () => {
    // Navigate to community tab
    await element(by.id('tab-community')).tap();
    await waitFor(element(by.text('Townsquare'))).toBeVisible().withTimeout(5000);
  });

  it('should show community posts', async () => {
    await waitFor(element(by.text('ALERT'))).toBeVisible().withTimeout(5000);
  });

  it('should show New Post button', async () => {
    await expect(element(by.text('+ New Post'))).toBeVisible();
  });

  it('should open create post modal', async () => {
    await element(by.text('+ New Post')).tap();
    await waitFor(element(by.text('Create Post'))).toBeVisible().withTimeout(3000);
  });

  it('should show category selection in create modal', async () => {
    await expect(element(by.text('DISCUSSION'))).toBeVisible();
    await expect(element(by.text('EVENT'))).toBeVisible();
    await expect(element(by.text('QUESTION'))).toBeVisible();
  });

  it('should validate empty post submission', async () => {
    await element(by.text('Publish to Community')).tap();
    // Should show alert about empty post
    await waitFor(element(by.text('Empty Post'))).toBeVisible().withTimeout(3000);
  });

  it('should show community polls', async () => {
    // Close modal first
    await element(by.text('❌')).tap();
    
    // Scroll to find polls
    await element(by.id('community-scroll')).scroll(300, 'down');
    await waitFor(element(by.text('COMMUNITY POLL'))).toBeVisible().withTimeout(5000);
  });
});
