/**
 * The last-resort error handler: what a caller is told when a route throws.
 */

const { errorHandler } = require('../middleware/error.middleware');

function run(err, env) {
  const saved = process.env.NODE_ENV;
  process.env.NODE_ENV = env;
  const res = {
    headersSent: false,
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  const req = { method: 'GET', originalUrl: '/api/v1/shops/abc', get: () => 'jest', ip: '127.0.0.1' };
  try {
    errorHandler(err, req, res, () => {});
  } finally {
    process.env.NODE_ENV = saved;
  }
  return res;
}

test('a value PostgreSQL cannot read as the column type is the request\'s fault', () => {
  const err = Object.assign(new Error('invalid input syntax for type uuid: "abc"'), { code: '22P02' });
  const res = run(err, 'production');
  expect(res.statusCode).toBe(400);
  expect(res.body.error).toBe('Invalid identifier or value in the request.');
  expect(JSON.stringify(res.body)).not.toContain('uuid');
});

test('an unexpected failure says nothing about itself outside development and test', () => {
  const err = new Error('relation "secret_table" does not exist at /srv/app/src/x.js');
  for (const env of ['production', 'staging', 'preview']) {
    const res = run(err, env);
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ success: false, error: 'Internal Server Error' });
  }
  const dev = run(err, 'development');
  expect(dev.body.error).toContain('secret_table');
  expect(dev.body.stack).toBeDefined();
});

test('an error carrying its own status keeps it and its message', () => {
  const err = Object.assign(new Error('Shop not found'), { statusCode: 404 });
  const res = run(err, 'production');
  expect(res.statusCode).toBe(404);
  expect(res.body.error).toBe('Shop not found');
});

test('a blocked origin is 403, not a server error', () => {
  const res = run(new Error('Not allowed by CORS'), 'production');
  expect(res.statusCode).toBe(403);
});

describe('integrity-constraint failures are the request\'s fault, not the server\'s', () => {
  test.each([
    ['PostgreSQL not-null', Object.assign(new Error('null value in column "title" of relation "events" violates not-null constraint'), { code: '23502' }), 400, 'A required field is missing from the request.'],
    ['SQLite not-null', Object.assign(new Error('SQLITE_CONSTRAINT: NOT NULL constraint failed: events.title'), { code: 'SQLITE_CONSTRAINT' }), 400, 'A required field is missing from the request.'],
    ['PostgreSQL check', Object.assign(new Error('violates check constraint "orders_status_check"'), { code: '23514' }), 400, 'A value in the request is not allowed.'],
    ['SQLite check', new Error('SQLITE_CONSTRAINT: CHECK constraint failed: status IN (...)'), 400, 'A value in the request is not allowed.'],
    ['PostgreSQL unique', Object.assign(new Error('duplicate key value violates unique constraint "users_phone_key"'), { code: '23505' }), 409, 'That already exists.'],
    ['SQLite unique', new Error('SQLITE_CONSTRAINT: UNIQUE constraint failed: users.phone_number'), 409, 'That already exists.'],
    ['PostgreSQL foreign key', Object.assign(new Error('violates foreign key constraint'), { code: '23503' }), 409, 'This refers to something that does not exist, or that is still in use.'],
    ['SQLite foreign key', new Error('SQLITE_CONSTRAINT: FOREIGN KEY constraint failed'), 409, 'This refers to something that does not exist, or that is still in use.'],
  ])('%s', (_label, err, status, message) => {
    const res = run(err, 'production');
    expect(res.statusCode).toBe(status);
    expect(res.body.error).toBe(message);
  });

  test('the answer never names the table, column or constraint', () => {
    const err = Object.assign(new Error('null value in column "secret_col" of relation "secret_table" violates not-null constraint'), { code: '23502' });
    const body = JSON.stringify(run(err, 'production').body);
    expect(body).not.toMatch(/secret_col|secret_table|violates/);
  });

  test('a status the route chose is not overridden', () => {
    const err = Object.assign(new Error('NOT NULL constraint failed: x.y'), { statusCode: 422 });
    expect(run(err, 'production').statusCode).toBe(422);
  });
});
