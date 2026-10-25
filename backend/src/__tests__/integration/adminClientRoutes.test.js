/**
 * Every API call the admin console makes names a route that exists.
 *
 * Reads the console's source for `${API_BASE}/...` URLs, works out the method from the
 * options beside each one, and checks the route table. A tab that calls a path nobody
 * serves shows an empty table that looks like "no data" (found: community moderation and
 * several config tabs had called routes that were never written).
 */

process.env.USE_SQLITE = 'true';

const fs = require('fs');
const path = require('path');
const Router = require('router');

const origUse = Router.prototype.use;
Router.prototype.use = function patchedUse(first) {
  const before = this.stack.length;
  const result = origUse.apply(this, arguments);
  const mount = typeof first === 'string' ? first : '/';
  for (let i = before; i < this.stack.length; i += 1) this.stack[i].__mount = mount;
  return result;
};

const apiRouter = require('../../routes');

function collectRoutes(router, prefix = '') {
  const out = [];
  for (const layer of router.stack) {
    if (layer.route) {
      for (const method of Object.keys(layer.route.methods).filter((m) => layer.route.methods[m])) {
        out.push({ method: method.toUpperCase(), path: `${prefix}${layer.route.path}`.replace(/\/+/g, '/') });
      }
    } else if (layer.handle && layer.handle.stack) {
      out.push(...collectRoutes(layer.handle, prefix + (layer.__mount && layer.__mount !== '/' ? layer.__mount : '')));
    }
  }
  return out;
}

const routes = collectRoutes(apiRouter).map((r) => ({
  method: r.method,
  re: new RegExp(`^${r.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\?:[A-Za-z_]+\\?\??/g, '[^/]+').replace(/\/+$/, '')}/?$`),
}));

const ADMIN_SRC = path.resolve(__dirname, '../../../../apps/admin/src');

function sourceFiles(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'legacy-dashboards') out.push(...sourceFiles(p)); }
    else if (/\.(js|jsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

// Calls the console makes to places this API does not serve on purpose (the dev-only test runner).
const IGNORE = [/^\/test-runner/];

function clientCalls() {
  const calls = [];
  for (const file of sourceFiles(ADMIN_SRC)) {
    const src = fs.readFileSync(file, 'utf8');
    const re = /`\$\{API_BASE\}(\/[^`]*)`/g;
    let m;
    while ((m = re.exec(src))) {
      const url = m[1].replace(/\$\{[^}]*\}/g, 'x').split('?')[0].replace(/\/+$/, '');
      if (!url || IGNORE.some((i) => i.test(url))) continue;
      const after = src.slice(m.index, m.index + 260);
      const method = (/method:\s*['"](GET|POST|PUT|PATCH|DELETE)['"]/.exec(after) || [null, 'GET'])[1];
      calls.push({ method, url, file: path.relative(ADMIN_SRC, file) });
    }
  }
  return calls;
}

test('the scan found the console\'s calls (guards against an empty check)', () => {
  expect(clientCalls().length).toBeGreaterThan(60);
});

test('every console API call matches a served route', () => {
  const missing = [];
  for (const c of clientCalls()) {
    const hit = routes.some((r) => r.method === c.method && r.re.test(c.url));
    if (!hit) missing.push(`${c.method} ${c.url}  <-  ${c.file}`);
  }
  expect([...new Set(missing)]).toEqual([]);
});
