// @ts-check
/**
 * C8 on the web, against the E2E backend: the checkout prices from the server,
 * places the order with an Idempotency-Key, and a repeated request returns the
 * order already placed instead of a second one.
 */
const { test, expect } = require('@playwright/test');
const { API, signInCustomer, freshPhone } = require('../helpers/session');

const RICE = 'e2e00000-0000-4000-8000-0000000000d3'; // seeded vendor's shop; pickup only, no published hours
const SOAP = 'e2e00000-0000-4000-8000-0000000000d2'; // E2E Corner Chemist, open all day
const auth = (session) => ({ Authorization: `Bearer ${session.accessToken}` });

test.describe('Checkout', () => {
  test('[C8.8] an order is placed with an Idempotency-Key; sending it again returns the same order', async ({ page }) => {
    const session = await signInCustomer(page, freshPhone(), 'E2E Checkout Buyer');
    const added = await page.request.post(`${API}/cart`, { headers: auth(session), data: { productId: RICE, quantity: 2 } });
    expect(added.ok()).toBeTruthy();

    await page.goto('/checkout');
    await expect(page.getByTestId('cart-shop-group')).toHaveCount(1);
    await page.getByRole('button', { name: 'Proceed to Fulfillment' }).click();
    await page.getByRole('button', { name: 'Self Pickup' }).click();
    await page.getByRole('button', { name: 'Proceed to Payment' }).click();
    await page.locator('input[value="COD"]').check();

    const place = page.getByRole('button', { name: /Place Order/ });
    const shown = Number((await place.innerText()).replace(/[^0-9.]/g, ''));
    const [sent] = await Promise.all([
      page.waitForRequest((r) => r.url().endsWith('/api/v1/checkout') && r.method() === 'POST'),
      place.click(),
    ]);
    const key = sent.headers()['idempotency-key'];
    expect(key, 'the checkout sends an Idempotency-Key').toMatch(/^[A-Za-z0-9_\-:.]{8,128}$/);

    await expect(page.getByRole('heading', { name: 'Order Confirmed!' })).toBeVisible();
    const [orderId] = await page.getByTestId('confirmed-order-id').allInnerTexts();

    // The same request again, as a client retrying after a lost answer would.
    const again = await page.request.post(sent.url(), {
      headers: { ...auth(session), 'Content-Type': 'application/json', 'Idempotency-Key': key },
      data: sent.postDataJSON(),
    });
    expect(again.status()).toBe(201);
    expect(again.headers()['idempotent-replayed']).toBe('true');
    expect((await again.json()).order.id).toBe(orderId);

    const mine = (await (await page.request.get(`${API}/orders/my-orders`, { headers: auth(session) })).json()).data;
    expect(mine.map((o) => o.id)).toEqual([orderId]);
    // The total the page asked for is the total of the order.
    expect(Number(mine[0].total_amount)).toBeCloseTo(shown, 2);
  });

  test('[C8.9] the bill on the page is the server\'s quote, and cash is the default for a new customer', async ({ page }) => {
    const session = await signInCustomer(page, freshPhone(), 'E2E Quote Viewer');
    await page.request.post(`${API}/cart`, { headers: auth(session), data: { productId: RICE, quantity: 3 } });
    const quote = await (await page.request.post(`${API}/checkout/quote`, {
      data: { shopId: (await (await page.request.get(`${API}/cart`, { headers: auth(session) })).json()).cartItems[0].product.shop.id,
        items: [{ productId: RICE, quantity: 3 }], deliveryMode: 'pickup' },
    })).json();
    expect(quote.success).toBe(true);

    await page.goto('/checkout');
    await page.getByRole('button', { name: 'Proceed to Fulfillment' }).click();
    await page.getByRole('button', { name: 'Self Pickup' }).click();
    await expect(page.getByText(`₹${Number(quote.bill.total).toFixed(2)}`).first()).toBeVisible();
    await page.getByRole('button', { name: 'Proceed to Payment' }).click();
    await expect(page.locator('input[value="COD"]')).toBeChecked();
  });

  test('[C8.19] a time slot can be chosen instead of ASAP, and the order keeps it', async ({ page }) => {
    const session = await signInCustomer(page, freshPhone(), 'E2E Slot Buyer');
    await page.request.post(`${API}/cart`, { headers: auth(session), data: { productId: SOAP, quantity: 1 } });

    await page.goto('/checkout');
    await page.getByRole('button', { name: 'Proceed to Fulfillment' }).click();
    await page.getByRole('button', { name: 'Self Pickup' }).click();
    const times = page.getByTestId('delivery-time').getByRole('radio');
    await expect(times.first()).toHaveText('As soon as possible');
    await expect(times.first()).toHaveAttribute('aria-checked', 'true');
    const slot = times.nth(2);
    const label = (await slot.innerText()).trim();
    expect(label).toMatch(/^(Today|Tomorrow) \d{2}:\d{2}–\d{2}:\d{2}$/);
    await slot.click();
    await expect(slot).toHaveAttribute('aria-checked', 'true');

    await page.getByRole('button', { name: 'Proceed to Payment' }).click();
    await page.locator('input[value="COD"]').check();
    await page.getByRole('button', { name: /Place Order/ }).click();
    await expect(page.getByTestId('confirmed-slot')).toHaveText(label);
    const [orderId] = await page.getByTestId('confirmed-order-id').allInnerTexts();

    const order = (await (await page.request.get(`${API}/orders/${orderId}`, { headers: auth(session) })).json()).order;
    expect(order.scheduled_for, 'the order keeps the slot').toBeTruthy();
    // India time of the stored start is the time the page showed.
    const start = new Date(Date.parse(order.scheduled_for) + 330 * 60000);
    const hhmm = `${String(start.getUTCHours()).padStart(2, '0')}:${String(start.getUTCMinutes()).padStart(2, '0')}`;
    expect(label).toContain(`${hhmm}–`);
  });
});
