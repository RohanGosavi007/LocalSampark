const { test, expect } = require('@playwright/test');

/**
 * Regression guard for the Bright Mode bug.
 *
 * The web app had three theme mechanisms writing to two localStorage keys.
 * `ThemeContext` read a key ("localsampark_theme") that nothing ever wrote, so
 * it always fell through to its else-branch and set data-theme="dark" on <html>
 * unconditionally — seconds after hydration, silently overriding whatever the
 * user had chosen. The page painted light, then snapped back to dark.
 *
 * It was a race, not a hard failure: it reproduced on 2 of 3 runs on a warm
 * machine and every time on a slow one. That is exactly the shape of bug that
 * comes back, so these tests assert the theme *after* hydration has finished,
 * not just at first paint.
 */

const GROUND_LIGHT = 'rgb(246, 248, 251)'; // --ground, light
const GROUND_DARK = 'rgb(15, 21, 32)'; // --ground, dark

/** Past hydration of a ~6,000-module bundle, with headroom for a loaded CI box. */
const AFTER_HYDRATION = 8000;

/**
 * The landing route compiles ~6,000 modules on a cold dev server and holds open
 * requests to a backend that may not be running, so `load` never fires. Waiting
 * on `domcontentloaded` is what this suite needs: the pre-hydration theme script
 * has already run by then, which is the thing under test.
 */
const NAV = { waitUntil: 'domcontentloaded', timeout: 180000 };

/**
 * Poll budget. The default 5s is shorter than this route's cold hydration, so
 * every wait here has to outlast a first compile rather than a warm reload.
 */
const POLL = { timeout: 120000, intervals: [250, 500, 1000] };

async function seed(page, entries) {
  await page.addInitScript((kv) => {
    try {
      Object.entries(kv).forEach(([k, v]) => localStorage.setItem(k, v));
    } catch (e) {
      /* storage blocked; the test below will fail loudly */
    }
  }, entries);
}

/** The first-run overlays sit above the header and swallow clicks. */
const NO_OVERLAYS = {
  localsampark_tour_seen: 'true',
  localsampark_consent: 'accepted',
};

function readTheme(page) {
  return page.evaluate(() => ({
    dataTheme: document.documentElement.getAttribute('data-theme'),
    htmlHasDark: document.documentElement.classList.contains('dark'),
    bodyClass: document.body.className,
    bodyBg: getComputedStyle(document.body).backgroundColor,
    stored: (() => {
      try {
        return localStorage.getItem('theme');
      } catch (e) {
        return null;
      }
    })(),
  }));
}

test.describe('theme system', () => {
  // A cold Next dev server spends over a minute on the first compile of this
  // route, which is longer than the default 30s test timeout.
  test.describe.configure({ timeout: 240000 });

  for (const preference of ['light', 'dark']) {
    test(`a stored "${preference}" preference survives hydration`, async ({ page }) => {
      await seed(page, { theme: preference, ...NO_OVERLAYS });
      await page.goto('/', NAV);

      // The pre-hydration script should have it right immediately.
      await expect
        .poll(async () => (await readTheme(page)).dataTheme, POLL)
        .toBe(preference);

      // And nothing may change it afterwards. This is the actual regression.
      await page.waitForTimeout(AFTER_HYDRATION);
      const after = await readTheme(page);

      expect(after.dataTheme).toBe(preference);
      expect(after.bodyBg).toBe(preference === 'dark' ? GROUND_DARK : GROUND_LIGHT);
    });
  }

  test('all three DOM markers agree', async ({ page }) => {
    // Tailwind dark: variants key off <html class="dark">, the CSS custom
    // properties key off [data-theme], and ~40 legacy rules key off
    // body.dark-mode. They disagreeing is what produced a dark <body> behind
    // light-styled content.
    await seed(page, { theme: 'dark', ...NO_OVERLAYS });
    await page.goto('/', NAV);
    await page.waitForTimeout(AFTER_HYDRATION);

    // <html> is marked by the pre-hydration script, so it is correct at first
    // paint. The body classes are added by the provider on mount, so they wait
    // on hydration — polled rather than sampled, because a cold dev server can
    // take longer than AFTER_HYDRATION to get there.
    await expect.poll(async () => (await readTheme(page)).bodyClass, POLL).toContain('dark-mode');

    const state = await readTheme(page);
    expect(state.dataTheme).toBe('dark');
    expect(state.htmlHasDark).toBe(true);
    expect(state.bodyClass).not.toContain('light-mode');
  });

  for (const os of ['light', 'dark']) {
    test(`"system" follows an OS set to ${os}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: os });
      await seed(page, { theme: 'system', ...NO_OVERLAYS });
      await page.goto('/', NAV);
      await page.waitForTimeout(AFTER_HYDRATION);

      expect((await readTheme(page)).dataTheme).toBe(os);
    });
  }

  test('the header toggle changes the page, without a reload', async ({ page }) => {
    await seed(page, { theme: 'light', ...NO_OVERLAYS });
    await page.goto('/', NAV);

    // The button is present in the server-rendered markup, so being visible
    // does not mean its onClick is attached yet. The provider adds the body
    // class in a mount effect, which only runs after hydration — so that class
    // is a usable "handlers are live" signal. Clicking earlier silently does
    // nothing, which is how this test failed on a cold dev server.
    await expect.poll(async () => (await readTheme(page)).bodyClass, POLL).toContain('light-mode');

    const toggle = page.locator('button[aria-label*="Switch to"]').first();
    await expect(toggle).toBeVisible();

    // The control is also the smallest thing in a crowded header, so it is
    // worth pinning: 63-93% of interactive elements were under 44px.
    const box = await toggle.boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);

    // The old implementation called window.location.reload(), throwing away
    // cart state and scroll position to change a colour.
    let reloaded = false;
    page.on('load', () => {
      reloaded = true;
    });

    const before = await readTheme(page);
    await toggle.click();
    await expect.poll(async () => (await readTheme(page)).dataTheme, POLL).toBe('dark');

    // The painted background is polled separately. --transition-theme runs the
    // colour change over 160ms, and getComputedStyle mid-transition still
    // reports the old value, so sampling it the instant data-theme flips reads
    // the light background and fails for the wrong reason.
    await expect
      .poll(async () => (await readTheme(page)).bodyBg, POLL)
      .not.toBe(before.bodyBg);

    const after = await readTheme(page);
    expect(after.bodyBg).toBe(GROUND_DARK);
    expect(after.stored).toBe('dark');
    expect(reloaded).toBe(false);

    await toggle.click();
    await expect.poll(async () => (await readTheme(page)).dataTheme, POLL).toBe('light');
  });
});
