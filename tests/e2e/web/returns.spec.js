// @ts-check
/**
 * C10 on the web, against the E2E backend: the customer asks to return a
 * delivered order from its page, with a photo, and then sees where the
 * request stands (scripts/e2e/fixtures.js: shopperReturnWeb, delivered 3 h ago).
 */
const { test, expect } = require('@playwright/test');
const { API, signInCustomer } = require('../helpers/session');

const ORDER = 'e2e00000-0000-4000-8000-0000000000f0';
// A 1×1 PNG.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

test('[C10.10] a delivered order can be returned from its page with a photo, and the request is then shown', async ({ page }) => {
  const session = await signInCustomer(page);
  await page.goto(`/order-tracking?id=${ORDER}`);
  await page.getByRole('button', { name: 'Return or replace an item' }).click();

  const form = page.getByRole('form', { name: 'Return request' });
  await form.getByLabel('What went wrong?').selectOption('damaged');
  await form.getByLabel(/Details/).fill('E2E: the box was crushed');
  await form.getByLabel(/Photos/).setInputFiles({ name: 'crushed.png', mimeType: 'image/png', buffer: PNG });
  await form.getByRole('button', { name: 'Send request' }).click();

  await expect(page.getByTestId('return-status')).toContainText('Waiting for the shop to decide');

  const mine = await (await page.request.get(`${API}/orders/returns/mine`, { headers: { Authorization: `Bearer ${session.accessToken}` } })).json();
  const request = mine.data.find((r) => r.order_id === ORDER);
  expect(request).toMatchObject({ status: 'pending_review', reason_code: 'damaged', reason: 'E2E: the box was crushed' });
  expect(request.evidence_urls).toHaveLength(1);
  // The photo was stored and is served.
  const photo = await page.request.get(new URL(request.evidence_urls[0], 'http://localhost:5000').toString());
  expect(photo.ok()).toBeTruthy();

  // A second request for the same order is refused.
  const again = await page.request.post(`${API}/orders/${ORDER}/returns`, {
    headers: { Authorization: `Bearer ${session.accessToken}` }, data: { reasonCode: 'damaged' },
  });
  expect(again.status()).toBe(400);
});
