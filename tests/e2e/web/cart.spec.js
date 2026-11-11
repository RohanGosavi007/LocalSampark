// @ts-check
/**
 * C6 / D6 on the web, against the E2E backend: a cart that follows the
 * customer, holds several shops, survives signing in, and checks out as one
 * order per shop. Fixture products (scripts/e2e/fixtures.js):
 *   vendorRice  in the seeded vendor's shop, tracked stock
 *   chemistSoap in "E2E Corner Chemist", stock not tracked
 * Each test uses a customer of its own, so parallel specs cannot share a cart.
 */
const { test, expect } = require('@playwright/test');
const { API, apiSession, signInCustomer, freshPhone } = require('../helpers/session');

const RICE = 'e2e00000-0000-4000-8000-0000000000d3';
const SOAP = 'e2e00000-0000-4000-8000-0000000000d2';
const CHEMIST = 'E2E Corner Chemist';

const auth = (session) => ({ Authorization: `Bearer ${session.accessToken}` });

/** Puts a line in the customer's server cart, as the app would. */
async function addToServerCart(request, session, productId, quantity) {
  const res = await request.post(`${API}/cart`, { headers: auth(session), data: { productId, quantity } });
  expect(res.ok(), `cart add ${res.status()} ${await res.text()}`).toBeTruthy();
}

const serverCart = async (request, session) => (await (await request.get(`${API}/cart`, { headers: auth(session) })).json());

test.describe('Cart', () => {
  test('[C6.20] a cart filled in the app is on the web, grouped by shop', async ({ page }) => {
    const session = await signInCustomer(page, freshPhone(), 'E2E Cart Viewer');
    await addToServerCart(page.request, session, RICE, 2);
    await addToServerCart(page.request, session, SOAP, 1);

    await page.goto('/checkout');
    const groups = page.getByTestId('cart-shop-group');
    await expect(groups).toHaveCount(2);
    await expect(page.getByTestId('multi-shop-note')).toContainText('2 shops');
    const chemist = groups.filter({ hasText: CHEMIST });
    await expect(chemist).toContainText('E2E Glycerine Soap');
    await expect(groups.filter({ hasText: 'E2E Basmati Rice 1kg' })).toContainText('x 2');
  });

  test('[C6.21] two shops check out together: one order per shop, one payment, and the cart is emptied', async ({ page }) => {
    const session = await signInCustomer(page, freshPhone(), 'E2E Cart Buyer');
    await addToServerCart(page.request, session, RICE, 2);
    await addToServerCart(page.request, session, SOAP, 1);

    await page.goto('/checkout');
    await expect(page.getByTestId('cart-shop-group')).toHaveCount(2);
    await page.getByRole('button', { name: 'Proceed to Fulfillment' }).click();
    await page.getByRole('button', { name: 'Self Pickup' }).click();
    await page.getByRole('button', { name: 'Proceed to Payment' }).click();

    // One gateway payment settles one order, so not offered for two shops.
    await expect(page.locator('input[value="RAZORPAY"]')).toHaveCount(0);
    await expect(page.locator('input[value="COD"]')).toBeChecked();
    const place = page.getByRole('button', { name: /Place Order/ });
    const shown = Number((await place.innerText()).replace(/[^0-9.]/g, ''));
    await place.click();

    await expect(page.getByRole('heading', { name: 'Order Confirmed!' })).toBeVisible();
    const ids = await page.getByTestId('confirmed-order-id').allInnerTexts();
    expect(ids).toHaveLength(2);

    const mine = (await (await page.request.get(`${API}/orders/my-orders`, { headers: auth(session) })).json()).data;
    expect(mine.map((o) => o.id).sort()).toEqual([...ids].sort());
    expect(new Set(mine.map((o) => o.shop_name)).size).toBe(2);
    expect(mine.map((o) => o.shop_name)).toContain(CHEMIST);
    // What the page showed is what the orders add up to.
    expect(mine.reduce((sum, o) => sum + Number(o.total_amount), 0)).toBeCloseTo(shown, 2);

    await expect.poll(async () => (await serverCart(page.request, session)).cartItems.length).toBe(0);
  });

  test('[C6.22] a guest\'s cart is kept through signing in on the login page', async ({ page, request }) => {
    const phone = freshPhone();
    await apiSession(request, phone, 'E2E Cart Guest'); // an account to sign in to
    const guestSession = `e2e-guest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // As a guest: the soap is in the cart on this browser and on the server
    // under the guest session, as the cart's own sync leaves it.
    await page.goto('/');
    await page.evaluate(({ sid, soap }) => {
      localStorage.setItem('localsampark_tour_seen', 'true');
      localStorage.setItem('localsampark_consent', 'accepted');
      localStorage.setItem('localsampark-cart', JSON.stringify({
        state: {
          items: [{ id: soap, name: 'E2E Glycerine Soap', price: 45, quantity: 3, options: {}, shop_id: 'e2e00000-0000-4000-8000-0000000000d0', shop_name: 'E2E Corner Chemist' }],
          sessionId: sid, signedIn: false,
        },
        version: 0,
      }));
    }, { sid: guestSession, soap: SOAP });
    const guestAdd = await request.post(`${API}/cart`, {
      headers: { 'X-Session-Id': guestSession },
      data: { sessionId: guestSession, productId: SOAP, quantity: 3, customOptions: {} },
    });
    expect(guestAdd.ok()).toBeTruthy();

    // Sign in through the page.
    await page.goto('/login');
    await page.getByRole('button', { name: /Phone OTP/ }).click();
    await page.locator('#phone').fill(phone);
    const [sent] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/auth/send-otp') && r.request().method() === 'POST'),
      page.getByRole('button', { name: /Send OTP/ }).click(),
    ]);
    const code = (await sent.json()).otp;
    expect(code, 'the E2E backend returns the code it issued').toBeTruthy();
    await page.locator('#otp').fill(String(code));
    await page.getByRole('button', { name: 'Verify & Sign in' }).click();
    await page.waitForURL((url) => !url.pathname.startsWith('/login'));

    // The session the login page stored (asking for another code would only
    // spend the number's OTP allowance).
    const session = { accessToken: await page.evaluate(() => localStorage.getItem('auth_token')) };
    expect(session.accessToken).toBeTruthy();
    await expect.poll(async () => (await serverCart(request, session)).cartItems.map((i) => [i.product.id, i.quantity]))
      .toEqual([[SOAP, 3]]);

    await page.goto('/checkout');
    await expect(page.getByTestId('cart-shop-group')).toHaveCount(1);
    await expect(page.getByText('E2E Glycerine Soap')).toBeVisible();
    // Merged once: the quantity was not doubled by the reload after sign-in.
    await expect(page.getByText('₹45 x 3')).toBeVisible();
  });
});
