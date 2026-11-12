// @ts-check
/**
 * C9: the customer's orders on the web, against the E2E fixture backend
 * (scripts/e2e/fixtures.js gives the shopper a delivered, a confirmed, a
 * preparing and a second confirmed order).
 */
const { test, expect } = require('@playwright/test');
const { API, signInCustomer } = require('../helpers/session');

const ORDERS = {
  delivered: 'e2e00000-0000-4000-8000-0000000000b1',
  confirmed: 'e2e00000-0000-4000-8000-0000000000c1',
  preparing: 'e2e00000-0000-4000-8000-0000000000c5',
  live: 'e2e00000-0000-4000-8000-0000000000c6',
};
const short = (id) => id.slice(0, 8);

async function adminToken(request) {
  const res = await request.post(`${API}/admin-auth/login`, {
    data: { phoneNumber: '+919999999991', pin: '123456', otp: '123456' },
  });
  expect(res.ok(), `admin login ${res.status()}`).toBeTruthy();
  return (await res.json()).accessToken;
}

test.describe('My orders', () => {
  test('[C9.10] the order list shows the customer\'s own orders with their status', async ({ page }) => {
    await signInCustomer(page);
    await page.goto('/order-tracking');
    // Fixture ids share a prefix, so entries are identified by their links.
    for (const id of Object.values(ORDERS)) {
      await expect(page.locator(`a[href="/order-tracking?id=${id}"]`)).toBeVisible();
    }
    await expect(page.locator('a[href="/order-tracking?id=' + ORDERS.delivered + '"]')).toContainText('Delivered');
    // Another customer's fixture order is not listed.
    await expect(page.locator('a[href="/order-tracking?id=e2e00000-0000-4000-8000-000000000001"]')).toHaveCount(0);
  });

  test('[C9.11] a confirmed order can be cancelled, and the server agrees', async ({ page }) => {
    const session = await signInCustomer(page);
    page.on('dialog', (d) => d.accept());
    await page.goto(`/order-tracking?id=${ORDERS.confirmed}`);
    await page.getByRole('button', { name: 'Cancel order' }).click();
    await expect(page.getByTestId('order-notice')).toContainText('cancelled');
    await expect(page.getByText('This order was cancelled.')).toBeVisible();
    const order = (await (await page.request.get(`${API}/orders/${ORDERS.confirmed}`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    })).json()).order;
    expect(order.status).toBe('cancelled');
  });

  test('[C9.12] past the cancellation window there is no cancel button, and the server refuses', async ({ page }) => {
    const session = await signInCustomer(page);
    await page.goto(`/order-tracking?id=${ORDERS.preparing}`);
    await expect(page.getByRole('button', { name: 'Download invoice' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel order' })).toHaveCount(0);
    const refused = await page.request.put(`${API}/orders/${ORDERS.preparing}/status`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      data: { status: 'cancelled' },
    });
    expect(refused.ok()).toBe(false);
    expect((await refused.json()).error).toMatch(/preparing/i);
  });

  test('[C9.13] the GST invoice downloads as a PDF', async ({ page }) => {
    await signInCustomer(page);
    await page.goto(`/order-tracking?id=${ORDERS.delivered}`);
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Download invoice' }).click(),
    ]);
    expect(download.suggestedFilename()).toBe(`Invoice-${short(ORDERS.delivered).toUpperCase()}.pdf`);
    const bytes = require('fs').readFileSync(await download.path());
    expect(bytes.subarray(0, 4).toString()).toBe('%PDF');
    expect(bytes.length).toBeGreaterThan(1000);
  });

  test('[C9.14] order again puts the same items in the cart at today\'s price', async ({ page, request }) => {
    const session = await signInCustomer(page);
    const order = (await (await page.request.get(`${API}/orders/${ORDERS.delivered}`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    })).json());
    const item = order.items[0];
    const products = await (await request.get(`${API}/shops/${order.order.shop_id}/products`)).json();
    const now = products.find((p) => String(p.id) === String(item.product_id));

    await page.goto(`/order-tracking?id=${ORDERS.delivered}`);
    await page.getByRole('button', { name: 'Order again' }).click();
    await page.waitForURL(/\/checkout/);
    const cart = await page.evaluate(() => JSON.parse(localStorage.getItem('localsampark-cart') || '{}'));
    const line = (cart.state && cart.state.items || []).find((i) => String(i.id) === String(item.product_id));
    expect(line, `cart holds ${item.name}`).toBeTruthy();
    expect(Number(line.price)).toBe(Number(now.price));
    expect(line.quantity).toBe(Number(item.quantity));
    await expect(page.getByText(item.name).first()).toBeVisible();
  });

  test('[C9.15] a status change made elsewhere appears without reloading the page', async ({ page, request }) => {
    await signInCustomer(page);
    await page.goto(`/order-tracking?id=${ORDERS.live}`);
    await expect(page.getByRole('button', { name: 'Cancel order' })).toBeVisible();

    const token = await adminToken(request);
    const moved = await request.put(`${API}/orders/${ORDERS.live}/status`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { status: 'preparing' },
    });
    expect(moved.ok(), await moved.text()).toBeTruthy();

    // Live socket, or the 15 s polling fallback: either way, no reload.
    await expect(page.getByRole('button', { name: 'Cancel order' })).toHaveCount(0, { timeout: 30000 });
  });
});

test.describe('Live rider position (R4)', () => {
  const RIDING = 'e2e00000-0000-4000-8000-0000000000c7';

  test('[R4.40] the customer follows the rider: last known position, then each update the rider sends, without a reload', async ({ page, playwright }) => {
    const { apiSession } = require('../helpers/session');
    await signInCustomer(page);
    await page.goto(`/order-tracking?id=${RIDING}`);

    const panel = page.getByTestId('rider-live');
    await expect(panel).toBeVisible({ timeout: 30000 });

    // The rider's app reports a position about 2 km out, for this order.
    const riderApi = await playwright.request.newContext();
    try {
      const rider = await apiSession(riderApi, '+919999999994');
      const auth = { Authorization: `Bearer ${rider.accessToken}` };
      const far = await riderApi.post(`${API}/delivery/location`, { headers: auth, data: { latitude: 18.5970, longitude: 73.8970, orderId: RIDING } });
      expect(far.status(), await far.text()).toBe(200);
      await expect(page.getByTestId('rider-distance')).toContainText('2 km from you', { timeout: 30000 });

      // ...and moves closer; the page follows (live socket, no reload).
      const near = await riderApi.post(`${API}/delivery/location`, { headers: auth, data: { latitude: 18.5800, longitude: 73.8970, orderId: RIDING } });
      expect(near.status()).toBe(200);
      await expect(page.getByTestId('rider-distance')).toContainText('0.1 km from you', { timeout: 30000 });
      await expect(page.getByTestId('rider-map-link')).toHaveAttribute('href', /mlat=18\.58&mlon=73\.897/);
    } finally {
      await riderApi.dispose();
    }
  });
});
