/**
 * C1 / Decision D3: Google Sign-In. Google's and Firebase's token checks are
 * replaced here by stand-ins; what is tested is what the server does with
 * their answer.
 */
jest.mock('../../modules/core/services/firebase.service', () => ({
  firebaseReady: jest.fn(() => true),
  verifyFirebaseToken: jest.fn(),
  admin: {},
}));
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({ verifyIdToken: jest.fn() })),
}));

const express = require('express');
const request = require('supertest');
const { query, queryOne } = require('../../config/database');
const { fx } = require('../helpers/fixtureIds');

const EXISTING = fx('c1g-existing');
const BANNED = fx('c1g-banned');
const firebase = require('../../modules/core/services/firebase.service');
const { OAuth2Client } = require('google-auth-library');
const googleSignIn = require('../../services/googleSignIn.service');

let app;
const saved = process.env.GOOGLE_OAUTH_CLIENT_IDS;

async function cleanup() {
  await query("DELETE FROM users WHERE LOWER(email) LIKE 'c1g-%@example.com'");
}

beforeAll(async () => {
  await cleanup();
  await query("INSERT INTO users (id, full_name, phone_number, role, email, is_active) VALUES ($1, 'Asha Existing', '9833020202', 'user', 'c1g-asha@example.com', '1')", [EXISTING]);
  await query("INSERT INTO users (id, full_name, phone_number, role, email, is_active) VALUES ($1, 'Banned', '9833020203', 'user', 'c1g-banned@example.com', '0')", [BANNED]);
  app = express();
  app.use(express.json());
  app.use('/auth', require('../../modules/core/routes/auth.routes'));
});

afterAll(async () => {
  await cleanup();
  await query('DELETE FROM users WHERE id IN ($1, $2)', [EXISTING, BANNED]);
  if (saved === undefined) delete process.env.GOOGLE_OAUTH_CLIENT_IDS; else process.env.GOOGLE_OAUTH_CLIENT_IDS = saved;
});

const firebaseSays = (claims) => firebase.verifyFirebaseToken.mockResolvedValueOnce(claims);
const google = (body) => request(app).post('/auth/google').send(body);

test('[C1.15] the website signs in with Google: a known email is that account, a new one becomes an account', async () => {
  firebaseSays({ email: 'C1G-Asha@Example.com', email_verified: true, name: 'Asha', firebase: { sign_in_provider: 'google.com' } });
  const known = await google({ firebaseIdToken: 't1' });
  expect(known.status).toBe(200);
  expect(known.body.user.id).toBe(EXISTING);
  expect(typeof known.body.accessToken).toBe('string');

  firebaseSays({ email: 'c1g-new@example.com', email_verified: true, name: 'Ravi New', firebase: { sign_in_provider: 'google.com' } });
  const created = await google({ firebaseIdToken: 't2' });
  expect(created.status).toBe(200);
  expect(created.body.user).toMatchObject({ email: 'c1g-new@example.com', fullName: 'Ravi New', phone: null });
  const row = await queryOne('SELECT auth_method, email_verified FROM users WHERE email = $1', ['c1g-new@example.com']);
  expect(row.auth_method).toBe('google');
  expect(Number(row.email_verified)).toBe(1);
});

test('[C1.16] a token that is not a Google sign-in, an unconfirmed email, or a closed account is refused', async () => {
  firebaseSays({ phone_number: '+919800000001', firebase: { sign_in_provider: 'phone' } });
  expect((await google({ firebaseIdToken: 'phone-token' })).status).toBe(401);

  firebaseSays({ email: 'c1g-x@example.com', email_verified: false, firebase: { sign_in_provider: 'google.com' } });
  expect((await google({ firebaseIdToken: 'unverified' })).status).toBe(401);

  firebase.verifyFirebaseToken.mockRejectedValueOnce(new Error('bad signature'));
  expect((await google({ firebaseIdToken: 'forged' })).status).toBe(401);

  firebaseSays({ email: 'c1g-banned@example.com', email_verified: true, firebase: { sign_in_provider: 'google.com' } });
  expect((await google({ firebaseIdToken: 't3' })).status).toBe(403);

  expect((await google({})).status).toBe(400);
});

test('[C1.17] the app signs in with Google ID tokens meant for this app only', async () => {
  delete process.env.GOOGLE_OAUTH_CLIENT_IDS;
  expect((await google({ googleIdToken: 'g' })).status).toBe(503);

  process.env.GOOGLE_OAUTH_CLIENT_IDS = 'android-client.apps.googleusercontent.com, web-client.apps.googleusercontent.com';
  const verifyIdToken = jest.fn().mockResolvedValue({ getPayload: () => ({ email: 'c1g-asha@example.com', email_verified: true }) });
  OAuth2Client.mockImplementationOnce(() => ({ verifyIdToken }));
  const res = await google({ googleIdToken: 'g-token' });
  expect(res.status).toBe(200);
  expect(res.body.user.id).toBe(EXISTING);
  expect(verifyIdToken).toHaveBeenCalledWith({
    idToken: 'g-token',
    audience: ['android-client.apps.googleusercontent.com', 'web-client.apps.googleusercontent.com'],
  });

  OAuth2Client.mockImplementationOnce(() => ({ verifyIdToken: jest.fn().mockRejectedValue(new Error('Wrong recipient')) }));
  expect((await google({ googleIdToken: 'other-app' })).status).toBe(401);
});

test('[C1.18] the sign-in methods offered follow what is configured', async () => {
  firebase.firebaseReady.mockReturnValue(false);
  delete process.env.GOOGLE_OAUTH_CLIENT_IDS;
  expect(googleSignIn.enabled()).toBe(false);
  expect((await request(app).get('/auth/methods')).body.methods.google).toBe(false);
  firebase.firebaseReady.mockReturnValue(true);
  expect((await request(app).get('/auth/methods')).body.methods.google).toBe(true);
});
