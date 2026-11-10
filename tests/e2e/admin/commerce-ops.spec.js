// @ts-check
/**
 * Admin Commerce Ops (A1–A14), end to end through the console.
 *
 * Runs against the E2E backend built by scripts/e2e/prepare-db.js (fresh
 * SQLite, standard seed, scripts/e2e/fixtures.js). One admin session is
 * opened through the real login form (phone -> OTP -> PIN; the OTP/PIN
 * shortcut exists only when the backend's NODE_ENV is development or test)
 * and shared by the serial tests below, which act on the fixture rows and
 * check the outcome both on screen and in the API.
 */
const fs = require('fs');
const { test, expect } = require('@playwright/test');
const { apiSession } = require('../helpers/session');

const API = 'http://localhost:5000/api/v1';
const IDS = {
  orderPlaced: 'e2e00000-0000-4000-8000-000000000001',
  dispute: 'e2e00000-0000-4000-8000-000000000010',
  grievance: 'e2e00000-0000-4000-8000-000000000020',
  restrictedProduct: 'e2e00000-0000-4000-8000-000000000030',
  kyc: 'e2e00000-0000-4000-8000-000000000052',
  kycShop: 'e2e00000-0000-4000-8000-000000000050',
  returnRequest: 'e2e00000-0000-4000-8000-000000000060',
  payout: 'e2e00000-0000-4000-8000-000000000080',
};
const RIDER_PHONE = '+919999999994';

test.describe.configure({ mode: 'serial' });

/** @type {import('@playwright/test').Page} */
let page;

async function openSection(id) {
  await page.goto(`/?tab=commerce&section=${id}`);
  await expect(page.getByTestId(`ops-${id}`)).toBeVisible({ timeout: 30000 });
}

const message = () => page.getByTestId('ops-message');
const apiGet = async (path) => {
  const res = await page.request.get(`${API}${path}`);
  expect(res.ok(), `${path} -> ${res.status()}`).toBeTruthy();
  return res;
};

test.beforeAll(async ({ browser }) => {
  const context = await browser.newContext({ baseURL: 'http://localhost:3001', acceptDownloads: true });
  page = await context.newPage();
});

test.afterAll(async () => {
  await page.context().close();
});

