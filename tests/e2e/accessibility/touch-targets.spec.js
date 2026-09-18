// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Touch-target regression guard.
 *
 * The design audit measured every rendered interactive element on the live site
 * against the 44x44 CSS px floor that Apple and Android both publish. The
 * result, before the fix:
 *
 *     /            63% below the floor  (53 of 84)
 *     /dashboard   63%                  (49 of 78)
 *     /shops       77%                  (51 of 66)
 *     /society     93%                  (28 of 30)
 *
 * The causes were shared, not per-page: footer column links, the language
 * pills, header icon buttons, the Button primitive's `sm` size (35px tall), and
 * a set of inline-styled tabs. Fixing those five things took the landing page
 * to 7%.
 *
 * This test exists because that is exactly the kind of win that erodes one
 * commit at a time. Budgets are set a little above where each page currently
 * sits, so a small regression is tolerated and a large one fails.
 */

const TAP_MIN = 44;

/** Per-route ceiling on the share of interactive elements below the floor. */
const BUDGETS = [
  // All four measure 0% after the fix. The budgets are set at 10 rather than 0
  // so one genuinely constrained control in a future dense table does not fail
  // the build, while the 63-93% state this started from cannot come back.
  { url: '/', maxPercent: 10 },
  { url: '/dashboard', maxPercent: 10 },
  { url: '/shops', maxPercent: 10 },
  { url: '/society', maxPercent: 10 },
];

/**
 * The dev-only quick-login dock renders five small buttons on every page.
 * It never ships to production, so counting it would make the budgets
 * meaningless. Excluded by its container, not by guessing at sizes.
 */
const DEV_ONLY = ['[data-dev-dock]', '.floating-dock'];

test.describe('touch targets', () => {
  // Cold Next dev compiles run well past the default 30s.
  test.describe.configure({ timeout: 240000 });

  /**
   * Compile every route under test once, before anything is timed.
   *
   * Without this, two workers requesting cold routes in parallel each wait
   * behind the others' compiles, and /society — a 1,621-line module — was still
   * pre-hydration after two minutes. That failed the "did the page render"
   * sanity check, which reads as a touch-target regression when it is really a
   * build queue.
   */
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    for (const { url } of BUDGETS) {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 240000 }).catch(() => {});
      await page.waitForTimeout(1500);
    }
    await page.close();
  });

  for (const { url, maxPercent } of BUDGETS) {
    test(`${url} keeps under-44px controls below ${maxPercent}%`, async ({ page }) => {
      await page.addInitScript(() => {
        try {
          // Dismiss the first-run overlays; they cover the page and would stop
          // most controls from being measured at all.
          localStorage.setItem('localsampark_tour_seen', 'true');
          localStorage.setItem('localsampark_consent', 'accepted');
        } catch (e) {
          /* storage blocked */
        }
      });

      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 180000 });

      // Poll rather than sleep. Most of this chrome is client-rendered, and a
      // fixed wait measured /society mid-hydration on a cold dev server: one
      // element in view, which failed the sanity check below for the wrong
      // reason. Waiting for the page to be populated is the actual condition.
      await expect
        .poll(
          () => page.evaluate(() => document.querySelectorAll('button,a,[role=button],input,select').length),
          { timeout: 120000, intervals: [500, 1000, 2000] }
        )
        .toBeGreaterThan(10);
      // Then settle, so late-mounting controls are included.
      await page.waitForTimeout(3000);

      const result = await page.evaluate(
        ({ tapMin, devOnly }) => {
          const inDevDock = (el) => devOnly.some((sel) => el.closest(sel));

          const rendered = [...document.querySelectorAll('button,a,[role=button],input,select')]
            .filter((el) => {
              const b = el.getBoundingClientRect();
              return b.width > 0 && b.height > 0 && !inDevDock(el);
            });

          const small = rendered.filter((el) => {
            const b = el.getBoundingClientRect();
            return b.height < tapMin || b.width < tapMin;
          });

          return {
            total: rendered.length,
            small: small.length,
            offenders: small.slice(0, 8).map((el) => ({
              text: (el.textContent || '').trim().slice(0, 30),
              size: `${Math.round(el.getBoundingClientRect().width)}x${Math.round(
                el.getBoundingClientRect().height
              )}`,
              cls: String(el.className || '').slice(0, 60),
            })),
          };
        },
        { tapMin: TAP_MIN, devOnly: DEV_ONLY }
      );

      // A page with nothing to measure would pass vacuously.
      expect(result.total).toBeGreaterThan(10);

      const percent = Math.round((result.small / result.total) * 100);
      // Printed so a failure says which controls shrank, not just that one did.
      console.log(
        `${url}: ${result.small}/${result.total} under ${TAP_MIN}px (${percent}%)`,
        JSON.stringify(result.offenders)
      );
      expect(percent).toBeLessThanOrEqual(maxPercent);
    });
  }

  test('the Button primitive meets the floor at every size', async ({ page }) => {
    // Six of the fifteen remaining offenders on the landing page were one
    // `size="sm"` Button repeated in a grid. The primitive is the right place
    // to hold this line.
    await page.addInitScript(() => {
      try {
        localStorage.setItem('localsampark_tour_seen', 'true');
        localStorage.setItem('localsampark_consent', 'accepted');
      } catch (e) {
        /* storage blocked */
      }
    });
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 180000 });
    await expect
      .poll(() => page.locator('.btn').count(), { timeout: 120000, intervals: [500, 1000, 2000] })
      .toBeGreaterThan(0);
    await page.waitForTimeout(3000);

    const heights = await page.$$eval('.btn, a.btn, button.btn', (els) =>
      els
        .map((el) => Math.round(el.getBoundingClientRect().height))
        .filter((h) => h > 0)
    );

    expect(heights.length).toBeGreaterThan(0);
    expect(Math.min(...heights)).toBeGreaterThanOrEqual(TAP_MIN);
  });
});
