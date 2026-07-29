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

  it('should clean test data successfully', async () => {
    await cleanTestData();
    const dbModule = require('../../config/database');
    const count = await dbModule.queryOne('SELECT COUNT(*) as cnt FROM users');
    expect(Number(count.cnt)).toBe(0);
  });
});
