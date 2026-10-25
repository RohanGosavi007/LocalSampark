/**
 * Every API call the web app makes names a route that exists.
 *
 * Reads apiGet/apiPost/apiPut/apiDelete, adminGet/adminPost/adminPut and fetch(`${API_BASE}/…`) /
 * fetch(API_BASE + '/…') / fetch(`${API_URL}/api/v1/…`) calls under apps/web/src and checks the
 * route table. A page that calls a path nobody serves shows an empty list that looks like "no data".
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

const WEB = path.resolve(__dirname, '../../../../apps/web/src');
const HELPERS = { apiGet: 'GET', apiPost: 'POST', apiPut: 'PUT', apiDelete: 'DELETE', adminGet: 'GET', adminPost: 'POST', adminPut: 'PUT' };

function sourceFiles(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.next') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...sourceFiles(p));
    else if (/\.(js|jsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

// a template that follows a letter (not a slash) is a query string, not a path segment
const norm = (raw) => raw.replace(/([^/])\$\{[^}]*\}/g, '$1').replace(/\$\{[^}]*\}/g, 'x').split('?')[0].replace(/\/+$/, '');

function clientCalls() {
  const calls = [];
  for (const file of sourceFiles(WEB)) {
    const rel = path.relative(WEB, file).split(path.sep).join('/');
    const src = fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[^\S\n]*\/\/[^\n]*/gm, '');
    let m;
    const helper = /\b(apiGet|apiPost|apiPut|apiDelete|adminGet|adminPost|adminPut)\(\s*(['"`])(\/[^'"`]*)\2/g;
    while ((m = helper.exec(src))) calls.push({ method: HELPERS[m[1]], url: norm(m[3]), file: rel });

    const fetches = [
      { re: /fetch\(\s*`\$\{API_BASE\}(\/[^`]*)`/g, group: 1 },
      { re: /fetch\(\s*API_BASE\s*\+\s*(['"])(\/[^'"]*)\1/g, group: 2 },
      { re: /fetch\(\s*`\$\{API_URL\}\/api\/v1(\/[^`]*)`/g, group: 1 },
    ];
    for (const { re, group } of fetches) {
      while ((m = re.exec(src))) {
        const after = src.slice(m.index, m.index + 300);
        const method = (/method:\s*['"](GET|POST|PUT|PATCH|DELETE)['"]/.exec(after) || [null, 'GET'])[1];
        calls.push({ method, url: norm(m[group]), file: rel });
      }
    }
  }
  return calls.filter((c) => c.url);
}

test("the scan found the web app's calls (guards against an empty check)", () => {
  expect(clientCalls().length).toBeGreaterThan(80);
});

test('every web API call matches a served route', () => {
  const missing = [];
  for (const c of clientCalls()) {
    if (!routes.some((r) => r.method === c.method && r.re.test(c.url))) missing.push(`${c.method} ${c.url}  <-  ${c.file}`);
  }
  expect([...new Set(missing)].sort()).toEqual([]);
});
