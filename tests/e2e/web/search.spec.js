// @ts-check
/**
 * C5 on the web, against the E2E backend: a product is found by name despite
 * a typo, suggested while typing, filtered by category, and opens its page.
 */
const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try { localStorage.setItem('localsampark_consent', 'accepted'); localStorage.setItem('localsampark_tour_seen', 'true'); } catch { /* storage blocked */ }
  });
});

test('[C5.14] a product is found with a typo, suggested while typing, filtered, and opened', async ({ page }) => {
  await page.goto('/search');
  const box = page.getByLabel('Search products and shops');

  // Suggestions while typing.
  await box.fill('e2e glycer');
  const suggestions = page.getByRole('listbox', { name: 'Suggestions' });
  await expect(suggestions.getByRole('option', { name: /E2E Glycerine Soap/ })).toBeVisible();

  // A typo still finds it.
  await box.fill('glycerin sope');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page).toHaveURL(/\/search\?q=glycerin\+sope|\/search\?q=glycerin%20sope/);
  const results = page.getByTestId('product-results');
  await expect(results.getByText('E2E Glycerine Soap')).toBeVisible();

  // Restricted goods are never offered.
  await box.fill('e2e cigarette');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'No products found' })).toBeVisible();

  // Category facet, then the product page.
  await box.fill('e2e');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  const facet = page.getByTestId('category-facet');
  await expect(facet).toBeVisible();
  const before = await results.getByRole('listitem').count();
  await facet.getByRole('button').first().click();
  await expect(page).toHaveURL(/category=/);
  await expect.poll(async () => results.getByRole('listitem').count()).toBeLessThanOrEqual(before);

  await page.goto('/search?q=glycerine');
  await results.getByText('E2E Glycerine Soap').click();
  await expect(page).toHaveURL(/\/shops\/[^/]+\/products\/e2e00000-0000-4000-8000-0000000000d2/);
});
