/**
 * Without Firebase credentials, the literal "mock_firebase_token" signed anyone in as
 * +919999999999 — in production too. The mock is for development and tests only.
 */

const ORIGINAL = { ...process.env };

function load(nodeEnv) {
  jest.resetModules();
  process.env.NODE_ENV = nodeEnv;
  delete process.env.FIREBASE_PROJECT_ID;
  delete process.env.FIREBASE_CLIENT_EMAIL;
  delete process.env.FIREBASE_PRIVATE_KEY;
  delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
  return require('../modules/core/services/firebase.service');
}

afterEach(() => {
  process.env = { ...ORIGINAL };
  jest.restoreAllMocks();
});

test('production refuses the mock token when Firebase is not configured', async () => {
  const { verifyFirebaseToken } = load('production');
  await expect(verifyFirebaseToken('mock_firebase_token')).rejects.toThrow(/not initialized/i);
});

test('development still accepts the mock token', async () => {
  const { verifyFirebaseToken } = load('development');
  await expect(verifyFirebaseToken('mock_firebase_token')).resolves.toMatchObject({ uid: 'mock_uid_123' });
});

test('any other token is refused everywhere when Firebase is not configured', async () => {
  const { verifyFirebaseToken } = load('development');
  await expect(verifyFirebaseToken('anything-else')).rejects.toThrow();
});
