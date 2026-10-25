/**
 * Every internal link in the web app goes somewhere.
 *
 * The route table is built from the file system the way Next.js does (route
 * groups, dynamic and catch-all segments, redirects in next.config.js), and every
 * href / router.push / window.location / redirect() / `href:` data entry that
 * names an internal path must match one. Found by hand before this existed: the
 * footer's /privacy, /terms and /security (none existed), "List your shop" →
 * /shop-registration (it is /register-shop), "Return to Home" → "/delivery/page.js",
 * a sign-in link to /auth/login, and a role guard redirecting to a /unauthorized
 * that was a 404.
 *
 * Run with: npm test --workspace=apps/web
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP = path.join(WEB, 'src', 'app');

function collectRoutes() {
  const routes = [];
  (function walk(dir, segs) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name.startsWith('_') || e.name.startsWith('@')) continue;
        walk(p, /^\(.*\)$/.test(e.name) ? segs : [...segs, e.name]);
      } else if (/^(page|route)\.(js|jsx|ts|tsx)$/.test(e.name)) {
        routes.push(segs);
      }
    }
  }(APP, []));
  return routes;
}

const toRegex = (segs) => {
  const parts = segs.map((s) => {
    if (/^\[\[\.\.\..+\]\]$/.test(s)) return '(?:/.*)?';
    if (/^\[\.\.\..+\]$/.test(s)) return '/.+';
    if (/^\[.+\]$/.test(s)) return '/[^/]+';
    return '/' + s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  });
  return new RegExp('^' + (parts.join('') || '/') + '/?$');
};

function configRedirects() {
  try {
    const cfg = fs.readFileSync(path.join(WEB, 'next.config.js'), 'utf8');
    return [...cfg.matchAll(/source:\s*['"`]([^'"`]+)['"`]/g)].map((m) => {
      const src = m[1].replace(/:[A-Za-z]+\*/g, '.*').replace(/:[A-Za-z]+/g, '[^/]+').replace(/\(.*?\)/g, '.*');
      try { return new RegExp('^' + src + '/?$'); } catch (e) { return null; }
    }).filter(Boolean);
  } catch (e) {
    return [];
  }
}

const routes = collectRoutes().map(toRegex);
const redirects = configRedirects();
const exists = (p) => routes.some((r) => r.test(p)) || redirects.some((r) => r.test(p));
const inPublic = (p) => { try { return fs.statSync(path.join(WEB, 'public', p)).isFile(); } catch (e) { return false; } };

function sourceFiles() {
  const out = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (['node_modules', '.next'].includes(e.name)) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(js|jsx|ts|tsx)$/.test(e.name)) out.push(p);
    }
  }(path.join(WEB, 'src')));
  return out;
}

const PATTERNS = [
  /\b(?:href|route|link|redirectTo|returnTo|path)\s*[=:]\s*(?:\{\s*)?(['"`])(\/[^'"`]*)\1/g,
  /[?:]\s*(['"`])(\/[a-z][^'"`\s]*)\1\s*[:)}]/g,
  /(?:router|navigate)\.(?:push|replace|prefetch)\(\s*(['"`])(\/[^'"`]*)\1/g,
  /window\.location(?:\.href)?\s*=\s*(['"`])(\/[^'"`]*)\1/g,
  /redirect\(\s*(['"`])(\/[^'"`]*)\1/g,
];

test('the route table was found (guards against an empty check)', () => {
  assert.ok(routes.length > 250, `only ${routes.length} routes found`);
});

test('every internal link resolves to a page', () => {
  const broken = [];
  let checked = 0;
  for (const file of sourceFiles()) {
    const src = fs.readFileSync(file, 'utf8');
    const lines = src.split('\n');
    for (const re of PATTERNS) {
      re.lastIndex = 0;
      for (const m of src.matchAll(re)) {
        const line = src.slice(0, m.index).split('\n').length;
        // A path handed to an API helper (`api('/my-parking')`) is not a page.
        if (/\bapi[A-Za-z]*\(/.test(lines[line - 1])) continue;
        let target = m[2].replace(/\$\{[^}]*\}/g, 'x').split('#')[0].split('?')[0];
        if (target === '' || target.startsWith('//')) continue;
        if (/^\/(api|_next|uploads|static|images|icons|fonts)\b/.test(target)) continue;
        if (/\.[a-z0-9]{2,5}$/i.test(target) && inPublic(target)) continue;
        checked += 1;
        if (!exists(target)) broken.push(`${target}  ←  ${path.relative(WEB, file)}:${line}`);
      }
    }
  }
  assert.ok(checked > 600, `only ${checked} links checked`);
  assert.deepEqual(broken, []);
});

test('the pages the footer and stores rely on exist', () => {
  for (const p of ['/privacy', '/terms', '/refunds', '/about', '/login', '/unauthorized', '/register-shop']) {
    assert.ok(exists(p), `${p} is missing`);
  }
});