test.describe('Commerce Ops console', () => {
  test('[A8.3] the console sends a signed-out visitor to the login page', async ({ browser }) => {
    const fresh = await browser.newContext({ baseURL: 'http://localhost:3001' });
    const p = await fresh.newPage();
    await p.goto('/?tab=commerce');
    await p.waitForURL(/\/login/, { timeout: 30000 });
    const res = await p.request.get(`${API}/admin/commerce/kpis`);
    expect(res.status()).toBe(401);
    await fresh.close();
  });

  test('[A8.4] an admin signs in with phone, OTP and PIN', async () => {
    await page.goto('/login');
    await page.getByPlaceholder('e.g. +91 99999 99999').fill('+919999999991');
    await page.locator('form button[type="submit"]').first().click();
    await expect(page.getByPlaceholder('XXXXXX')).toBeVisible({ timeout: 30000 });
    await page.getByPlaceholder('XXXXXX').fill('123456');
    await page.getByPlaceholder('••••••').fill('123456');
    await page.locator('form button[type="submit"]').first().click();
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30000 });
    await expect(page.getByRole('button', { name: /Commerce Ops/ })).toBeVisible({ timeout: 30000 });
    // A fresh console must open without an error banner. It used to open with
    // "Could not load properties" because that vertical is off at launch.
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main [role="alert"]')).toHaveCount(0);
  });

  test('[A1.3] KPIs on screen are the live aggregates', async () => {
    await openSection('kpis');
    const kpis = (await (await apiGet('/admin/commerce/kpis')).json()).data;
    expect(kpis.totalOrders).toBeGreaterThanOrEqual(3);
    expect(kpis.returnedOrders).toBeGreaterThanOrEqual(1);
    await expect(page.getByTestId('kpi-orders')).toContainText(String(kpis.totalOrders));
    await expect(page.getByTestId('kpi-return-rate')).toContainText(`${kpis.returnRate}%`);
    await expect(page.getByTestId('kpi-cancellation-rate')).toContainText(`${kpis.cancellationRate}%`);
    await expect(page.getByTestId('kpi-active-shops')).toContainText(String(kpis.activeShops));
  });

  test('[A2.2] KYC queue: documents, mandatory reason, resubmission and approval', async () => {
    await openSection('sellers');
    const row = page.getByTestId(`kyc-row-${IDS.kyc}`);
    await expect(row).toContainText('E2E Fresh Bakery');
    await expect(row.getByRole('link', { name: 'PAN' })).toHaveAttribute('href', /e2e-pan/);

    await row.getByRole('button', { name: 'Reject' }).click();
    await expect(message()).toContainText(/rejection_reason is required/i);

    await row.getByLabel('Reason for E2E Fresh Bakery').fill('PAN photo is blurred');
    await row.getByRole('button', { name: 'Request resubmission' }).click();
    await expect(message()).toContainText('resubmission');
    await expect(row).toContainText('PAN photo is blurred');

    await row.getByRole('button', { name: 'Approve' }).click();
    await expect(message()).toContainText('verified');
    await expect(page.getByTestId(`kyc-row-${IDS.kyc}`)).toHaveCount(0);
    await expect(page.getByTestId(`shop-row-${IDS.kycShop}`)).toContainText('Yes');
  });

  test('[A2.3] shop kill switch needs a reason and can be reversed', async () => {
    await openSection('sellers');
    const shop = page.getByTestId(`shop-row-${IDS.kycShop}`);
    await shop.getByRole('button', { name: 'Suspend' }).click();
    await expect(message()).toContainText(/suspension reason is required/i);
    await shop.getByLabel('Suspension reason for E2E Fresh Bakery').fill('FSSAI licence expired');
    await shop.getByRole('button', { name: 'Suspend' }).click();
    await expect(message()).toContainText('suspended');
    await expect(shop).toContainText('suspended');
    await shop.getByRole('button', { name: 'Reinstate' }).click();
    await expect(shop).toContainText('approved');
  });

  test('[A3.4] category taxonomy and restricted-goods moderation', async () => {
    await openSection('catalog');
    await page.getByLabel('Category name').fill('E2E Organic');
    await page.getByLabel('Category slug').fill('e2e-organic');
    await page.getByLabel('Category icon').fill('🥬');
    await page.getByRole('button', { name: 'Add category' }).click();
    await expect(page.getByTestId('category-row-e2e-organic')).toContainText('E2E Organic');

    const flagged = page.getByTestId(`moderation-row-${IDS.restrictedProduct}`);
    await expect(flagged).toContainText('Restricted: cigarette');
    await flagged.getByRole('button', { name: 'Block' }).click();
    await expect(flagged).toContainText('Hidden');
  });

  test('[A4.10] order search, timeline, capped refund and forced cancellation', async () => {
    await openSection('orders');
    await expect(page.getByTestId('sla-breaches')).toContainText(IDS.orderPlaced.slice(0, 8));

    await page.getByLabel('Search orders').fill('Amit');
    await page.getByRole('button', { name: 'Search' }).click();
    const row = page.getByTestId(`order-row-${IDS.orderPlaced}`);
    await expect(row).toContainText('Amit Patil');
    await row.click();
    const detail = page.getByTestId('order-detail');
    await expect(detail).toContainText('Sharma Grocery');

    await detail.getByRole('button', { name: 'Refund to wallet' }).click();
    await expect(message()).toContainText(/refund reason is required/i);
    await page.getByLabel('Intervention reason').fill('Item missing from bag');
    await page.getByLabel('Refund amount').fill('100');
    await detail.getByRole('button', { name: 'Refund to wallet' }).click();
    await expect(message()).toContainText('Refund of ₹100');
    await expect(page.getByTestId('order-timeline').locator('[data-source="wallet"]')).toHaveCount(1);

    await page.getByLabel('Refund amount').fill('1000');
    await detail.getByRole('button', { name: 'Refund to wallet' }).click();
    await expect(message()).toContainText('can still be refunded');

    await detail.getByRole('button', { name: 'Force cancel' }).click();
    await expect(message()).toContainText('Order cancelled');
    await expect(detail).toContainText('cancelled');
    const order = (await (await apiGet(`/admin/commerce/orders/${IDS.orderPlaced}/timeline`)).json()).data.order;
    expect(order.order_status).toBe('cancelled');
    expect(order.cancellation_reason).toBe('Item missing from bag');
  });

  test('[A5.3] disputes and returns are settled from the queue', async () => {
    await openSection('disputes');
    const dispute = page.getByTestId(`dispute-row-${IDS.dispute}`);
    await expect(dispute).toContainText('milk packet was leaking');
    await dispute.getByLabel(`Refund amount for dispute ${IDS.dispute}`).fill('50');
    await dispute.getByRole('button', { name: 'Refund customer' }).click();
    await expect(message()).toContainText('refund');
    await expect(page.getByTestId(`dispute-row-${IDS.dispute}`)).toHaveCount(0);

    const ret = page.getByTestId(`return-row-${IDS.returnRequest}`);
    await expect(ret.getByRole('link', { name: 'Photo 1' })).toHaveAttribute('href', /e2e-evidence/);
    await ret.getByRole('button', { name: 'Reject' }).click();
    await expect(message()).toContainText(/rejectionReason is mandatory/i);
    await ret.getByRole('button', { name: 'Approve refund' }).click();
    await expect(message()).toContainText('Return approved');
    await expect(page.getByTestId(`return-row-${IDS.returnRequest}`)).toHaveCount(0);
  });

  test('[A6.4] commission, payout approval and COD settlement', async () => {
    await openSection('payouts');
    await expect(page.getByTestId('default-commission')).toContainText('0%');
    await page.getByLabel('Default commission percent').fill('60');
    await page.getByRole('button', { name: 'Save commission' }).click();
    await expect(message()).toContainText(/between 0% and 50%/);

    const payout = page.getByTestId(`payout-row-${IDS.payout}`);
    await expect(payout).toContainText('calculated');
    await payout.getByRole('button', { name: 'Approve' }).click();
    await expect(message()).toContainText('Payout approved');
    await expect(payout).toContainText('approved');
    await expect(payout.getByRole('button', { name: 'Approve' })).toHaveCount(0);
    await expect(page.getByTestId('cod-settlement')).toContainText('₹3,500');
  });

  test('[A7.3] platform coupon and homepage banner', async () => {
    await openSection('promotions');
    await page.getByLabel('Coupon code').fill('e2efest');
    await page.getByLabel('Discount value').fill('10');
    await page.getByLabel('Minimum order').fill('199');
    await page.getByLabel('Usage budget').fill('500');
    await page.getByRole('button', { name: 'Create coupon' }).click();
    await expect(page.getByTestId('coupon-row-E2EFEST')).toContainText('10%');
    await expect(page.getByTestId('coupon-row-E2EFEST')).toContainText('0 / 500');

    await page.getByLabel('Banner title').fill('E2E Diwali Sale');
    await page.getByLabel('Banner image URL').fill('https://example.com/e2e-banner.jpg');
    await page.getByLabel('Banner target URL').fill('/shops');
    await page.getByRole('button', { name: 'Publish banner' }).click();
    const banner = page.locator('[data-testid^="banner-row-"]', { hasText: 'E2E Diwali Sale' });
    await expect(banner).toBeVisible();
    await banner.getByRole('button', { name: 'Remove' }).click();
    await expect(banner).toHaveCount(0);
  });

  test('[A8.5] every console action above is in the audit log', async () => {
    await openSection('audit');
    for (const action of ['login', 'kyc_resubmission', 'kyc_verified', 'emergency_shop_suspend', 'create_category',
      'moderate_product_reject', 'admin_order_refund', 'admin_force_cancel_order', 'resolve_dispute', 'approve_payout', 'create_coupon',
      'create_banner', 'delete_banner']) {
      await expect(page.locator(`[data-testid="audit-row"][data-action="${action}"]`).first(), action).toBeVisible();
    }
  });

  test('[A9.4] zone switch and waitlist export', async () => {
    await openSection('zones');
    const zone = page.getByTestId('zone-row-E2E Pimpri');
    await expect(zone).toContainText('Inactive');
    await zone.getByRole('button', { name: 'Activate' }).click();
    await expect(zone).toContainText('Active');
    await zone.getByRole('button', { name: 'Deactivate' }).click();
    await expect(zone).toContainText('Inactive');

    await expect(page.getByTestId('waitlist-row').filter({ hasText: '411033' })).toBeVisible();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Export CSV' }).click(),
    ]);
    expect(download.suggestedFilename()).toBe('unserviceable_waitlist.csv');
    const csv = fs.readFileSync(await download.path(), 'utf8');
    expect(csv).toContain('E2E Pimpri waitlist');
    expect(csv).toContain('411033');
  });

  test('[A10.3] fleet status and COD deposit reconciliation', async () => {
    await openSection('fleet');
    const fleet = (await (await apiGet('/admin/commerce/fleet/live')).json()).data;
    const rider = fleet.find((r) => r.phone_number === RIDER_PHONE);
    expect(rider).toBeTruthy();
    await expect(page.getByTestId(`fleet-row-${rider.user_id}`)).toContainText('Online');

    const cash = page.getByTestId(`cash-row-${rider.user_id}`);
    await expect(cash).toContainText('Over limit');
    await expect(cash).toContainText('₹3,500');
    await cash.getByLabel(/Deposit amount/).fill('5000');
    await cash.getByRole('button', { name: 'Record deposit' }).click();
    await expect(message()).toContainText('cannot be more than');
    await cash.getByLabel(/Deposit amount/).fill('1500');
    await cash.getByRole('button', { name: 'Record deposit' }).click();
    await expect(message()).toContainText('Deposit recorded');
    await expect(cash).toContainText('₹2,000');
    await cash.getByRole('button', { name: 'Ledger' }).click();
    await expect(page.getByTestId('cash-ledger')).toContainText('deposited');
  });

  test('[A11.5] statutory grievance: 48h breach, reply and resolution', async () => {
    await openSection('grievances');
    const ticket = page.getByTestId(`ticket-row-${IDS.grievance}`);
    await expect(ticket).toContainText('Breached');
    await ticket.getByRole('button', { name: 'Resolve' }).click();
    await expect(message()).toContainText(/resolution is required/i);
    await ticket.getByLabel(/Reply to/).fill('The ₹15 difference has been credited to your wallet.');
    await ticket.getByRole('button', { name: 'Resolve' }).click();
    await expect(message()).toContainText('Grievance resolved');
    await expect(ticket).toContainText('resolved');
    await expect(ticket).toContainText('credited to your wallet');
  });

  test('[C14.21] a ticket a customer raises reaches the console, and the reply reaches the customer', async ({ playwright }) => {
    const customerApi = await playwright.request.newContext();
    const session = await apiSession(customerApi);
    const auth = { Authorization: `Bearer ${session.accessToken}` };
    const subject = `E2E console round trip ${Date.now()}`;
    const raised = await customerApi.post(`${API}/support/tickets`, {
      headers: auth,
      data: { category: 'delivery', subject, description: 'Rider could not find the gate.' },
    });
    expect(raised.status()).toBe(201);
    const ticketId = (await raised.json()).ticket.id;

    await openSection('grievances');
    await page.getByLabel('Ticket type').selectOption('support');
    const row = page.getByTestId(`ticket-row-${ticketId}`);
    await expect(row).toContainText(subject);
    await row.getByLabel(/Reply to/).fill('The rider has your gate number now.');
    await row.getByRole('button', { name: 'Resolve' }).click();
    await expect(message()).toContainText('Grievance resolved');

    const mine = await (await customerApi.get(`${API}/support/tickets/my`, { headers: auth })).json();
    expect(mine.tickets.find((t) => t.id === ticketId)).toMatchObject({ status: 'resolved', resolution: 'The rider has your gate number now.' });
    await customerApi.dispose();
  });

  test('[A12.4] a kill switch reaches the public registry and API gating', async () => {
    await openSection('flags');
    const row = page.getByTestId('flag-row-krishi');
    await expect(row).toContainText('Off');
    expect((await page.request.get(`${API}/krishi/listings`)).status()).toBe(403);

    await row.getByRole('button', { name: /Switch on/ }).click();
    await expect(row).toContainText('On');
    const features = (await (await apiGet('/features')).json()).features;
    expect(features.krishi.is_enabled).toBe(true);
    expect((await page.request.get(`${API}/krishi/listings`)).status()).not.toBe(403);

    await row.getByRole('button', { name: /Switch off/ }).click();
    await expect(row).toContainText('Off');
    expect((await page.request.get(`${API}/krishi/listings`)).status()).toBe(403);
    await expect(page.getByTestId('flag-row-commerce_core')).toContainText('Always on');
  });

  test('[A13.5] financial and tax exports download from the console', async () => {
    await openSection('reports');
    const grab = async (name, file) => {
      const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name }).click()]);
      expect(download.suggestedFilename()).toBe(file);
      return fs.readFileSync(await download.path(), 'utf8');
    };
    expect(await grab(/Orders & sales/, 'orders_sales_report.csv')).toContain('Order ID');
    const tcs = await grab(/GST Section 52/, 'gst_tcs_section_52_report.csv');
    expect(tcs).toContain('TCS Rate (%)');
    expect(tcs).toContain('Sharma Grocery');
    const recon = await grab(/payout reconciliation/, 'seller_payout_reconciliation.csv');
    expect(recon).toContain('Pending Payout (INR)');
    expect(recon).toContain('Sharma Grocery');
  });

  test('[A14.6] broadcast reaches only consenting users and is kept in history', async () => {
    await openSection('broadcasts');
    await page.getByLabel('Broadcast title').fill('E2E Free delivery tonight');
    await page.getByLabel('Broadcast message').fill('Orders above ₹199 ship free until 10 pm.');
    await page.getByLabel('Broadcast zone').selectOption({ label: 'Dhanori' });
    await page.getByLabel('Broadcast audience').selectOption('customer');
    await page.getByRole('button', { name: 'Send broadcast' }).click();
    await expect(message()).toContainText('delivered to 1 user(s)');
    await expect(message()).toContainText('skipped without marketing consent');
    const history = page.getByTestId('broadcast-row').filter({ hasText: 'E2E Free delivery tonight' });
    await expect(history).toContainText('customer · Dhanori');
    await expect(history).toContainText('1 of');
  });
});
