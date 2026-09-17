/**
 * Two architectural splits that are invisible until they cost something.
 *
 * Neither is a bug I can safely fix in a pass like this — both need a decision
 * about which side is authoritative, and guessing would move real data. What
 * they need meanwhile is to stop being silent, which is what this file does.
 *
 * ── 1. Two category taxonomies ─────────────────────────────────────────────
 *
 * The app routes on `shop_categories.slug`, which is kebab-case, and all five
 * live routing maps agree with it. `prisma/seeders/category-type-map.js`
 * declares a second set of 66 categories keyed SCREAMING_SNAKE
 * (KIRANA_GROCERY, PHARMACY, …) and `prisma/seed.js` writes those keys
 * straight into `categories.slug`.
 *
 * Not one of those slugs appears in any routing map. A shop seeded through the
 * Prisma path therefore renders the generic RetailVisitorView — which is
 * precisely the failure an earlier fix removed from the kebab/snake migration,
 * reintroduced through the seeder.
 *
 * ── 2. Two shop tables ─────────────────────────────────────────────────────
 *
 * Raw SQL writes and reads `local_shops`. Prisma's Shop model is `@@map`ped to
 * `shops`. GET /shops already branches on the engine — SQLite reads
 * local_shops, Postgres goes through Prisma — but POST /shops/register writes
 * only to local_shops. On Postgres, a shop that registers successfully is
 * therefore absent from the listing that is supposed to show it.
 *
 * These tests assert the shape of the problem, not a desired end state, so they
 * keep passing while it exists and start failing the moment someone believes
 * they have unified the two and has not.
 */

process.env.USE_SQLITE = 'true';

const fs = require('fs');
const path = require('path');
const { query } = require('../../config/database');

const REPO = path.resolve(__dirname, '../../../..');

describe('category taxonomy split', () => {
  const { getAllCategories } = require('../../../prisma/seeders/category-type-map');

  /** The kebab-case keys the live routers actually map. */
  function liveRouterKeys() {
    const file = path.join(REPO, 'apps/mobile/src/components/shops/VisitorViewRouter.js');
    const src = fs.readFileSync(file, 'utf8');
    const start = src.indexOf('const CATEGORY_VIEW_MAP');
    const open = src.indexOf('{', start);

    let depth = 0;
    let end = open;
    for (; end < src.length; end++) {
      if (src[end] === '{') depth++;
      else if (src[end] === '}') { depth--; if (depth === 0) break; }
    }

    const body = src.slice(open, end + 1);
    return new Set([...body.matchAll(/'([a-z0-9-]+)'\s*:/g)].map((m) => m[1]));
  }

  test('the Prisma seeder emits slugs no router can resolve', () => {
    const seeded = getAllCategories().map((c) => c.slug);
    const routable = liveRouterKeys();

    expect(seeded.length).toBeGreaterThan(0);
    expect(routable.size).toBeGreaterThan(0);

    const resolvable = seeded.filter((slug) => routable.has(slug));

    // This is the hazard, asserted as it stands. If a later change makes the
    // seeder emit routable slugs, this test fails and should be replaced by
    // one asserting full coverage — that failure is the point.
    expect(resolvable).toHaveLength(0);
  });

  test('the seeder taxonomy is a different shape from the live one', () => {
    const seeded = getAllCategories().map((c) => c.slug);

    // SCREAMING_SNAKE on one side, kebab-case on the other. Two vocabularies
    // for one concept, neither aware of the other.
    expect(seeded.every((s) => /^[A-Z][A-Z0-9_]*$/.test(s))).toBe(true);
  });

  test('the live database uses the kebab-case taxonomy', async () => {
    const result = await query('SELECT slug FROM shop_categories LIMIT 20');
    const slugs = (result.rows || result).map((r) => r.slug);

    expect(slugs.length).toBeGreaterThan(0);
    expect(slugs.every((s) => /^[a-z0-9-]+$/.test(s))).toBe(true);
  });
});

describe('shop table split', () => {
  test('Prisma maps Shop to `shops`, while the SQL layer uses `local_shops`', () => {
    const schema = fs.readFileSync(path.join(REPO, 'backend/prisma/schema.prisma'), 'utf8');

    // The mapping that makes these two different tables rather than one.
    expect(schema).toMatch(/@@map\("shops"\)/);
    expect(schema).not.toMatch(/@@map\("local_shops"\)/);
  });

  test('registration writes only to local_shops', () => {
    const routes = fs.readFileSync(
      path.join(REPO, 'backend/src/modules/ecommerce/routes/shop.routes.js'),
      'utf8'
    );

    const registerAt = routes.indexOf("router.post('/register'");
    expect(registerAt).toBeGreaterThan(-1);

    const body = routes.slice(registerAt, registerAt + 4000);
    expect(body).toContain('INSERT INTO local_shops');
    // No second write to the Prisma-side table, which is why a shop registered
    // on Postgres does not appear in a listing served from it.
    expect(body).not.toMatch(/prisma\.shop\.create/);
  });

  test('the listing route still branches on the engine', () => {
    const routes = fs.readFileSync(
      path.join(REPO, 'backend/src/modules/ecommerce/routes/shop.routes.js'),
      'utf8'
    );

    const listAt = routes.indexOf("router.get('/', async");
    const body = routes.slice(listAt, listAt + 2500);

    // SQLite reads local_shops directly; anything else goes through Prisma.
    // The branch is the workaround, and it is also the evidence of the split.
    expect(body).toContain("USE_SQLITE === 'true'");
    expect(body).toContain('FROM local_shops');
    expect(body).toContain('prisma.shop.findMany');
  });

  test('only local_shops exists in the SQL-layer database', async () => {
    const result = await query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('shops', 'local_shops', 'categories', 'shop_categories')"
    );
    const tables = (result.rows || result).map((r) => r.name).sort();

    // The Prisma-side tables are absent here entirely, so any code path that
    // reaches them in dev is reading a different database or failing.
    expect(tables).toContain('local_shops');
    expect(tables).toContain('shop_categories');
    expect(tables).not.toContain('shops');
    expect(tables).not.toContain('categories');
  });
});
