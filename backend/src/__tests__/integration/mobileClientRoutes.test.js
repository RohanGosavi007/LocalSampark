/**
 * Every API call the mobile app makes names a route that exists.
 *
 * Reads apiGet/apiPost/apiPut/apiDelete('/path') calls from app/ and src/, and checks the
 * route table. A screen that calls a path nobody serves shows an empty list that looks
 * like "no data".
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

const MOBILE = path.resolve(__dirname, '../../../../apps/mobile');
const METHODS = { apiGet: 'GET', apiPost: 'POST', apiPut: 'PUT', apiDelete: 'DELETE', fetchWithFallback: 'GET', loadWithFallback: 'GET', postWithFallback: 'POST' };

function sourceFiles(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...sourceFiles(p));
    else if (/\.(js|jsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

function clientCalls() {
  const calls = [];
  for (const root of ['app', 'src']) {
    for (const file of sourceFiles(path.join(MOBILE, root))) {
      // comments carry examples such as loadWithFallback('/endpoint', ...)
      const src = fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[^\S\n]*\/\/[^\n]*/gm, '');
      const re = /\b(apiGet|apiPost|apiPut|apiDelete|fetchWithFallback|loadWithFallback|postWithFallback)\(\s*(['"`])(\/[^'"`]*)\2/g;
      let m;
      while ((m = re.exec(src))) {
        // a template that follows a letter (not a slash) is a query string, not a path segment
        const url = m[3].replace(/([^/])\$\{[^}]*\}/g, '$1').replace(/\$\{[^}]*\}/g, 'x').split('?')[0].replace(/\/+$/, '');
        if (url) calls.push({ method: METHODS[m[1]], url, file: path.relative(MOBILE, file).split(path.sep).join('/') });
      }
    }
  }
  return calls;
}

test("the scan found the app's calls (guards against an empty check)", () => {
  expect(clientCalls().length).toBeGreaterThan(150);
});

test('every mobile API call matches a served route', () => {
  const missing = [];
  for (const c of clientCalls()) {
    if (!routes.some((r) => r.method === c.method && r.re.test(c.url))) missing.push(`${c.method} ${c.url}  <-  ${c.file}`);
  }
  expect([...new Set(missing)].sort()).toEqual([]);
});
