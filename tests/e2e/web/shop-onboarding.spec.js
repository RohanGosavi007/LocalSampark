// @ts-check
/**
 * S1 on the web: a new seller registers a shop and submits KYC from
 * /register-shop, against the E2E backend.
 *
 * The page had a form whose button only reloaded it, and no web screen
 * submitted KYC at all.
 */
const { test, expect } = require('@playwright/test');
const { API, signInCustomer, freshPhone } = require('../helpers/session');

const DHANORI = { latitude: 18.5801, longitude: 73.8991 };

test('[S1.2] a new seller registers a shop, is told what to fix in their KYC, and submits it for review', async ({ page, context }) => {
  const session = await signInCustomer(page, freshPhone(), 'S1 Web Seller');
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation(DHANORI);
  await page.goto('/register-shop');

  const onboarding = page.getByTestId('onboarding');
  const register = onboarding.getByRole('form', { name: 'Register your shop' });
  const shopName = `S1 Web Store ${Date.now().toString().slice(-6)}`;

  // Without a position the shop cannot be placed on the map: refused before sending.
  await register.getByLabel('Shop name').fill(shopName);
  await register.getByLabel('Category').selectOption({ index: 1 });
  await register.getByLabel('Address').fill('Plot 7, Dhanori Road, Pune');
  await register.getByLabel('Pincode').fill('411015');
  await register.getByRole('button', { name: 'Register shop' }).click();
  await expect(register.getByRole('alert')).toContainText('current location');

  await register.getByRole('button', { name: 'Use my current location' }).click();
  await expect(register.getByText(/Location set: 18\.58/)).toBeVisible();
  const created = page.waitForResponse((r) => /\/api\/v1\/shops$/.test(r.url()) && r.request().method() === 'POST');
  await register.getByRole('button', { name: 'Register shop' }).click();
  expect((await created).status()).toBe(201);
  await expect(onboarding.getByRole('heading', { name: shopName })).toBeVisible();
  await expect(onboarding.getByTestId('kyc-status')).toContainText('Not submitted yet');

  // KYC: a malformed PAN is refused beside the field.
  const kyc = onboarding.getByRole('form', { name: 'Submit KYC' });
  await kyc.getByLabel('PAN').fill('ABC123');
  await kyc.getByRole('button', { name: 'Submit KYC' }).click();
  await expect(kyc.getByRole('alert').filter({ hasText: 'ABCDE1234F' })).toBeVisible();

  // Valid details: submitted for review.
  await kyc.getByLabel('PAN').fill('ABCDE1234F');
  await kyc.getByLabel('Bank account number').fill('987654321012');
  await kyc.getByLabel('IFSC').fill('HDFC0001234');
  await kyc.getByLabel('Bank name').fill('HDFC Bank');
  await kyc.getByRole('button', { name: 'Submit KYC' }).click();
  await expect(onboarding.getByTestId('kyc-status')).toContainText('Submitted');

  // The API agrees: the shop is pending verification and its KYC is queued.
  const auth = { Authorization: `Bearer ${session.accessToken}` };
  const mine = await (await page.request.get(`${API}/shops/my-shop`, { headers: auth })).json();
  expect(mine.shop.name).toBe(shopName);
  expect(mine.shop.approval_status).toBe('pending');
  const status = await (await page.request.get(`${API}/shops/${mine.shop.id}/kyc`, { headers: auth })).json();
  expect(status.kyc.kyc_status).toBe('submitted');
});

test('[S1.2] a signed-out visitor is asked to sign in, not shown a form that goes nowhere', async ({ page }) => {
  await page.goto('/register-shop');
  const onboarding = page.getByTestId('onboarding');
  await expect(onboarding.getByRole('link', { name: 'Sign in to continue' })).toBeVisible();
  await expect(onboarding.getByRole('form')).toHaveCount(0);
});
