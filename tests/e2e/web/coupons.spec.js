// @ts-check
/**
 * C7 on the web, against the E2E backend: a coupon applied at checkout is
 * priced by the server, shown on the bill, and charged on the order; one that
 * does not exist is reported and the order is not placed with it.
 */
const { test, expect } = require('@playwright/test');
const { API, signInCustomer, freshPhone } = require('../helpers/session');

const RICE = 'e2e00000-0000-4000-8000-0000000000d3'; // seeded vendor's shop; pickup only
const auth = (session) => ({ Authorization: `Bearer ${session.accessToken}` });

test('[C7.18] a coupon at checkout comes off the bill and the order', async ({ page }) => {
  const session = await signInCustomer(page, freshPhone(), 'E2E Coupon Buyer');
  expect((await page.request.post(`${API}/cart`, { headers: auth(session), data: { productId: RICE, quantity: 2 } })).ok()).toBeTruthy();

  await page.goto('/checkout');
  await page.getByRole('button', { name: 'Proceed to Fulfillment' }).click();
  await page.getByRole('button', { name: 'Self Pickup' }).click();
  await page.getByRole('button', { name: 'Proceed to Payment' }).click();
  await page.locator('input[value="COD"]').check();
  const place = page.getByRole('button', { name: /Place Order/ });
  await expect(place).toBeEnabled();
  const before = Number((await place.innerText()).replace(/[^0-9.]/g, ''));

  // A code that does not exist: said so, and the order is not placed with it.
  await page.getByLabel('Coupon code').fill('nosuchcode');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByTestId('coupon-applied')).toContainText('Invalid or expired coupon code');
  await place.click();
  await expect(page.getByRole('alert')).toContainText('Remove the coupon');
  await page.getByRole('button', { name: 'Remove coupon NOSUCHCODE' }).click();

  await page.getByLabel('Coupon code').fill('e2eflat20');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByTestId('coupon-applied')).toContainText('E2EFLAT20 applied: you save ₹20.00');
  await expect(page.getByText('−₹20.00')).toBeVisible();
  await expect.poll(async () => Number((await place.innerText()).replace(/[^0-9.]/g, ''))).toBeCloseTo(before - 20, 2);

  const [sent] = await Promise.all([
    page.waitForRequest((r) => r.url().endsWith('/api/v1/checkout') && r.method() === 'POST'),
    place.click(),
  ]);
  expect(JSON.parse(sent.postData() || '{}').couponCode).toBe('E2EFLAT20');
  await expect(page.getByRole('heading', { name: 'Order Confirmed!' })).toBeVisible();

  const orders = await page.request.get(`${API}/orders/user/${session.user.id}`, { headers: auth(session) });
  expect(orders.ok()).toBeTruthy();
  const body = await orders.json();
  const list = Array.isArray(body) ? body : (body.data || body.orders || []);
  expect(list.length).toBeGreaterThan(0);
  expect(Number(list[0].discount)).toBe(20);
  expect(Number(list[0].total_amount)).toBeCloseTo(before - 20, 2);
});
