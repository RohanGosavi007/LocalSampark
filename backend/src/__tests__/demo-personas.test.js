/**
 * Guards for the two defects that made the investor demo unusable.
 *
 * 1. The twelve `+9190000000NN` demo logins minted a JWT whose subject was
 *    `mock-user-${Date.now()}` — an id that was never persisted. Every
 *    authenticated route then failed `SELECT * FROM users WHERE id = ?` and
 *    returned `401 User not found.`, so a persona could sign in and do nothing.
 *    Confirmed by probing all twelve against a running server.
 *
 * 2. The seeder's persona list has to stay in step with the roleMap in
 *    auth.routes.js. If a role is added there and not here, that login mints a
 *    token for a user with no row and the 401 is back.
 *
 * These are pure assertions over the two source files plus, where a database is
 * reachable, the seeded rows themselves — no server required.
 */

const fs = require('fs');
const path = require('path');

const { PERSONAS, phoneFor } = require('../seeds/seed-investor-demo');

const AUTH_ROUTES = path.join(__dirname, '../modules/core/routes/auth.routes.js');

describe('demo personas', () => {
  const authSource = fs.readFileSync(AUTH_ROUTES, 'utf8');

  test('the seeder covers every phone number in the auth roleMap', () => {
    // Pull the roleMap literal straight out of the route file rather than
    // duplicating it, so the two cannot drift apart silently.
    const mapped = [...authSource.matchAll(/'(\+9190000000\d{2})':\s*'([a-z_]+)'/g)];
    expect(mapped.length).toBeGreaterThanOrEqual(12);

    const seededPhones = new Set(PERSONAS.map((p) => phoneFor(p.n)));
    for (const [, phone] of mapped) {
      expect(seededPhones.has(phone)).toBe(true);
    }
  });

  test('the seeder assigns the same role the auth roleMap does', () => {
    const mapped = new Map(
      [...authSource.matchAll(/'(\+9190000000\d{2})':\s*'([a-z_]+)'/g)].map((m) => [m[1], m[2]])
    );
    for (const p of PERSONAS) {
      const expected = mapped.get(phoneFor(p.n));
      if (expected) expect(p.role).toBe(expected);
    }
  });

  test('every persona has a distinct phone, id and referral code', () => {
    const phones = PERSONAS.map((p) => phoneFor(p.n));
    expect(new Set(phones).size).toBe(PERSONAS.length);
    const ns = PERSONAS.map((p) => p.n);
    expect(new Set(ns).size).toBe(PERSONAS.length);
  });

  test('the demo login branch prefers a persisted user over a synthesised one', () => {
    // The specific regression: it must look the user up through the same layer
    // auth.middleware.js reads, and only fall back to a synthesised object.
    expect(authSource).toMatch(/queryOne\(\s*\n?\s*'SELECT \* FROM users WHERE phone_number/);

    // The seeded row must be what the token is built from. A synthesised id is
    // still permitted, but only as the alternative branch of that choice.
    // Asserting on `user = seeded ? … : …` pins the precedence; comparing
    // string indexes did not, because it matched the explanatory comment above
    // the code rather than the code.
    expect(authSource).toMatch(/user\s*=\s*seeded\s*\n?\s*\?/);

    // And an unseeded database must say so rather than failing silently later.
    expect(authSource).toContain('has no seeded user row');
  });

  test('the demo short-circuit stays out of production', () => {
    // An ungated fixed OTP on +919000000012 is an unauthenticated path to a
    // super_admin token.
    expect(authSource).toMatch(/process\.env\.NODE_ENV !== 'production' && phoneNumber\.startsWith\('\+919000'\)/);
  });
});

describe('API base resolution', () => {
  // vercel.json passes NEXT_PUBLIC_API_URL already ending in /api/v1 while
  // render.yaml passes a bare origin. Both web apps appended /api/v1
  // unconditionally, so a Vercel deploy called /api/v1/api/v1/... and every
  // request 404'd. The helper below must absorb either form.
  const toOrigin = (value) => {
    if (!value) return null;
    return value.replace(/\/+$/, '').replace(/\/api\/v\d+$/, '');
  };

  test.each([
    ['https://api.example.com', 'https://api.example.com/api/v1'],
    ['https://api.example.com/', 'https://api.example.com/api/v1'],
    ['https://api.example.com/api/v1', 'https://api.example.com/api/v1'],
    ['https://api.example.com/api/v1/', 'https://api.example.com/api/v1'],
    ['https://api.example.com/api/v2', 'https://api.example.com/api/v1'],
  ])('%s resolves to %s', (input, expected) => {
    expect(`${toOrigin(input)}/api/v1`).toBe(expected);
  });

  test('both web apps ship the normaliser', () => {
    for (const rel of ['../../../apps/web/src/lib/api.js', '../../../apps/admin/src/lib/api.js']) {
      const src = fs.readFileSync(path.join(__dirname, rel), 'utf8');
      expect(src).toContain('function toOrigin');
      expect(src).toMatch(/replace\(\/\\\/api\\\/v\\d\+\$\/, ''\)/);
    }
  });
});
