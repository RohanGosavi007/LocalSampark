// @ts-check
/**
 * C11 on the web, against the E2E backend: a customer reviews a delivered
 * order, the review shows on the shop as a verified purchase, and someone
 * without an order from the shop cannot review it.
 */
const { test, expect } = require('@playwright/test');
const { API, signInCustomer, freshPhone } = require('../helpers/session');

const DELIVERED = 'e2e00000-0000-4000-8000-0000000000b1'; // the shopper's delivered order
const auth = (session) => ({ Authorization: `Bearer ${session.accessToken}` });

test.describe('Reviews', () => {
  test('[C11.8] a delivered order can be reviewed; the review shows on the shop as a verified purchase', async ({ page }) => {
    const session = await signInCustomer(page);
    await page.goto(`/order-tracking?id=${DELIVERED}`);
    const form = page.getByRole('form', { name: /Rate/ });
    await form.getByRole('radio', { name: '4 stars' }).click();
    const text = `E2E review ${Date.now()}`;
    await form.getByRole('textbox').fill(text);
    await form.getByRole('button', { name: 'Publish review' }).click();
    await expect(page.getByTestId('review-notice')).toContainText('verified purchase');

    const order = (await (await page.request.get(`${API}/orders/${DELIVERED}`, { headers: auth(session) })).json()).order;
    const listed = await (await page.request.get(`${API}/shops/${order.shop_id}/reviews`)).json();
    const mine = listed.data.find((r) => r.review_text === text);
    expect(mine).toMatchObject({ rating: 4, verified_purchase: true });

    await page.goto(`/shops/${order.shop_id}`);
    await expect(page.getByText(text)).toBeVisible();
  });

  test('[C11.9] someone the shop has not served cannot review it', async ({ page }) => {
    const session = await signInCustomer(page, freshPhone(), 'E2E Not A Buyer');
    const shop = 'e2e00000-0000-4000-8000-0000000000d0';
    const res = await page.request.post(`${API}/shops/${shop}/reviews`, { headers: auth(session), data: { rating: 5, review_text: 'Never bought here' } });
    expect(res.status()).toBe(403);
    expect((await res.json()).code).toBe('NOT_VERIFIED_PURCHASE');
    const listed = await (await page.request.get(`${API}/shops/${shop}/reviews`)).json();
    expect(listed.data.some((r) => r.review_text === 'Never bought here')).toBe(false);
  });
});
