// @ts-check
/**
 * P12 on the web: the language buttons (EN / हिं / मरा) change the interface,
 * the choice survives a reload, and no translation key ever reaches the screen.
 *
 * The dictionary (src/app/data/translations.js) falls back to English and then
 * to the key itself, so a missing string is not an error — it appears on screen
 * as "gatekeeper.title". The check below looks for exactly that.
 */
const path = require('path');
const { pathToFileURL } = require('url');
const { test, expect } = require('@playwright/test');

const DICTIONARY = pathToFileURL(path.join(__dirname, '../../../apps/web/src/app/data/translations.js')).href;
const PAGES = ['/', '/shops', '/support', '/login'];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try { localStorage.setItem('localsampark_consent', 'accepted'); localStorage.setItem('localsampark_tour_seen', 'true'); } catch { /* storage blocked */ }
  });
});

for (const [button, code] of [['हिं', 'hi'], ['मरा', 'mr']]) {
  test(`[P12.8] switching to ${code === 'hi' ? 'Hindi' : 'Marathi'} translates the header, is remembered after a reload, and shows no raw keys`, async ({ page }) => {
    const { translations } = await import(DICTIONARY);
    const wanted = translations[code].search_placeholder_main;
    expect(wanted).not.toBe(translations.en.search_placeholder_main); // a real translation, not English

    await page.goto('/');
    await expect(page.getByRole('searchbox').first()).toHaveAttribute('placeholder', translations.en.search_placeholder_main);
    await page.getByRole('button', { name: button, exact: true }).click();
    await expect(page.getByRole('searchbox').first()).toHaveAttribute('placeholder', wanted);
    expect(await page.evaluate(() => localStorage.getItem('ls_language'))).toBe(code);

    // Remembered: a fresh load of another page is already in the language.
    await page.goto('/shops');
    await expect(page.getByRole('searchbox').first()).toHaveAttribute('placeholder', wanted);

    // No key (nav_…, set_…, gatekeeper.… ) is ever shown in place of a string.
    const keys = Object.keys(translations.en).filter((k) => k.includes('_') || k.includes('.'));
    for (const url of PAGES) {
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      const text = await page.locator('body').innerText();
      const leaked = keys.filter((k) => text.includes(k));
      expect(leaked, `${url} shows raw translation keys`).toEqual([]);
    }
  });
}
