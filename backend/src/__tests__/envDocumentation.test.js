/**
 * The root .env.example is the master list of environment variables.
 *
 *  - every variable the code reads is listed there (a deploy cannot silently miss one), and
 *  - every variable listed there is read somewhere (the file does not advertise settings that
 *    do nothing, which is how a "documented" switch ends up trusted but dead).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../..');
const SCAN = ['backend/src', 'backend/server.js', 'apps/web/src', 'apps/web/next.config.js',
  'apps/admin/src', 'apps/admin/next.config.js', 'apps/mobile/app', 'apps/mobile/src', 'apps/mobile/app.json'];

// Set by the shell, the platform or the test runner rather than by an operator.
const PLATFORM = new Set(['NODE_ENV', 'PORT', 'PATH', 'HOME', 'CI', 'JEST_WORKER_ID']);

function walk(p, out = []) {
  if (!fs.existsSync(p)) return out;
  if (fs.statSync(p).isFile()) { out.push(p); return out; }
  for (const e of fs.readdirSync(p, { withFileTypes: true })) {
    if (['node_modules', '.next', '__tests__'].includes(e.name)) continue;
    walk(path.join(p, e.name), out);
  }
  return out;
}

function usedVariables() {
  const used = new Set();
  for (const root of SCAN) {
    for (const file of walk(path.join(ROOT, root))) {
      if (!/\.(js|jsx|mjs|ts|tsx|json)$/.test(file) || /\.test\./.test(file)) continue;
      const src = fs.readFileSync(file, 'utf8');
      for (const m of src.matchAll(/process\.env\.([A-Z][A-Z0-9_]+)/g)) used.add(m[1]);
      for (const m of src.matchAll(/process\.env\[['"]([A-Z][A-Z0-9_]+)['"]\]/g)) used.add(m[1]);
    }
  }
  return used;
}

function documentedVariables() {
  const text = fs.readFileSync(path.join(ROOT, '.env.example'), 'utf8');
  return new Set([...text.matchAll(/^#?\s*([A-Z][A-Z0-9_]+)=/gm)].map((m) => m[1]));
}

test('every environment variable the code reads is in .env.example', () => {
  const documented = documentedVariables();
  const missing = [...usedVariables()].filter((v) => !PLATFORM.has(v) && !documented.has(v)).sort();
  expect(missing).toEqual([]);
});

test('every variable in .env.example is read by the code', () => {
  const used = usedVariables();
  const dead = [...documentedVariables()].filter((v) => !PLATFORM.has(v) && !used.has(v)).sort();
  expect(dead).toEqual([]);
});

test('the template holds no real-looking secrets', () => {
  const text = fs.readFileSync(path.join(ROOT, '.env.example'), 'utf8');
  expect(text).not.toMatch(/rzp_(live|test)_[A-Za-z0-9]{8,}|sk_(live|test)_[A-Za-z0-9]{8,}|eyJ[A-Za-z0-9_-]{20,}\./);
});
