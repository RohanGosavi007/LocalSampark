// @ts-check
/**
 * C4 and C12 on the web, against the E2E backend (scripts/e2e/fixtures.js:
 * "E2E Glycerine Soap" at "E2E Corner Chemist", MRP ₹50, sizes 75 g and
 * 125 g (+₹20), at most 4 per order, consumer care and best before not given).
 */
const { test, expect } = require('@playwright/test');
const { API, signInCustomer, freshPhone } = require('../helpers/session');

const CHEMIST = 'e2e00000-0000-4000-8000-0000000000d0';
const SOAP = 'e2e00000-0000-4000-8000-0000000000d2';
const LARGE = 'e2e00000-0000-4000-8000-0000000000d5';
const auth = (session) => ({ Authorization: `Bearer ${session.accessToken}` });

test.describe('Product page', () => {
  test('[C4.11] the page states price, MRP and discount, the seller and every declaration, naming the missing ones', async ({ page }) => {
    await page.goto(`/shops/${CHEMIST}/products/${SOAP}`);
    await expect(page.getByRole('heading', { name: 'E2E Glycerine Soap' })).toBeVisible();
    const price = page.getByTestId('product-price');
    await expect(price).toContainText('₹45');
    await expect(price).toContainText('MRP ₹50');
    await expect(price).toContainText('10% off');

    const details = page.getByTestId('legal-details');
    await expect(details.getByRole('row', { name: /Net quantity/ })).toContainText('75 g');
    await expect(details.getByRole('row', { name: /Manufacturer/ })).toContainText('E2E Soaps Pvt Ltd');
    await expect(details.getByRole('row', { name: /Country of origin/ })).toContainText('India');
    await expect(details.getByRole('row', { name: /Consumer care/ })).toContainText('Not provided by the seller');
    await expect(details.getByRole('row', { name: /Best before/ })).toContainText('Not provided by the seller');
    await expect(page.getByTestId('seller')).toContainText('Sold by E2E Corner Chemist');
    await expect(page.getByTestId('seller')).toContainText('Returns within 7 days');

    // At most 4 per order: the + button stops there.
    const more = page.getByRole('button', { name: 'More' });
    for (let i = 0; i < 3; i++) await more.click();
    await expect(page.getByTestId('product-qty')).toHaveText('4');
    await expect(more).toBeDisabled();
  });

  test('[C4.12] a chosen size goes into the cart, and the cart and checkout charge that size\'s price', async ({ page }) => {
    const session = await signInCustomer(page, freshPhone(), 'E2E Size Buyer');
    await page.goto(`/shops/${CHEMIST}/products/${SOAP}`);
    await page.getByRole('radio', { name: /125 g/ }).click();
    await expect(page.getByTestId('product-price')).toContainText('₹65');
    await page.getByRole('button', { name: 'Add to cart' }).click();
    await expect(page.getByRole('status')).toContainText('Added 1');

    await expect.poll(async () => {
      const cart = await (await page.request.get(`${API}/cart`, { headers: auth(session) })).json();
      return cart.cartItems.map((i) => [i.product.name, i.price, i.customOptions && i.customOptions.variantId]);
    }).toEqual([['E2E Glycerine Soap (125 g)', 65, LARGE]]);

    const placed = await page.request.post(`${API}/checkout`, {
      headers: auth(session),
      data: { shopId: CHEMIST, items: [{ productId: SOAP, quantity: 1, variantId: LARGE }], paymentMethod: 'cod', deliveryMode: 'pickup' },
    });
    expect(placed.status()).toBe(201);
    expect(Number((await placed.json()).order.subtotal)).toBe(65);
  });

  test('[C12.11] a saved product is on the wishlist, moves to the cart, and viewed products are listed', async ({ page }) => {
    const session = await signInCustomer(page, freshPhone(), 'E2E Wishlist Buyer');
    await page.goto(`/shops/${CHEMIST}/products/${SOAP}`);
    await page.getByRole('button', { name: '♡ Save' }).click();
    await expect(page.getByRole('button', { name: '♥ Saved' })).toBeVisible();
    await expect.poll(async () => ((await (await page.request.get(`${API}/wishlist`, { headers: auth(session) })).json()).items || []).length).toBe(1);

    await page.goto('/wishlist');
    const saved = page.getByTestId('saved-item');
    await expect(saved).toHaveCount(1);
    await expect(saved).toContainText('E2E Glycerine Soap');
    await expect(page.getByTestId('recent-item').first()).toContainText('E2E Glycerine Soap');

    await saved.getByRole('button', { name: 'Move to cart' }).click();
    await expect(page.getByRole('status')).toContainText('is in your cart');
    await expect(saved).toHaveCount(0);
    const after = await (await page.request.get(`${API}/cart`, { headers: auth(session) })).json();
    expect(after.cartItems.map((i) => i.product.id)).toEqual([SOAP]);
    await expect(page.getByTestId('cart-count')).toHaveText('1');
  });
});
