/**
 * Engine selection stays explicit (H14 / F-127).
 *
 * 84 suites once set `process.env.USE_SQLITE = 'true'` at the top, so in the
 * "PostgreSQL" gate they quietly ran on SQLite and were counted as PostgreSQL
 * passes. A suite may still be SQLite-only, but only by saying so: an
 * `@engine sqlite-only` docblock tag, which jest.config.js uses to leave it out
 * of the PostgreSQL run (reported as excluded, not as passed).
 *
 * This fails when a suite pins SQLite without the tag, or carries the tag
 * without pinning.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function testFiles() {
  const out = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p); }
      else if (/\.test\.js$/.test(e.name)) out.push(p);
    }
  };
  walk(path.join(ROOT, 'src'));
  walk(path.join(ROOT, 'tests'));
  return out;
}

const PIN = /^\s*process\.env\.USE_SQLITE\s*=\s*['"]true['"]/m;
const USES_SQLITE_HELPER = /require\(['"][./]*setup\/testDb['"]\)/;
const TAGGED = /^\s*\*\s*@engine sqlite-only/m;

const files = testFiles().map((p) => ({ rel: path.relative(ROOT, p).replace(/\\/g, '/'), src: fs.readFileSync(p, 'utf8') }));

test('the scan finds the suites', () => {
  expect(files.length).toBeGreaterThan(100);
});

test('every suite that runs on SQLite only says so with @engine sqlite-only', () => {
  const untagged = files
    .filter((f) => (PIN.test(f.src) || USES_SQLITE_HELPER.test(f.src)) && !TAGGED.test(f.src))
    .map((f) => f.rel);
  expect(untagged).toEqual([]);
});

test('every @engine sqlite-only suite actually pins SQLite', () => {
  const unpinned = files
    .filter((f) => TAGGED.test(f.src) && !PIN.test(f.src) && !USES_SQLITE_HELPER.test(f.src))
    .map((f) => f.rel);
  expect(unpinned).toEqual([]);
});

test('the PostgreSQL run leaves exactly the tagged suites out', () => {
  const prev = process.env.TEST_USE_POSTGRES;
  process.env.TEST_USE_POSTGRES = '1';
  jest.resetModules();
  const config = require('../../jest.config.js');
  if (prev === undefined) delete process.env.TEST_USE_POSTGRES; else process.env.TEST_USE_POSTGRES = prev;

  const tagged = files.filter((f) => TAGGED.test(f.src)).map((f) => f.rel);
  const ignored = config.testPathIgnorePatterns.filter((p) => p !== '/node_modules/');
  expect(ignored).toHaveLength(tagged.length);
  for (const rel of tagged) {
    const abs = path.join(ROOT, rel);
    expect(ignored.some((pattern) => new RegExp(pattern).test(abs))).toBe(true);
  }
});
