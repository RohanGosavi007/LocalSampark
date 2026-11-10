// @ts-check
/**
 * C14: customer support and statutory grievances, through the web app,
 * against the E2E fixture backend.
 */
const { test, expect } = require('@playwright/test');
const { API, signInCustomer, freshPhone } = require('../helpers/session');

const SHOPPER_ORDER = 'e2e00000-0000-4000-8000-0000000000b1';

test.describe('Help & support', () => {
  test('[C14.10] a signed-out visitor is asked to sign in, not shown someone else\'s tickets', async ({ page }) => {
    await page.goto('/support');
    await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByText('TKT-1042')).toHaveCount(0);
  });

  test('[C14.11] order help: a ticket raised from an order keeps that order and reaches the support queue', async ({ page }) => {
    const session = await signInCustomer(page);

    await page.goto(`/order-tracking?id=${SHOPPER_ORDER}`);
    await page.getByRole('link', { name: 'Get help with this order' }).click();
    await expect(page).toHaveURL(new RegExp(`/support\\?order=${SHOPPER_ORDER}`));

    const subject = `E2E help ${Date.now()}`;
    await page.getByLabel('Subject').fill(subject);
    await page.getByLabel('Details').fill('The toned milk packet was leaking when it arrived.');
    await page.getByRole('button', { name: 'Submit ticket' }).click();
    await expect(page.getByTestId('support-notice')).toContainText('registered');

    // Listed under Open, with the order it is about.
    const ticket = page.locator('[data-testid^="ticket-"]', { hasText: subject });
    await expect(ticket).toContainText(`Order ${SHOPPER_ORDER.slice(0, 8).toUpperCase()}`);

    // And really stored: the API agrees.
    const mine = await (await page.request.get(`${API}/support/tickets/my`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    })).json();
    const stored = mine.tickets.find((t) => t.subject === subject);
    expect(stored).toMatchObject({ orderId: SHOPPER_ORDER, category: 'order', status: 'open' });
  });

  test('[C14.12] a formal grievance is marked as such and shows its resolution deadline', async ({ page }) => {
    await signInCustomer(page, freshPhone(), 'E2E Grievance Customer');
    await page.goto('/support');
    await page.getByRole('tab', { name: 'New ticket' }).click();
    const subject = `E2E grievance ${Date.now()}`;
    await page.getByLabel('Subject').fill(subject);
    await page.getByLabel('Details').fill('Charged above MRP on paneer.');
    await page.getByLabel(/formal grievance/).check();
    await page.getByRole('button', { name: 'Submit ticket' }).click();
    await expect(page.getByTestId('support-notice')).toContainText('Grievance Officer');
    const ticket = page.locator('[data-testid^="ticket-"]', { hasText: subject });
    await expect(ticket).toContainText('Formal grievance');
    await expect(ticket).toContainText('Resolution due by');
  });

  test('[C14.13] an empty ticket is refused before it is sent', async ({ page }) => {
    await signInCustomer(page, freshPhone(), 'E2E Empty Ticket Customer');
    await page.goto('/support');
    await page.getByRole('tab', { name: 'New ticket' }).click();
    await page.getByRole('button', { name: 'Submit ticket' }).click();
    await expect(page.getByTestId('support-notice')).toContainText('add a subject');
  });

  test('[C14.14] the public grievance page shows the configured Grievance Officer', async ({ page, request }) => {
    const officer = (await (await request.get(`${API}/support/grievance-officer`)).json()).grievanceOfficer;
    await page.goto('/legal/grievance');
    await expect(page.getByTestId('grievance-officer-name')).toHaveText(officer.name);
    await expect(page.getByRole('link', { name: officer.email })).toBeVisible();
  });
});
