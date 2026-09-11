#!/usr/bin/env node
/**
 * Enumerate routes that read tenant-owned tables without scoping the query.
 *
 * The pre-launch audit found territory.interceptor.js mounted nowhere and
 * req.territoryFilter read nowhere, so multi-tenant isolation is currently
 * opt-in per route — and the default is leak. Mounting the interceptor globally
 * does not fix that (it filters nothing); each route has to scope its own
 * query. This produces the list of routes that still need that work.
 *
 * Deliberately conservative and heuristic: it flags SELECTs against tables that
 * carry a tenant column when the surrounding handler never mentions a scope
 * column. Treat output as a review queue, not a verdict — confirm each by hand.
 *
 *   node scripts/audit-tenant-isolation.js
 *   node scripts/audit-tenant-isolation.js --json
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', 'src');

// Tables holding rows owned by one territory/region/society/shop.
const TENANT_TABLES = [
  'local_shops', 'shop_products', 'shop_orders', 'orders', 'universal_orders',
  'universal_catalog_items', 'shop_offers', 'shop_staff', 'shop_reviews',
  'property_listings', 'local_property_listings', 'job_postings', 'local_job_postings',
  'marketplace_listings', 'posts', 'community_posts', 'society_members',
  'society_complaints', 'society_visitors', 'delivery_jobs', 'crm_leads',
];

// Any of these appearing in a handler counts as an attempt to scope.
const SCOPE_COLUMNS = [
  'territory_id', 'region_id', 'zone_id', 'society_id', 'shop_id',
  'territoryScope', 'territoryId', 'pincode', 'user_id', 'owner_id',
];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

// Slice a file into per-route handler bodies by brace depth from each route decl.
function extractHandlers(src) {
  const handlers = [];
  const routeRe = /router\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]*)['"`]/g;
  let m;
  while ((m = routeRe.exec(src))) {
    const start = m.index;
    let depth = 0;
    let i = src.indexOf('(', start);
    const from = i;
    for (; i < src.length; i++) {
      if (src[i] === '(') depth++;
      else if (src[i] === ')') { depth--; if (depth === 0) break; }
    }
    handlers.push({
      method: m[1].toUpperCase(),
      routePath: m[2],
      line: src.slice(0, start).split('\n').length,
      body: src.slice(from, Math.min(i + 1, src.length)),
    });
  }
  return handlers;
}

const findings = [];
let routesScanned = 0;

for (const file of walk(ROOT)) {
  if (!/routes?\.js$|routes[\\/]/.test(file)) continue;
  const src = fs.readFileSync(file, 'utf8');
  if (!/router\.(get|post|put|patch|delete)/.test(src)) continue;

  for (const h of extractHandlers(src)) {
    routesScanned++;
    const body = h.body;

    // Only SELECT-shaped reads: writes are a different (still real) concern.
    if (!/SELECT\s/i.test(body)) continue;

    const touched = TENANT_TABLES.filter((t) => new RegExp(`FROM\\s+${t}\\b|JOIN\\s+${t}\\b`, 'i').test(body));
    if (!touched.length) continue;

    const scoped = SCOPE_COLUMNS.some((c) => body.includes(c));
    if (scoped) continue;

    findings.push({
      file: path.relative(path.resolve(__dirname, '..'), file).replace(/\\/g, '/'),
      line: h.line,
      route: `${h.method} ${h.routePath}`,
      tables: touched,
    });
  }
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ routesScanned, findings }, null, 2));
  process.exit(findings.length ? 1 : 0);
}

console.log('\nTenant isolation review queue');
console.log('─'.repeat(78));
console.log(`Scanned ${routesScanned} route handlers.`);
console.log(`${findings.length} read tenant-owned tables with no visible scope column.\n`);

const byFile = findings.reduce((acc, f) => {
  (acc[f.file] = acc[f.file] || []).push(f);
  return acc;
}, {});

for (const [file, items] of Object.entries(byFile).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  ${file}  (${items.length})`);
  for (const it of items) {
    console.log(`      L${String(it.line).padEnd(5)} ${it.route.padEnd(38)} ${it.tables.join(', ')}`);
  }
  console.log('');
}

console.log('─'.repeat(78));
console.log('Heuristic. A route is fine if it scopes some other way (a WHERE on an');
console.log('id already owned by the caller, an admin-only mount). Confirm each by');
console.log('hand; the point is that this list should reach zero before launch.\n');

process.exit(findings.length ? 1 : 0);
