/**
 * Smoke-render every category visitor view.
 *
 * categoryRouterParity.test.js proves each category reaches the right component
 * with the prop *names* that component declares. It cannot prove the component
 * survives being handed that data, or that it does anything with it — and two
 * views did not:
 *
 *   ProfessionalVisitorView   destructured `services` and never referenced it,
 *                             rendering four hardcoded consultation options at
 *                             invented prices (₹500/₹300/₹200/₹1000) and a
 *                             hardcoded CA/tax "Areas of Expertise" list, so a
 *                             lawyer, travel agent and astrologer all advertised
 *                             "ROC Filing".
 *   TiffinCateringVisitorView did the same with `products`, so every tiffin
 *                             vendor advertised ₹80/meal, ₹520/week and
 *                             ₹2000/month whatever they actually charged.
 *
 * Neither threw. Both rendered a full, plausible page. Only rendering them and
 * looking for the data we passed in caught it.
 *
 * The renderer lives in apps/web/scripts/smoke-render-views.js and is run here
 * as a subprocess: it installs its own require hook to transform JSX with
 * next/babel, which would fight Jest's transform if imported directly. It is
 * driven from this suite because apps/web has no test runner of its own and
 * this is the only runner wired into CI.
 */

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const WEB = path.resolve(__dirname, '../../../apps/web');
const SCRIPT = path.join(WEB, 'scripts/smoke-render-views.js');

describe('visitor views render', () => {
  it('the smoke-render script is present', () => {
    expect(fs.existsSync(SCRIPT)).toBe(true);
  });

  it('every category view renders and shows the data it was given', () => {
    const run = spawnSync(process.execPath, [SCRIPT], {
      cwd: WEB,
      encoding: 'utf8',
      // React SSR of ~13 component trees; generous so a slow CI box does not
      // produce a flaky failure that looks like a rendering bug.
      timeout: 180000,
    });

    const output = `${run.stdout || ''}${run.stderr || ''}`;

    // Surface the per-view table on failure — "exit code 1" alone would not say
    // which view broke or how.
    if (run.status !== 0) {
      throw new Error(
        `smoke-render-views.js exited ${run.status}.\n\n${output}`
      );
    }

    expect(output).toMatch(/PASS — 0 problem\(s\)/);
    // THROW = crashed, BARE = rendered almost nothing, MISS = ignored its data,
    // FAKE = invented content for a shop that has published none.
    expect(output).not.toMatch(/\[THROW\]|\[BARE\]|\[MISS\]|\[FAKE\]/);
  }, 200000);

  it('exercises both the populated and the empty-shop paths', () => {
    // The empty path is the one that used to be filled with invented doctors,
    // technicians and courses, so a run that skipped it would miss the point.
    const run = spawnSync(process.execPath, [SCRIPT], {
      cwd: WEB, encoding: 'utf8', timeout: 180000,
    });
    const output = `${run.stdout || ''}${run.stderr || ''}`;
    expect(output).toMatch(/with data/);
    expect(output).toMatch(/with nothing published/);
  }, 200000);
});
