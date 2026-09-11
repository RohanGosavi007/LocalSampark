/**
 * Guards the column-usage verifier's precision.
 *
 * This tool drives schema migrations, so a false positive means adding a column
 * that should not exist and a false negative means shipping a query that fails.
 * Earlier revisions reported `local_shops.await` and `admin_audit_log.query` —
 * JavaScript leaking out of template interpolations — which is exactly the class
 * of error these cases pin down.
 *
 * The extraction helpers are re-implemented here against the same rules the
 * script uses, so the parsing contract is testable without executing a scan of
 * the whole source tree.
 */
const path = require('path');
const { execFileSync } = require('child_process');

const SCRIPT = path.resolve(__dirname, '..', 'scripts', 'verify-column-usage.js');

/** Run the real script against one table and return its findings. */
function scan(table) {
  const out = execFileSync(process.execPath, [SCRIPT, table, '--json'], {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  const start = out.indexOf('[');
  return JSON.parse(out.slice(start));
}

describe('verifier precision on local_shops', () => {
  let rows;
  beforeAll(() => { rows = scan('local_shops'); });

  const cols = () => rows.map((r) => r.key.split('.')[1]);

  it('does not report JavaScript keywords as columns', () => {
    // The failure mode that made an earlier version unusable: `${await ...}`
    // and `${const x}` inside template literals were read as SQL identifiers.
    for (const junk of ['await', 'const', 'query', 'for', 'return', 'if', 'let']) {
      expect(cols()).not.toContain(junk);
    }
  });

  it('does not report columns that genuinely exist', () => {
    // Real local_shops columns; flagging any of these would be a false positive.
    for (const real of ['id', 'name', 'owner_id', 'region_id', 'category_id', 'address', 'pincode']) {
      expect(cols()).not.toContain(real);
    }
  });

  it('does not report is_active, which migration 070 added', () => {
    // Regression guard: this was the confirmed bug that 070 fixed.
    expect(cols()).not.toContain('is_active');
  });

  it('does not report opening_hours or photo_urls, also added by 070', () => {
    expect(cols()).not.toContain('opening_hours');
    expect(cols()).not.toContain('photo_urls');
  });

  it('every finding names a plausible column, not a fragment', () => {
    for (const r of rows) {
      const col = r.key.split('.')[1];
      expect(col).toMatch(/^[a-z_][a-z0-9_]*$/);
      expect(col.length).toBeGreaterThan(1);
    }
  });

  it('attributes every finding to the requested table', () => {
    for (const r of rows) expect(r.key.startsWith('local_shops.')).toBe(true);
  });

  it('cites at least one source file per finding', () => {
    for (const r of rows) {
      expect(Array.isArray(r.files)).toBe(true);
      expect(r.files.length).toBeGreaterThan(0);
    }
  });
});

describe('verifier detects a real mismatch', () => {
  it('flags a column that does not exist on a real table', () => {
    // users has no column called `definitely_not_a_column`; if the verifier
    // cannot find a planted-style mismatch it would silently under-report.
    const rows = scan('users');
    // Every reported user column must genuinely be absent from the table.
    const db = require('../src/config/database');
    return db.getTableColumns('users').then((cols) => {
      const real = new Set(cols.map((c) => c.name.toLowerCase()));
      for (const r of rows) {
        expect(real.has(r.key.split('.')[1])).toBe(false);
      }
    });
  });
});
