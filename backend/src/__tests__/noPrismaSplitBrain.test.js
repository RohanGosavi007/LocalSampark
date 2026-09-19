/**
 * The application code must not talk to Prisma.
 *
 * `config/prisma.js` builds a real PrismaClient even when `USE_SQLITE=true` —
 * `getSharedPrisma()` falls back to `new PrismaClient()` when the guarded
 * factory returns null — and its datasource is `DATABASE_URL`, a different
 * database from the one `config/database` reads.
 *
 * That split was not theoretical. Measured against a running server:
 *
 *   - `/users/me` 500'd on every call with
 *     `FATAL: (ENOIDENTIFIER) no tenant identifier provided`, and it is the
 *     first request both clients make after login;
 *   - a user created by `/auth/verify-otp` could not be found by
 *     `auth.middleware.js` on the very next request.
 *
 * The schema made it worse. Prisma's `Shop` is `@@map`ped to `shops`,
 * `Product` to `products`, `Appointment` to `appointments`, `ServiceSlot` to
 * `service_slots` and `DeliveryRoute` to `delivery_routes` — **none of which
 * this database has**. The real tables are `local_shops`, `shop_products` and
 * `shop_appointments`, and the last two models have no table at all. So those
 * queries could not have succeeded on either engine.
 *
 * Every module now reads `config/database`. This test keeps it that way.
 */

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..');

/** config/prisma.js is the definition; it is allowed to mention Prisma. */
const ALLOWED = [path.join('config', 'prisma.js')];

/** Tests may assert *about* Prisma without calling it. */
const SKIP_DIRS = ['__tests__', 'node_modules'];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

/** Strip comments, so an explanatory note about the old bug is not a hit. */
function stripComments(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const files = walk(SRC).filter((f) => !ALLOWED.some((a) => f.endsWith(a)));

describe('no Prisma in application code', () => {
  test('nothing calls prisma.<model>.<method>()', () => {
    const offenders = [];
    for (const file of files) {
      const code = stripComments(fs.readFileSync(file, 'utf8'));
      const matches = code.match(/\bprisma\s*\.\s*[a-zA-Z]\w*\s*\.\s*[a-zA-Z]\w*\s*\(/g);
      if (matches) {
        offenders.push(`${path.relative(SRC, file)}: ${[...new Set(matches)].join(', ')}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  test('nothing imports the Prisma client', () => {
    const offenders = [];
    for (const file of files) {
      const code = stripComments(fs.readFileSync(file, 'utf8'));
      if (/require\(\s*['"][^'"]*(?:config\/prisma|prisma\/client)['"]\s*\)/.test(code)) {
        offenders.push(path.relative(SRC, file));
      }
    }
    // An import alone constructs the client and opens the connection, which is
    // what produced the ENOIDENTIFIER failures — so importing is the defect,
    // not just calling.
    expect(offenders).toEqual([]);
  });

  test('auth does not branch on the database engine', () => {
    // auth.middleware.js used to run the token-version check through
    // config/database on SQLite and Prisma everywhere else, so the check and
    // the authentication before it could disagree about whether a user exists.
    const code = fs.readFileSync(path.join(SRC, 'middleware', 'auth.middleware.js'), 'utf8');
    expect(stripComments(code)).not.toMatch(/USE_SQLITE/);
  });

  test('the tables the old Prisma models pointed at are not queried', () => {
    // `shops`, `products` and `appointments` do not exist in this schema; the
    // real ones are local_shops, shop_products and shop_appointments. A raw
    // query against the Prisma names would fail the same way the ORM did.
    const offenders = [];
    for (const file of files) {
      const code = stripComments(fs.readFileSync(file, 'utf8'));
      for (const table of ['shops', 'products', 'appointments']) {
        // Word-bounded, so local_shops / shop_products / shop_appointments and
        // the many other *_shops tables do not match.
        const re = new RegExp(`(?:FROM|JOIN|INTO|UPDATE)\\s+${table}\\b`, 'i');
        if (re.test(code)) offenders.push(`${path.relative(SRC, file)} -> ${table}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
