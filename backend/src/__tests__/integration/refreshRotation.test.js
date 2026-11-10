/**
 * Refresh tokens are single-use.
 *
 * Exchanging a refresh token used to leave it valid for its remaining 30 days, so
 * a stolen one worked beside the real one indefinitely with nothing to show it.
 * Each now has a jti, recorded when first presented; a second presentation is a
 * replay and signs the account out everywhere. Two tabs refreshing together are
 * the one legitimate repeat, and get "try again" instead.
 */


const { fx, fxLike } = require('../helpers/fixtureIds');
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { query, queryOne } = require('../../config/database');
const { getJwtRefreshSecret } = require('../../config/secrets');
const { generateTokens } = require('../../middleware/auth.middleware');

const USER = fx('rr-user');
let app;

const refresh = (refreshToken) => request(app).post('/auth/refresh-token').send({ refreshToken });
const version = async () => Number((await queryOne('SELECT token_version FROM users WHERE id = $1', [USER])).token_version);
async function fresh() {
  const v = await version();
  return generateTokens(USER, 'user', v);
}

beforeAll(async () => {
  await query("DELETE FROM used_refresh_tokens WHERE user_id = $1", [USER]);
  await query("DELETE FROM users WHERE id = $1", [USER]);
  await query("INSERT INTO users (id, full_name, phone_number, role, token_version, is_active) VALUES ($1, 'RR', '9865000001', 'user', '0', '1')", [USER]);
  app = express();
  app.use(express.json());
  app.use('/auth', require('../../modules/core/routes/auth.routes'));
  // eslint-disable-next-line no-unused-vars
  app.use(require('../../middleware/error.middleware').errorHandler);
});
afterAll(async () => {
  await query("DELETE FROM used_refresh_tokens WHERE user_id = $1", [USER]);
  await query("DELETE FROM users WHERE id = $1", [USER]);
});

describe('token lifetimes', () => {
  test('an access token lasts one hour by default; a refresh token 30 days with its own jti', async () => {
    const { accessToken, refreshToken } = await fresh();
    const a = jwt.decode(accessToken);
    expect(a.exp - a.iat).toBe(3600);
    const r = jwt.decode(refreshToken);
    expect(r.exp - r.iat).toBe(30 * 24 * 3600);
    expect(r.jti).toMatch(/^[0-9a-f-]{36}$/);
    expect(jwt.decode((await fresh()).refreshToken).jti).not.toBe(r.jti);
  });

  test('a client that cannot refresh (the admin console) can be given a longer access token', () => {
    const { accessToken } = generateTokens(USER, 'ADMIN', 0, {}, { accessExpiresIn: '12h' });
    const a = jwt.decode(accessToken);
    expect(a.exp - a.iat).toBe(12 * 3600);
  });
});

describe('POST /auth/refresh-token', () => {
  test('exchanges a token for a new pair', async () => {
    const { refreshToken } = await fresh();
    const res = await refresh(refreshToken);
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.refreshToken).toBeTruthy();
    expect(res.body.refreshToken).not.toBe(refreshToken);
  });

  test('the new pair can itself be refreshed (rotation chain)', async () => {
    const first = await refresh((await fresh()).refreshToken);
    const second = await refresh(first.body.refreshToken);
    expect(second.status).toBe(200);
  });

  test('replaying a spent token signs the account out everywhere', async () => {
    const { refreshToken } = await fresh();
    const legit = await refresh(refreshToken);
    expect(legit.status).toBe(200);

    // The first use was a while ago: this is not two tabs.
    await query("UPDATE used_refresh_tokens SET used_at = '2000-01-01 00:00:00' WHERE jti = $1", [jwt.decode(refreshToken).jti]);
    const before = await version();
    const replay = await refresh(refreshToken);
    expect(replay.status).toBe(401);
    expect(replay.body.code).toBe('REFRESH_REUSED');
    expect(await version()).toBe(before + 1);

    // …including the pair the legitimate exchange produced.
    const after = await refresh(legit.body.refreshToken);
    expect(after.status).toBe(401);
  });

  test('two tabs refreshing together are told to retry, not signed out', async () => {
    const { refreshToken } = await fresh();
    expect((await refresh(refreshToken)).status).toBe(200);
    const before = await version();
    const second = await refresh(refreshToken);
    expect(second.status).toBe(401);
    expect(second.body.code).toBe('REFRESH_RACE');
    expect(await version()).toBe(before); // nobody was signed out
  });

  test('a token from before this change (no jti) is accepted once and the replacement carries one', async () => {
    const legacy = jwt.sign({ userId: USER, tokenVersion: await version() }, getJwtRefreshSecret(), { expiresIn: '30d' });
    const res = await refresh(legacy);
    expect(res.status).toBe(200);
    expect(jwt.decode(res.body.refreshToken).jti).toBeTruthy();
  });

  test('an invalid or missing token is refused', async () => {
    expect((await refresh('not-a-token')).status).toBe(401);
    expect((await request(app).post('/auth/refresh-token').send({})).status).toBe(400);
  });

  test('a token for a signed-out session is refused', async () => {
    const stale = generateTokens(USER, 'user', (await version()) - 1);
    expect((await refresh(stale.refreshToken)).status).toBe(401);
  });
});

describe('cleanup', () => {
  test('only expired records are pruned', async () => {
    const { cleanUpTokens } = require('../../jobs/token-cleanup.job');
    await query(`INSERT INTO used_refresh_tokens (jti, user_id, expires_at) VALUES ('${fx('rr-old')}', $1, '2000-01-01 00:00:00')`, [USER]);
    await query(`INSERT INTO used_refresh_tokens (jti, user_id, expires_at) VALUES ('${fx('rr-live')}', $1, '2999-01-01 00:00:00')`, [USER]);
    const result = await cleanUpTokens();
    expect(result.usedRefreshTokens).toBeGreaterThanOrEqual(1);
    expect(await queryOne(`SELECT jti FROM used_refresh_tokens WHERE jti = '${fx('rr-old')}'`)).toBeNull();
    expect(await queryOne(`SELECT jti FROM used_refresh_tokens WHERE jti = '${fx('rr-live')}'`)).toBeTruthy();
  });
});
