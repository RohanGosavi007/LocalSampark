/**
 * Every /society-management call the clients make has a route behind it.
 *
 * The web society page and the mobile society tabs were written against ~50
 * paths under this prefix while the router had eight, and nothing noticed: a
 * 404 rendered as an empty list. This reads the client sources, extracts each
 * method + path they call, and checks it against the router's own table, so a
 * client call without a handler — or a handler renamed out from under a
 * client — fails here instead of in front of a user.
 */

const fs = require('fs');
const path = require('path');

process.env.USE_SQLITE = 'true';

const REPO = path.join(__dirname, '..', '..', '..');
const MOBILE_TABS = path.join(REPO, 'apps', 'mobile', 'app', 'modules', 'society', 'tabs');
const WEB_PAGE = path.join(REPO, 'apps', 'web', 'src', 'app', 'society', 'page.js');

function routeTable() {
  const router = require('../modules/community/routes/society-visitor.routes');
  return router.stack
    .filter((layer) => layer.route)
    .flatMap((layer) => Object.keys(layer.route.methods).map((m) => ({ method: m.toUpperCase(), path: layer.route.path })));
}

/** `${SM}/visitors/${v.id}/approve` → /visitors/:x/approve, query strings dropped. */
function normalise(raw) {
  return raw
    .replace(/^\$\{SM\}/, '')
    .replace(/^\/society-management/, '')
    // A nested template is cut off at its inner backtick, leaving an unclosed
    // `${…` — the optional query string in `/directory${q ? `?search=…` : ''}`.
    .replace(/\$\{[^}]*$/, '')
    .replace(/\?.*$/, '')
    .replace(/\$\{[^}]*\}/g, ':x');
}

/**
 * A client segment that was an interpolation (`:x`) matches any route segment:
 * `${v.id}` stands for an id, and `${verb}` for one of several literal actions
 * (approve / decline), which still have to exist with that shape.
 */
function matches(route, call) {
  const a = route.split('/').filter(Boolean);
  const b = call.split('/').filter(Boolean);
  return a.length === b.length && a.every((seg, i) => seg.startsWith(':') || b[i] === ':x' || seg === b[i]);
}

function mobileCalls() {
  const calls = [];
  for (const file of fs.readdirSync(MOBILE_TABS).filter((f) => f.endsWith('.js'))) {
    const src = fs.readFileSync(path.join(MOBILE_TABS, file), 'utf8');
    for (const m of src.matchAll(/useSocietyData\(\s*(?:[^`]*\?\s*)?`(\$\{SM\}[^`]*)`/g)) {
      calls.push({ file, method: 'GET', path: normalise(m[1]) });
    }
    // Ternaries: guard ? `${SM}/a` : `${SM}/b`
    for (const m of src.matchAll(/:\s*`(\$\{SM\}[^`]*)`\)/g)) calls.push({ file, method: 'GET', path: normalise(m[1]) });
    for (const m of src.matchAll(/runAction\(\s*'(get|post|put|delete)',\s*`(\$\{SM\}[^`]*)`/g)) {
      calls.push({ file, method: m[1].toUpperCase(), path: normalise(m[2]) });
    }
  }
  return calls;
}

function webCalls() {
  const src = fs.readFileSync(WEB_PAGE, 'utf8');
  const sibling = /^\/(societies|society|society-[a-z]+)\//;
  const calls = [];
  for (const m of src.matchAll(/api\(\s*(['`])(\/[^'`]*)\1\s*(?:,\s*\{\s*method\s*:\s*'([A-Z]+)')?/g)) {
    const p = m[2];
    if (sibling.test(p) && !p.startsWith('/society-management/')) continue; // another router
    calls.push({ file: 'web society/page.js', method: m[3] || 'GET', path: normalise(p) });
  }
  // The role-dependent parking read: api(societyRole === 'resident' ? '/my-parking' : '/parking')
  for (const m of src.matchAll(/\?\s*'(\/[a-z-]+)'\s*:\s*'(\/[a-z-]+)'\s*\)/g)) {
    calls.push({ file: 'web society/page.js', method: 'GET', path: m[1] }, { file: 'web society/page.js', method: 'GET', path: m[2] });
  }
  return calls;
}

describe('society clients ↔ /society-management routes', () => {
  const routes = routeTable();
  const missing = (calls) => calls.filter((c) => !routes.some((r) => r.method === c.method && matches(r.path, c.path)));

  test('the extractor finds the calls (guards against a silently empty check)', () => {
    expect(mobileCalls().length).toBeGreaterThan(40);
    expect(webCalls().length).toBeGreaterThan(40);
  });

  test('every mobile society tab call has a route', () => {
    expect(missing(mobileCalls()).map((c) => `${c.file}: ${c.method} ${c.path}`)).toEqual([]);
  });

  // The wildcard above lets `${verb}` through; these are the verbs the tabs
  // actually pass (answer(v, 'approve'), move(c, 'assign') …), checked literally.
  test.each([
    ['VisitorsTab.js', 'visitors', /(?:answer|move)\(v,\s*'([a-z-]+)'\)/g],
    ['ComplaintsTab.js', 'complaints', /move\(c,\s*'([a-z-]+)'\)/g],
  ])('%s action verbs exist on /%s/:id/<verb>', (file, base, pattern) => {
    const src = fs.readFileSync(path.join(MOBILE_TABS, file), 'utf8');
    const verbs = [...new Set([...src.matchAll(pattern)].map((m) => m[1]))];
    expect(verbs.length).toBeGreaterThan(1);
    expect(verbs.filter((v) => !routes.some((r) => r.method === 'PUT' && r.path === `/${base}/:id/${v}`))).toEqual([]);
  });

  test('every web society page call has a route', () => {
    expect(missing(webCalls()).map((c) => `${c.method} ${c.path}`)).toEqual([]);
  });
});
