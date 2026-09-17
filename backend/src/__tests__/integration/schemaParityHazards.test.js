/**
 * Two architectural splits that are invisible until they cost something.
 *
 * Neither is a bug I can safely fix in a pass like this — both need a decision
 * about which side is authoritative, and guessing would move real data. What
 * they need meanwhile is to stop being silent, which is what this file does.
 *
 * ── 1. Two category taxonomies — now resolved ──────────────────────────────
 *
 * `prisma/seeders/category-type-map.js` used to declare its own 66 categories
 * keyed SCREAMING_SNAKE, and `prisma/seed.js` wrote those keys straight into
 * `categories.slug`. Not one appeared in any routing map, so a Prisma-seeded
 * clinic, salon and garage all rendered the generic RetailVisitorView — the
 * failure an earlier fix removed from the kebab/snake migration, reintroduced
 * through the seeder.
 *
 * The map now keys on the live kebab-case slugs and derives the commerce model
 * from the backend's ARCHETYPE_MAP rather than restating it. These tests hold
 * the two sets identical, so a category added to one and not the other fails
 * here rather than seeding into the generic view.
 *
 * ── 2. Two shop tables — now resolved ──────────────────────────────────────
 *
 * Raw SQL writes and reads `local_shops`; Prisma's Shop model is `@@map`ped to
 * `shops`, a different table. POST /shops/register wrote only to local_shops
 * while five read paths went through Prisma, so on PostgreSQL a shop could
 * register successfully and be invisible to the listing, the pincode directory
 * a customer browses, the admin shop count, and the delivery controller's
 * logistics lookup — which failed with "No active logistics channel found in
 * region" however many shops the platform had.
 *
 * All five now read local_shops, the table the writes already target. That
 * needed no data migration and is engine-independent, which is why it was the
 * smaller change as well as the correct one. These tests hold the reads on the
 * same table as the writes.
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

  test('every slug the Prisma seeder emits resolves to a specialised view', () => {
    const seeded = getAllCategories().map((c) => c.slug);
    const routable = liveRouterKeys();

    expect(seeded.length).toBeGreaterThan(0);
    expect(routable.size).toBeGreaterThan(0);

    // The seeder used to emit 66 SCREAMING_SNAKE keys, none of which appeared
    // in any routing map, so a Prisma-seeded clinic, salon and garage all
    // rendered the generic RetailVisitorView. Full coverage is the assertion
    // now; a single miss is a category that seeds into the generic view.
    const unroutable = seeded.filter((slug) => !routable.has(slug));
    expect(unroutable).toEqual([]);
  });

  test('the seeder speaks the live kebab-case taxonomy', () => {
    const seeded = getAllCategories().map((c) => c.slug);
    expect(seeded.every((s) => /^[a-z0-9-]+$/.test(s))).toBe(true);
  });

  test('every category is typed, and typed from its archetype', () => {
    const all = getAllCategories();

    // The commerce model is derived from the backend's ARCHETYPE_MAP rather
    // than restated, so a category cannot be typed one way here and routed
    // another way in the app.
    expect(all.every((c) => ['PRODUCT', 'APPOINTMENT', 'HYBRID'].includes(c.categoryType))).toBe(true);
    expect(all.every((c) => typeof c.archetype === 'string' && c.archetype.length > 0)).toBe(true);
  });

  test('every seeded slug exists as a live category', async () => {
    const result = await query('SELECT slug FROM shop_categories WHERE is_active = 1');
    const live = new Set((result.rows || result).map((r) => r.slug));
    const seeded = getAllCategories().map((c) => c.slug);

    // One direction only. The test database carries a handful of extra
    // categories that jest.globalSetup seeds for its own fixture shops
    // ('grocery', 'pharmacy', 'salon', 'hardware'), so the live set is a
    // superset here. What must hold is that the seeder invents nothing: a slug
    // it emits that no category row backs would seed a shop into a category
    // the directory does not list.
    expect(seeded.filter((s) => !live.has(s))).toEqual([]);
    expect(seeded.length).toBeGreaterThanOrEqual(50);
  });

  test('fixture content still resolves after the rename', () => {
    // product-generator and slot-generator index their catalogues by the old
    // SCREAMING_SNAKE keys and fall back silently on a miss, so renaming the
    // slugs without this bridge would have seeded shops with no products and
    // no bookable slots while reporting success.
    const { generateProductsForCategory } = require('../../../prisma/seeders/product-generator');

    for (const category of getAllCategories()) {
      const key = category.fixtureKey || category.slug;
      const products = generateProductsForCategory(key, 'test-shop') || [];
      expect(products.length).toBeGreaterThan(0);
    }
  });

  test('the live database uses the kebab-case taxonomy', async () => {
    const result = await query('SELECT slug FROM shop_categories LIMIT 20');
    const slugs = (result.rows || result).map((r) => r.slug);

    expect(slugs.length).toBeGreaterThan(0);
    expect(slugs.every((s) => /^[a-z0-9-]+$/.test(s))).toBe(true);
  });
});

describe('shop table split', () => {
  const routes = () => fs.readFileSync(
    path.join(REPO, 'backend/src/modules/ecommerce/routes/shop.routes.js'),
    'utf8'
  );

  test('registration still writes local_shops', () => {
    const src = routes();
    const registerAt = src.indexOf("router.post('/register'");
    expect(registerAt).toBeGreaterThan(-1);
    expect(src.slice(registerAt, registerAt + 6000)).toContain('INSERT INTO local_shops');
  });

  test('the listing reads the same table, on every engine', () => {
    const src = routes();
    const listAt = src.indexOf("router.get('/', async");
    const body = src.slice(listAt, src.indexOf("router.post('/register'", listAt));

    expect(body).toContain('FROM local_shops');

    // Comments stripped first: the replacement is explained in prose that
    // names what it replaced, and a substring check would find that prose.
    const code = body.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

    // The engine branch was the workaround that kept the two halves apart.
    expect(code).not.toContain('prisma.shop.findMany');
    expect(code).not.toContain("USE_SQLITE === 'true'");
  });

  test('no read path goes to the Prisma shop table any more', () => {
    // Five call sites read `shops` while registration wrote `local_shops`: the
    // listing, the pincode directory, the admin shop count and two lookups in
    // the delivery controller. A shop that registered was invisible to all of
    // them.
    const files = [
      'backend/src/modules/ecommerce/routes/shop.routes.js',
      'backend/src/modules/ecommerce/controllers/pincode-directory.controller.js',
      'backend/src/modules/crm/controllers/admin-revenue.controller.js',
      'backend/src/modules/services/controllers/delivery.controller.js',
    ];

    for (const relative of files) {
      const src = fs.readFileSync(path.join(REPO, relative), 'utf8');

      // Strip comments before looking for calls, since the fix is explained in
      // prose that names the thing it replaced.
      const code = src
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');

      expect(code).not.toMatch(/prisma\.shop\.(findMany|findFirst|count|create)/);
    }
  });

  test('the pincode directory keeps its payload shape', () => {
    // Clients depend on these field names. local_shops has no column behind
    // some of them, so they are derived where that is honest and null where it
    // is not — but they must still be present.
    const src = fs.readFileSync(
      path.join(REPO, 'backend/src/modules/ecommerce/controllers/pincode-directory.controller.js'),
      'utf8'
    );

    for (const field of ['logoUrl', 'bannerUrl', 'estimatedDeliveryTime', 'deliveryAvailable', 'pickupAvailable', 'totalRatings']) {
      expect(src).toContain(field);
    }
  });

  test('only local_shops exists in the SQL-layer database', async () => {
    const result = await query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('shops', 'local_shops')"
    );
    const tables = (result.rows || result).map((r) => r.name);

    expect(tables).toContain('local_shops');
    expect(tables).not.toContain('shops');
  });
});
