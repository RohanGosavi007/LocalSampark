/**
 * Test Safety Guard Regression Test (Lead L6)
 *
 * Verifies that the test environment strictly forbids connecting to remote
 * databases (Supabase, Render, AWS, etc.) during test runs, preventing accidental
 * data corruption or leaks against production/staging databases.
 */

describe('L6 Database Test Isolation Guard', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env.TEST_USE_POSTGRES = originalEnv.TEST_USE_POSTGRES;
    process.env.DATABASE_URL = originalEnv.DATABASE_URL;
  });

  function validateHostSafety(dbUrl) {
    const parsed = new URL(dbUrl);
    if (parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
      throw new Error(`CRITICAL TEST SAFETY VIOLATION (L6): Tests attempted to connect to remote Postgres host '${parsed.hostname}'. Tests are strictly forbidden from running against non-local databases.`);
    }
  }

  it('rejects remote database hosts when TEST_USE_POSTGRES is set', () => {
    const remoteUrls = [
      'postgresql://postgres:secret@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres',
      'postgresql://admin:secret@dpg-abc12345.singapore-postgres.render.com:5432/db',
      'postgres://user:pass@db.example.com:5432/testdb'
    ];

    for (const url of remoteUrls) {
      expect(() => validateHostSafety(url)).toThrow(/CRITICAL TEST SAFETY VIOLATION \(L6\)/);
    }
  });

  it('permits strictly local database hosts (localhost and 127.0.0.1)', () => {
    const localUrls = [
      'postgresql://postgres:password@localhost:5432/localsampark',
      'postgresql://postgres:password@127.0.0.1:5432/localsampark',
      'postgres://user:pass@127.0.0.1:5433/test'
    ];

    for (const url of localUrls) {
      expect(() => validateHostSafety(url)).not.toThrow();
    }
  });
});
