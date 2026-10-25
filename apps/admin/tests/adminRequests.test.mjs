/**
 * Every request the admin console makes goes through fetchJson (which throws on a failed
 * response), so a refused ban, a rejected role change or an expired permission is shown to
 * the admin instead of silently leaving the table as it was.
 *
 * Run with: node --test apps/admin/tests
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');
// Auth bootstrapping talks to /admin-auth directly (it must not throw on 401), and lib/api.js is the wrapper itself.
const EXEMPT = new Set(['context/AdminAuthContext.js', 'lib/api.js', 'app/login/page.js', 'app/test-runner/page.js']);

function files() {
  const out = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (e.name !== 'legacy-dashboards') walk(p); }
      else if (/\.(js|jsx)$/.test(e.name)) out.push(p);
    }
  }(SRC));
  return out;
}

test('no console page or tab calls fetch directly', () => {
  const offenders = [];
  for (const f of files()) {
    const rel = path.relative(SRC, f).split(path.sep).join('/');
    if (EXEMPT.has(rel)) continue;
    const code = fs.readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    if (/(^|[^.\w])fetch\(/m.test(code)) offenders.push(rel);
  }
  assert.deepEqual(offenders, []);
});

test('no page hard-codes the production API host', () => {
  const offenders = files()
    .filter((f) => !f.endsWith(path.join('lib', 'api.js')))
    .filter((f) => /onrender\.com|localhost:\d{4}/.test(fs.readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')))
    .map((f) => path.relative(SRC, f));
  assert.deepEqual(offenders, []);
});
