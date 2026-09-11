/**
 * Queries from endpoints that were silently broken by a wrong column name.
 *
 * Each query below shipped naming a column that does not exist. None of them
 * failed loudly: consumer shop search caught its own error and then failed again
 * in the fallback for the same reason, and the franchise routes answered every
 * request with a generic 500. A handler that swallows its error looks fine from
 * the outside no matter how wrong the SQL is.
 *
 * These execute the real statements against the real schema. Asserting on the
 * rows would prove nothing here -- the failure being guarded against is the
 * statement not running at all -- so each test asserts only that it executes.
 * A mocked database would defeat the entire purpose, because the mock would be
 * built from the same mistaken idea of the schema as the query.
 */
const db = require('../src/config/database');

describe('shop directory search', () => {
  // The SQLite path. search_vector is a Postgres tsvector and cannot exist
  // here, so this fallback is what actually serves the search.
  it('runs the wildcard fallback used on SQLite', async () => {
    const sql = `
      SELECT s.id, s.name, s.description, s.category, s.photo_urls, s.rating, s.is_promoted,
             (SELECT COUNT(*) FROM shop_reviews r WHERE r.shop_id = s.id) AS total_ratings
      FROM local_shops s
      WHERE s.name LIKE $1 OR s.description LIKE $2 OR s.category LIKE $3
      ORDER BY s.is_promoted DESC
      LIMIT 50`;
    await expect(db.query(sql, ['%coffee%', '%coffee%', '%coffee%'])).resolves.toBeDefined();
  });

  it('counts reviews per shop without a total_ratings column', async () => {
    // local_shops has no total_ratings; the count comes from shop_reviews.
    const res = await db.query(
      'SELECT COUNT(*) AS c FROM shop_reviews r WHERE r.shop_id = (SELECT id FROM local_shops LIMIT 1)'
    );
    expect(res.rows).toBeDefined();
  });
});

describe('franchise intelligence', () => {
  it('scopes merchant health scores by region_id, not zone_id', async () => {
    const sql = `SELECT s.id, s.name, c.slug AS shop_category_slug
       FROM local_shops s
       LEFT JOIN shop_categories c ON c.id = s.category_id
       WHERE s.region_id = $1`;
    await expect(db.query(sql, ['nonexistent-region'])).resolves.toBeDefined();
  });

  it('reads leads from franchise_lead_crm scoped by region', async () => {
    const sql = 'SELECT * FROM franchise_lead_crm WHERE region_id = $1 ORDER BY created_at DESC';
    await expect(db.query(sql, ['nonexistent-region'])).resolves.toBeDefined();
  });

  it('has somewhere to record an outreach attempt', async () => {
    // The endpoint used to reply "Outreach logged successfully" while writing
    // nothing at all, so this table is the substance of that fix.
    const sql = `SELECT id, region_id, shop_id, method, notes, logged_by, created_at
                 FROM franchise_outreach_log LIMIT 1`;
    await expect(db.query(sql)).resolves.toBeDefined();
  });
});

describe('admin god-mode auditing', () => {
  it('writes to admin_audit_log with the columns the controller supplies', async () => {
    // The controller named admin_audit_logs -- plural -- which has never
    // existed, and admin_name had no column until migration 077.
    const sql = `SELECT id, admin_id, admin_name, action, target_type, target_id, details
                 FROM admin_audit_log LIMIT 1`;
    await expect(db.query(sql)).resolves.toBeDefined();
  });

  it('reads role definitions from admin_roles_config', async () => {
    // Role management queried admin_roles, which is the per-user grant table
    // and has neither role_name nor description.
    const sql = 'SELECT id, role_name, description, permissions FROM admin_roles_config LIMIT 1';
    await expect(db.query(sql)).resolves.toBeDefined();
  });
});

describe('tables that used to be created at runtime', () => {
  // Each was created lazily by a controller inside a catch block, so it did not
  // exist until an endpoint had already failed once. Migration 082 declares them.
  const tables = [
    'medical_requests', 'civic_issues', 'charity_campaigns', 'utility_bills',
    'environment_scrap', 'logistics_agents', 'user_fcm_tokens', 'admin_settings',
  ];

  it.each(tables)('%s exists as a migrated table', async (table) => {
    const cols = await db.getTableColumns(table);
    expect(cols.length).toBeGreaterThan(0);
  });
});
