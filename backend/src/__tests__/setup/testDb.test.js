/**
 * Test DB Setup Verification Tests
 * Verifies that the test database lifecycle, seeding, and cleanup functions work properly.
 */
const { setupTestDb, seedTestData, cleanTestData, teardownTestDb } = require('./testDb');

describe('Test Database Lifecyle', () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  it('should seed test data successfully', async () => {
    await seedTestData();
    const dbModule = require('../../config/database');
    const user = await dbModule.queryOne('SELECT * FROM users WHERE phone_number = $1', ['9999900001']);
    expect(user).toBeDefined();
    expect(user.role).toBe('user');
  });

  /**
   * The contract changed, deliberately.
   *
   * This used to assert that cleanTestData left `users` completely empty. That
   * was true and was the bug: the shared fixtures seeded once for the whole run
   * by jest.globalSetup were destroyed along with the suite's own rows and
   * never restored, so whether an unrelated suite passed depended on Jest's
   * scheduling. Adding five ML suites shifted that order and the ranker's
   * content-vector tests started failing on an empty catalogue.
   *
   * cleanTestData now removes the suite's own data and puts the shared fixtures
   * back, so what is asserted here is that the seeded row is gone — not that
   * the table is empty, which would re-assert the broken behaviour.
   */
  it('removes suite-created rows while restoring the shared fixtures', async () => {
    await cleanTestData();
    const dbModule = require('../../config/database');

    const seeded = await dbModule.queryOne(
      'SELECT id FROM users WHERE phone_number = $1',
      ['9999900001']
    );
    expect(seeded).toBeFalsy();

    // And the shared catalogue other suites depend on is back.
    const shops = await dbModule.queryOne('SELECT COUNT(*) as cnt FROM local_shops');
    expect(Number(shops.cnt)).toBeGreaterThan(0);
  });
});
