// @ts-check
/**
 * P12 on the web: WCAG 2.1 A/AA, checked by the axe engine in a real browser.
 *
 * The earlier "accessibility" checks read source files for an aria-label or a
 * skip link; they cannot see a colour that fails contrast, a button with no
 * name, or a form field with no label once the page is rendered. axe runs
 * against the rendered page.
 *
 * axe is injected through the DevTools protocol (page.evaluate), which is not
 * subject to the site's nonce-based Content-Security-Policy.
 */
const fs = require('fs');
const { test, expect } = require('@playwright/test');

const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

// Pages a visitor or customer meets first. Each is public and server-rendered.
const PAGES = [
  ['home', '/'],
  ['shop directory', '/shops'],
  ['sign in', '/login'],
  ['search', '/search'],
  ['help and support', '/support'],
  ['privacy policy', '/privacy'],
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try { localStorage.setItem('localsampark_consent', 'accepted'); localStorage.setItem('localsampark_tour_seen', 'true'); } catch { /* storage blocked */ }
  });
});

async function audit(page, url, theme) {
  if (theme) await page.addInitScript((t) => { try { localStorage.setItem('theme', t); } catch { /* storage blocked */ } }, theme);
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800); // entrance animations settle: contrast is measured on the final colours
  await page.evaluate(AXE);
  return page.evaluate((tags) => window.axe.run(document, { runOnly: { type: 'tag', values: tags } }), TAGS);
}

const describeViolations = (results) => results.violations.map((v) => {
  const first = v.nodes[0];
  return `${v.id} (${v.impact}) x${v.nodes.length}: ${v.help}\n     e.g. ${first.target.join(' ')}\n     ${String(first.failureSummary || '').split('\n').slice(0, 2).join(' | ').slice(0, 220)}`;
}).join('\n');

/** A11Y_DUMP=<file> appends every violation as one JSON line (for working through a long list). */
function dumpViolations(name, theme, results) {
  if (!process.env.A11Y_DUMP) return;
  const NL = String.fromCharCode(10);
  const lines = results.violations.map((v) => JSON.stringify({
    page: name, theme, rule: v.id, impact: v.impact,
    nodes: v.nodes.map((n) => ({
      target: n.target.join(' '),
      html: n.html.slice(0, 260),
      why: String(n.failureSummary || '').split(NL).slice(1).join(' ').slice(0, 260),
    })),
  }));
  if (lines.length) fs.appendFileSync(process.env.A11Y_DUMP, lines.join(NL) + NL);
}

for (const theme of ['light', 'dark']) {
  for (const [name, url] of PAGES) {
    test(`[P12.6] the ${name} page has no WCAG 2.1 AA violations (${theme} theme)`, async ({ page }) => {
      const results = await audit(page, url, theme);
      dumpViolations(name, theme, results);
      expect(results.violations, `\n${describeViolations(results)}\n`).toEqual([]);
    });
  }
}
