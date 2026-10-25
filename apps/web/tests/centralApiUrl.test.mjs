/**
 * The API's address is written down once.
 *
 * Seven files built their own: `NEXT_PUBLIC_API_URL || 'http://localhost:5000'`,
 * or a literal localhost URL. In production with the variable unset those pointed
 * the site at the visitor's own machine, and with the Vercel-style value (which
 * already ends in /api/v1) they produced /api/v1/api/v1/… and 404'd. lib/apiUrl.js
 * understands both conventions and is the only place that reads the variable.
 *
 * Run with: npm test --workspace=apps/web
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(WEB, 'src');
const HOME = path.join('src', 'lib', 'apiUrl.js');

function files() {
  const out = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (['node_modules', '.next'].includes(e.name)) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(js|jsx|ts|tsx)$/.test(e.name)) out.push(p);
    }
  }(SRC));
  return out;
}

/** Code with comments removed, so an explanatory note does not count as a use. */
const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[^\S\n]*\/\/.*$/gm, '').replace(/([^:])\/\/[^\n]*$/gm, '$1');

test('no source file carries its own API host', () => {
  const offenders = [];
  for (const file of files()) {
    const rel = path.relative(WEB, file);
    if (rel === HOME) continue;
    const src = code(fs.readFileSync(file, 'utf8'));
    if (/https?:\/\/(?:localhost|127\.0\.0\.1):\d{4}/.test(src)) offenders.push(`${rel}: a literal localhost API URL`);
    if (/onrender\.com/.test(src)) offenders.push(`${rel}: a literal onrender.com URL`);
    if (/process\.env\.NEXT_PUBLIC_API_URL/.test(src)) offenders.push(`${rel}: reads NEXT_PUBLIC_API_URL itself`);
  }
  assert.deepEqual(offenders, []);
});

test('apiUrl.js has no client directive, so server components can import it', () => {
  const src = fs.readFileSync(path.join(WEB, HOME), 'utf8');
  assert.ok(!/^\s*['"]use client['"]/.test(src), "lib/apiUrl.js must not start with 'use client'");
});

test('server components that need the API address import apiUrl, not the client module', () => {
  const bad = [];
  for (const file of files()) {
    const raw = fs.readFileSync(file, 'utf8');
    const isClient = /^\s*['"]use client['"]/.test(raw);
    if (!isClient && /from\s+['"]@\/lib\/api['"]/.test(raw) && !/^\s*['"]use client['"]/m.test(raw)) {
      // Importing API_URL / API_BASE (plain values) from a client module into a server
      // component hands back a client reference, not the string.
      const named = raw.match(/import\s*\{([^}]*)\}\s*from\s*['"]@\/lib\/api['"]/);
      if (named && /\bAPI_(URL|BASE)\b/.test(named[1]) && /export\s+(async\s+)?function\s+(generateMetadata|generateStaticParams)|export\s+const\s+metadata/.test(raw)) {
        bad.push(path.relative(WEB, file));
      }
    }
  }
  assert.deepEqual(bad, []);
});

test('both deployment conventions resolve to the same base', async () => {
  const resolve = async (value) => {
    const saved = process.env.NEXT_PUBLIC_API_URL;
    process.env.NEXT_PUBLIC_API_URL = value;
    try {
      const mod = await import(`../src/lib/apiUrl.js?v=${Math.random()}`);
      return mod.API_BASE;
    } finally {
      if (saved === undefined) delete process.env.NEXT_PUBLIC_API_URL; else process.env.NEXT_PUBLIC_API_URL = saved;
    }
  };
  const origin = await resolve('https://api.example.com');
  assert.equal(origin, 'https://api.example.com/api/v1');
  assert.equal(await resolve('https://api.example.com/api/v1'), origin);
  assert.equal(await resolve('https://api.example.com/'), origin);
  assert.equal(await resolve('https://api.example.com/api/v1/'), origin);
});
