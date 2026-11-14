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
const { API, apiSession, installSession, freshPhone } = require('../helpers/session');

const VENDOR = '+919999999992';
const CHEMIST_SHOP = 'e2e00000-0000-4000-8000-0000000000d0'; // another seller's shop

async function openTab(page, name) {
  await page.getByRole('button', { name, exact: true }).click();
}

// The API rate-limits OTP codes per phone number, so the vendor signs in ONCE
// for the whole file and every test reuses that session.
let vendor;

test.beforeEach(async ({ page }) => {
  if (!vendor) vendor = await apiSession(page.request, VENDOR);
  await installSession(page, vendor);
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
  const mine = await page.request.get(`${API}/shops/my-shop/dashboard`, { headers: { Authorization: `Bearer ${vendor.accessToken}` } });
  const shopId = ((await mine.json()).shop || {}).id;
  const pub = await (await page.request.get(`${API}/shops/${shopId}/reviews`)).json();
  const reviews = pub.reviews || pub.data || [];
  expect(reviews.some((r) => r.reply === reply)).toBeTruthy();
});

test('[S7.2] the analytics tab shows the shop\'s real totals', async ({ page }) => {
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

test("[S4.2] the ledger shows the shop's real earnings and how settlement works, with no fake payout request", async ({ page }) => {
  const res = await page.request.get(`${API}/shops/my-shop/ledger`, { headers: { Authorization: `Bearer ${vendor.accessToken}` } });
  expect(res.ok()).toBeTruthy();
  const { ledger } = await res.json();
  // The fixtures give this shop delivered orders: the ledger is not empty.
  expect(ledger.grossSales).toBeGreaterThan(0);
  expect(ledger.transactions.length).toBeGreaterThan(0);

  await openTab(page, 'Ledger');
  const inr = (n) => (Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  await expect(page.getByTestId('ledger-gross')).toHaveText(`₹${inr(ledger.grossSales)}`);
  await expect(page.getByTestId('ledger-net')).toHaveText(`₹${inr(ledger.netPayout)}`);
  await expect(page.getByTestId('ledger-pending')).toHaveText(`₹${inr(ledger.pendingPayouts)}`);
  await expect(page.getByTestId('settlement-note')).toContainText('there is nothing to request');

  // The button that reported a withdrawal it never made is gone.
  await expect(page.getByRole('button', { name: /Request Payout|Withdraw/ })).toHaveCount(0);
});

const RICE = 'e2e00000-0000-4000-8000-0000000000d3'; // the vendor's rice: sold for pickup only

/** A customer places a cash pickup order at the vendor's shop; returns its id. */
async function placePickupOrder(page) {
  const auth = { Authorization: `Bearer ${vendor.accessToken}` };
  const shopId = ((await (await page.request.get(`${API}/shops/my-shop/dashboard`, { headers: auth })).json()).shop || {}).id;
  const buyer = await apiSession(page.request, freshPhone(), 'S3 Web Buyer');
  const placed = await page.request.post(`${API}/checkout`, {
    headers: { Authorization: `Bearer ${buyer.accessToken}` },
    data: { shopId, items: [{ productId: RICE, quantity: 1 }], paymentMethod: 'cod', deliveryMode: 'pickup' },
  });
  expect(placed.status()).toBe(201);
  return (await placed.json()).order.id;
}

const card = (page, id) => page.getByTestId(`order-${id}`);
// The panel keeps ONE expanded order across tabs, so a card moved from "New"
// to "Accepted" is already open: expand it only when it is not.
async function openCard(page, id) {
  await expect(card(page, id)).toBeVisible();
  const open = await card(page, id).getByText('Order Items').isVisible();
  if (!open) await card(page, id).getByText(`#${id.slice(0, 8).toUpperCase()}`).click();
  await expect(card(page, id).getByText('Order Items')).toBeVisible();
}

test('[S3.4] a seller moves a pickup order from new to handed over, and prints its packing slip', async ({ page }) => {
  const id = await placePickupOrder(page);
  await openTab(page, 'Orders');

  // New → accepted.
  await expect(card(page, id)).toBeVisible();
  await expect(card(page, id)).toContainText('Pickup');
  await openCard(page, id);
  await card(page, id).getByRole('button', { name: /^Accept/ }).click();
  await expect(card(page, id)).toHaveCount(0);

  // Accepted: the next step is Start Preparing. It used to show "Accept" again
  // (the order came back as "confirmed", which the panel did not know), so the
  // seller could not go any further.
  await page.getByRole('button', { name: /^Accepted/ }).click();
  await expect(card(page, id)).toBeVisible();
  await openCard(page, id);
  await expect(card(page, id).getByRole('button', { name: /^Accept$/ })).toHaveCount(0);
  await card(page, id).getByRole('button', { name: /^Start Preparing/ }).click();

  await page.getByRole('button', { name: /^Preparing/ }).click();
  await openCard(page, id);
  await card(page, id).getByRole('button', { name: /^Mark Ready/ }).click();

  // Ready: a pickup order is handed over, never "out for delivery".
  await page.getByRole('button', { name: /^Ready/ }).click();
  await openCard(page, id);
  await expect(card(page, id).getByRole('button', { name: /Out for Delivery/ })).toHaveCount(0);

  // The packing slip is the order's own, in the 80 mm text format.
  await card(page, id).getByRole('button', { name: 'Packing slip' }).click();
  const slip = page.getByTestId('packing-slip');
  await expect(slip).toBeVisible();
  const text = await slip.innerText();
  expect(text.split('\n').every((l) => l.length <= 48)).toBeTruthy();
  expect(text).toContain(id.slice(0, 8).toUpperCase());

  await card(page, id).getByRole('button', { name: /^Mark Handed Over/ }).click();
  const auth = { Authorization: `Bearer ${vendor.accessToken}` };
  const delivered = await (await page.request.get(`${API}/shops/my-shop/orders?status=delivered&limit=50`, { headers: auth })).json();
  expect(delivered.orders.map((o) => o.id)).toContain(id);
});

test('[S3.5] a change the server refuses is shown to the seller, not swallowed', async ({ page }) => {
  const id = await placePickupOrder(page);
  const auth = { Authorization: `Bearer ${vendor.accessToken}` };
  const move = (status) => page.request.put(`${API}/shops/my-shop/orders/${id}/status`, { headers: auth, data: { status } });
  expect((await move('confirmed')).ok()).toBeTruthy();

  await openTab(page, 'Orders');
  await page.getByRole('button', { name: /^Accepted/ }).click();
  await openCard(page, id);

  // The order is cancelled elsewhere while this screen is still open.
  expect((await move('cancelled')).ok()).toBeTruthy();
  await card(page, id).getByRole('button', { name: /^Start Preparing/ }).click();

  await expect(page.getByRole('alert').filter({ hasText: /Invalid transition|cancelled/i })).toBeVisible();
  await expect(card(page, id)).toBeVisible(); // still on screen: nothing pretended to succeed
});

test('[S2.8] a seller adds a product, adds options with their own price and stock, unlists it, and refusals are explained', async ({ page }) => {
  const name = `S2 Web Tea ${Date.now().toString().slice(-6)}`;
  // The shop page caches its data for 5 minutes and the SEO spec compares it with
  // the products API, so a test that leaves a product in the pilot shop breaks that
  // spec. The product is removed at the end, whatever happens.
  try {
  await openTab(page, 'Products');

  // A product with no price is refused (it used to be created free).
  const form = page.getByRole('form', { name: 'New product' });
  await form.getByLabel('Product name').fill(name);
  await form.getByRole('button', { name: 'Add product' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'price' })).toBeVisible();

  await form.getByLabel('Price (₹)').fill('100');
  await form.getByLabel('Stock').fill('20');
  await form.getByRole('button', { name: 'Add product' }).click();
  await expect(page.getByRole('status').filter({ hasText: `${name} added.` })).toBeVisible();

  const row = page.getByRole('listitem').filter({ hasText: name }).first();
  await expect(row).toContainText('₹100');
  await expect(row).toContainText('20 in stock');

  // Options: one that costs extra, one that is refused because it would cost less than ₹0.
  await row.getByRole('button', { name: `Options for ${name}` }).click();
  const options = row.getByRole('form', { name: `New option for ${name}` });
  await options.getByLabel('Option (e.g. Size)').fill('Pack');
  await options.getByLabel('Value (e.g. Large)').fill('500 g');
  await options.getByLabel('Price change (₹)').fill('-150');
  await options.getByRole('button', { name: 'Add option' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'less than ₹0' })).toBeVisible();

  await options.getByLabel('Price change (₹)').fill('25');
  await options.getByLabel('Option stock').fill('7');
  await options.getByRole('button', { name: 'Add option' }).click();
  const list = row.getByRole('list', { name: `Options of ${name}` });
  await expect(list).toContainText('Pack: 500 g');
  await expect(list).toContainText('+₹25');
  await expect(list).toContainText('7 in stock');

  // The shop page serves the option with the price the customer will pay.
  const mine = await (await page.request.get(`${API}/shops/my-shop`, { headers: { Authorization: `Bearer ${vendor.accessToken}` } })).json();
  const product = mine.products.find((p) => p.name === name);
  const served = await (await page.request.get(`${API}/shops/${mine.shop.id}/products/${product.id}/variants`)).json();
  expect(served.variants.map((v) => [v.variant_value, Number(v.price_modifier), Number(v.inventory_count)])).toEqual([['500 g', 25, 7]]);

  // Remove the option; unlist the product: it stays on the seller's screen, off the storefront.
  await list.getByRole('button', { name: 'Remove 500 g' }).click();
  await expect(row.getByText('No options yet.')).toBeVisible();
  await row.getByRole('button', { name: `Unlist ${name}` }).click();
  await expect(page.getByRole('status').filter({ hasText: `${name} is unlisted.` })).toBeVisible();
  await expect(row).toContainText('Unlisted');
  const storefront = await (await page.request.get(`${API}/shops/${mine.shop.id}/products`)).json();
  expect((storefront.products || storefront).map((p) => p.name)).not.toContain(name);

  // …and it can be listed again, which is why it must stay on the seller's list.
  await row.getByRole('button', { name: `List ${name}` }).click();
  await expect(row).toContainText('Listed');
  } finally {
    const mineNow = await (await page.request.get(`${API}/shops/my-shop`, { headers: { Authorization: `Bearer ${vendor.accessToken}` } })).json();
    for (const p of (mineNow.products || []).filter((x) => x.name === name)) {
      await page.request.delete(`${API}/shops/my-shop/products/${p.id}`, { headers: { Authorization: `Bearer ${vendor.accessToken}` } });
    }
  }
});
