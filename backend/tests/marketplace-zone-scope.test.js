/**
 * Marketplace zone scoping.
 *
 * A previous attempt at this file mocked the database with invented rows
 * carrying latitude/longitude columns that did not exist in either schema. The
 * tests passed against that fiction while the code under test would have thrown
 * "column does not exist" in production. So the first test here asserts the
 * columns are real, read from the live schema — if the migration is missing,
 * this suite fails loudly instead of validating a fantasy.
 */
const express = require('express');
const request = require('supertest');

const realDb = jest.requireActual('../src/config/database');

const { query, queryOne, queryMany } = require('../src/config/database');

jest.mock('../src/config/database', () => ({
  query: jest.fn().mockResolvedValue({ rows: [] }),
  queryOne: jest.fn().mockResolvedValue(null),
  queryMany: jest.fn().mockResolvedValue([]),
  pool: { query: jest.fn() },
}));

jest.mock('../src/middleware/auth.middleware', () => ({
  authenticate: (req, _res, next) => { req.user = { id: 'seller_1', role: 'user' }; next(); },
  optionalAuth: (req, _res, next) => next(),
  requireRole: () => (_req, _res, next) => next(),
  ROLES: { SUPER_ADMIN: 'super_admin' },
}));

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/marketplace', require('../src/modules/ecommerce/routes/marketplace.routes'));
  return app;
}

const REGION = '11111111-1111-1111-1111-111111111111';

beforeEach(() => jest.clearAllMocks());

describe('schema reality check', () => {
  // Guards against the failure mode that invalidated the earlier attempt:
  // tests green, production broken, because the mock invented the schema.
  it('marketplace_listings really has region_id, latitude and longitude', async () => {
    const r = await realDb.query(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='marketplace_listings'"
    );
    const rows = r.rows || r;
    const ddl = (rows[0] && rows[0].sql) || '';
    expect(ddl).toContain('region_id');
    expect(ddl).toContain('latitude');
    expect(ddl).toContain('longitude');
  });
});

describe('GET / — zone scoping', () => {
  it('returns empty with ZONE_REQUIRED when no zone is supplied', async () => {
    const res = await request(makeApp()).get('/marketplace');

    expect(res.status).toBe(200);
    expect(res.body.code).toBe('ZONE_REQUIRED');
    expect(res.body.listings).toEqual([]);
    // Fail closed: no database read at all without a zone.
    expect(queryMany).not.toHaveBeenCalled();
  });

  it('filters by region_id from the x-territory-id header', async () => {
    queryMany.mockResolvedValue([]);
    await request(makeApp()).get('/marketplace').set('x-territory-id', REGION);

    const [sql, params] = queryMany.mock.calls[0];
    expect(sql).toMatch(/l\.region_id = \$\d+/);
    expect(params).toContain(REGION);
  });

  it('accepts an explicit region_id query parameter', async () => {
    queryMany.mockResolvedValue([]);
    await request(makeApp()).get(`/marketplace?region_id=${REGION}`);

    const [, params] = queryMany.mock.calls[0];
    expect(params).toContain(REGION);
  });

  it('binds the region rather than interpolating it', async () => {
    queryMany.mockResolvedValue([]);
    // A SQL-injection attempt must travel as a bound value.
    const hostile = "abc' OR '1'='1";
    await request(makeApp()).get('/marketplace').set('x-territory-id', hostile);

    const [sql, params] = queryMany.mock.calls[0];
    expect(sql).not.toContain("OR '1'='1");
    expect(params).toContain(hostile);
  });

  it('keeps the region filter alongside other filters', async () => {
    queryMany.mockResolvedValue([]);
    await request(makeApp()).get(`/marketplace?region_id=${REGION}&category=furniture&min_price=100`);

    const [sql] = queryMany.mock.calls[0];
    expect(sql).toMatch(/l\.region_id = \$\d+/);
    expect(sql).toMatch(/l\.category = \$\d+/);
    expect(sql).toMatch(/l\.price >= \$\d+/);
    // ORDER BY must still follow every predicate.
    expect(sql.lastIndexOf(' AND ')).toBeLessThan(sql.indexOf('ORDER BY'));
  });
});

describe('POST / — region attribution', () => {
  it('stores region_id so the listing is visible to zone-scoped browse', async () => {
    queryOne.mockResolvedValue({ region_id: REGION });

    const res = await request(makeApp())
      .post('/marketplace')
      .send({ title: 'Sofa', price: 5000 });

    expect(res.status).toBe(201);
    const insert = query.mock.calls.find((c) => /INSERT INTO marketplace_listings/i.test(c[0]));
    expect(insert).toBeDefined();
    expect(insert[0]).toContain('region_id');
    expect(insert[1]).toContain(REGION);
  });

  it('prefers an explicit region_id over the seller default', async () => {
    const explicit = '22222222-2222-2222-2222-222222222222';
    queryOne.mockResolvedValue({ region_id: REGION });

    await request(makeApp())
      .post('/marketplace')
      .send({ title: 'Chair', price: 900, region_id: explicit });

    const insert = query.mock.calls.find((c) => /INSERT INTO marketplace_listings/i.test(c[0]));
    expect(insert[1]).toContain(explicit);
    expect(insert[1]).not.toContain(REGION);
  });

  it('falls back to the seller region when none is supplied', async () => {
    queryOne.mockResolvedValue({ region_id: REGION });

    await request(makeApp()).post('/marketplace').send({ title: 'Lamp', price: 300 });

    expect(queryOne).toHaveBeenCalledWith(expect.stringMatching(/FROM users/i), ['seller_1']);
    const insert = query.mock.calls.find((c) => /INSERT INTO marketplace_listings/i.test(c[0]));
    expect(insert[1]).toContain(REGION);
  });

  it('rejects when no region can be determined', async () => {
    queryOne.mockResolvedValue({ region_id: null });

    const res = await request(makeApp()).post('/marketplace').send({ title: 'Desk', price: 2000 });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('ZONE_REQUIRED');
    // An unattributed listing would be invisible everywhere — better refused.
    expect(query.mock.calls.some((c) => /INSERT INTO marketplace_listings/i.test(c[0]))).toBe(false);
  });

  it('still validates required fields before touching the region', async () => {
    const res = await request(makeApp()).post('/marketplace').send({ price: 100 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/title/i);
  });
});
