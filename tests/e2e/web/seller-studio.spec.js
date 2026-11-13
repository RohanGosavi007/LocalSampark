// @ts-check
/**
 * S5, S6 and S7 on the web: the seeded vendor (+919999999992, a grocery shop)
 * in their shop manager, against the E2E backend.
 *
 *   S5  makes a coupon for their shop, switches it off; it never applies at
 *       another shop's checkout.
 *   S6  replies to a customer's review; the reply is what customers see.
 *   S7  the analytics tab shows the shop's real totals from its orders.
 */
const { test, expect } = require('@playwright/test');
const { API, apiSession, signInCustomer, freshPhone } = require('../helpers/session');

const VENDOR = '+919999999992';
const CHEMIST_SHOP = 'e2e00000-0000-4000-8000-0000000000d0'; // another seller's shop

async function openTab(page, name) {
  await page.getByRole('button', { name, exact: true }).click();
}

test.beforeEach(async ({ page }) => {
  await signInCustomer(page, VENDOR);
  await page.goto('/shop-manager/grocery-supermarkets');
  await expect(page.getByRole('button', { name: 'Coupons', exact: true })).toBeVisible();
});

test('[S5.2] a seller makes a coupon for their own shop, and it does not work at another shop', async ({ page }) => {
  const code = `S5WEB${Date.now().toString().slice(-6)}`;
  await openTab(page, 'Coupons');

  const form = page.getByRole('form', { name: 'New coupon' });
  await form.getByLabel('Code').fill(code);
  await form.getByLabel('Discount', { exact: true }).fill('10');
  await form.getByLabel('Minimum order (₹)').fill('100');
  await form.getByRole('button', { name: 'Create coupon' }).click();
  await expect(page.getByRole('status').filter({ hasText: `Coupon ${code} created.` })).toBeVisible();

  const list = page.getByRole('list', { name: 'Your coupons' });
  await expect(list.getByText(code, { exact: true })).toBeVisible();

  // A code already in use is refused, with the server's reason shown.
  await form.getByLabel('Code').fill(code);
  await form.getByLabel('Discount', { exact: true }).fill('5');
  await form.getByRole('button', { name: 'Create coupon' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'already exists' })).toBeVisible();

  // It is this shop's coupon: refused at another shop's checkout.
  const buyer = await apiSession(page.request, freshPhone(), 'S5 Web Buyer');
  const elsewhere = await page.request.post(`${API}/orders/validate-coupon`, {
    headers: { Authorization: `Bearer ${buyer.accessToken}` },
    data: { code, cartTotal: 500, shopId: CHEMIST_SHOP },
  });
  expect(elsewhere.status()).toBe(400);
  expect((await elsewhere.json()).code).toBe('SHOP_MISMATCH');

  // Switched off, it is shown as off.
  await list.getByRole('button', { name: `Switch off ${code}` }).click();
  await expect(page.getByRole('status').filter({ hasText: `Coupon ${code} switched off.` })).toBeVisible();
  await expect(list.getByRole('button', { name: `Switch on ${code}` })).toBeVisible();
});

test('[S6.2] a seller replies to a customer review and the reply is what customers see', async ({ page }) => {
  await openTab(page, 'Reviews');
  // The customer's words and name are shown (the screen read fields the API never sent).
  await expect(page.getByText('E2E reported review: call 98xxxxxx for cheaper stock')).toBeVisible();
  const reply = `Thanks for telling us — ${Date.now()}`;

  await page.getByRole('button', { name: 'Reply to Customer' }).first().click();
  await page.getByLabel('Your reply').fill(reply);
  const saved = page.waitForResponse((r) => /\/my-shop\/reviews\/[^/]+\/reply$/.test(r.url()) && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Post Reply' }).click();
  expect((await saved).status()).toBe(200);
  await expect(page.getByText(reply)).toBeVisible();

  // Customers see the same reply on the shop's public reviews.
  const vendor = await apiSession(page.request, VENDOR);
  const mine = await page.request.get(`${API}/shops/my-shop/dashboard`, { headers: { Authorization: `Bearer ${vendor.accessToken}` } });
  const shopId = ((await mine.json()).shop || {}).id;
  const pub = await (await page.request.get(`${API}/shops/${shopId}/reviews`)).json();
  const reviews = pub.reviews || pub.data || [];
  expect(reviews.some((r) => r.reply === reply)).toBeTruthy();
});

test('[S7.2] the analytics tab shows the shop\'s real totals', async ({ page }) => {
  const vendor = await apiSession(page.request, VENDOR);
  const res = await page.request.get(`${API}/shops/my-shop/analytics-data`, { headers: { Authorization: `Bearer ${vendor.accessToken}` } });
  expect(res.ok()).toBeTruthy();
  const { analytics } = await res.json();
  // The fixtures give this shop delivered orders; the totals must reflect them.
  expect(analytics.orders).toBeGreaterThan(0);
  expect(analytics.revenue).toBeGreaterThan(0);

  await openTab(page, 'Analytics');
  await expect(page.getByTestId('kpi-revenue')).toHaveText(`₹${analytics.revenue.toLocaleString()}`);
  await expect(page.getByTestId('kpi-orders')).toHaveText(String(analytics.orders));
  await expect(page.getByTestId('kpi-conversion')).toHaveText(`${analytics.conversion}%`);
  // Not tracked: shown as unknown, never as a made-up number.
  await expect(page.getByTestId('kpi-views')).toHaveText('—');
});
