// @ts-check
/**
 * C13 on the web, against the E2E backend: placing an order puts a
 * notification in the customer's inbox that opens the order, and the
 * customer's settings are saved on the server.
 */
const { test, expect } = require('@playwright/test');
const { API, signInCustomer, freshPhone } = require('../helpers/session');

const SOAP = 'e2e00000-0000-4000-8000-0000000000d2'; // E2E Corner Chemist
const auth = (session) => ({ Authorization: `Bearer ${session.accessToken}` });

async function placeOrder(page, session) {
  const cart = await page.request.get(`${API}/cart`, { headers: auth(session) });
  expect(cart.ok()).toBeTruthy();
  const shopId = 'e2e00000-0000-4000-8000-0000000000d0';
  const res = await page.request.post(`${API}/checkout`, {
    headers: auth(session),
    data: { shopId, items: [{ productId: SOAP, quantity: 1 }], paymentMethod: 'cod', deliveryMode: 'pickup' },
  });
  expect(res.status(), await res.text()).toBe(201);
  return (await res.json()).order.id;
}

test.describe('Notifications', () => {
  test('[C13.13] an order\'s notification is in the inbox, opens the order, and is then read', async ({ page }) => {
    const session = await signInCustomer(page, freshPhone(), 'E2E Notified Buyer');
    const orderId = await placeOrder(page, session);

    await page.goto('/notifications');
    const item = page.getByTestId('notification').filter({ hasText: 'Order placed' });
    await expect(item).toHaveCount(1, { timeout: 15000 });
    await expect(item).toHaveAttribute('data-read', 'false');
    await expect(item).toContainText(orderId.slice(0, 8).toUpperCase());

    await item.click();
    await page.waitForURL((url) => url.pathname === '/order-tracking' && url.searchParams.get('id') === orderId);
    await expect(page.getByRole('button', { name: 'Cancel order' })).toBeVisible();

    await page.goto('/notifications');
    await expect(page.getByTestId('notification').filter({ hasText: 'Order placed' })).toHaveAttribute('data-read', 'true');
  });

  test('[C13.14] turning off offers is saved for the customer and shown again on return', async ({ page }) => {
    const session = await signInCustomer(page, freshPhone(), 'E2E Settings Buyer');
    await page.goto('/notifications');
    const offers = page.getByRole('switch', { name: 'Offers and promotions' });
    await expect(offers).toBeChecked();
    await offers.click();
    await expect(offers).not.toBeChecked();

    await expect.poll(async () => (await (await page.request.get(`${API}/notifications/preferences`, { headers: auth(session) })).json()).preferences)
      .toEqual({ orderUpdates: true, promotions: false, push: true, email: true });

    await page.reload();
    await expect(page.getByRole('switch', { name: 'Offers and promotions' })).not.toBeChecked();
    await expect(page.getByRole('switch', { name: 'Order updates' })).toBeChecked();
  });
});
