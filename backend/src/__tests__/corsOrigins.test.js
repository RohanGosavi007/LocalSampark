/**
 * Which browser origins the API will answer with credentials.
 */

const { isAllowedOrigin, configuredOrigins } = require('../config/origins');

const KEYS = ['NODE_ENV', 'CLIENT_URL', 'ADMIN_URL', 'ALLOWED_ORIGINS', 'RENDER_EXTERNAL_URL'];
let saved;

beforeEach(() => {
  saved = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));
  for (const key of KEYS) delete process.env[key];
});
afterEach(() => {
  for (const key of KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

test('in production only the configured sites are allowed', () => {
  process.env.NODE_ENV = 'production';
  process.env.CLIENT_URL = 'https://localsampark-web.onrender.com/';
  process.env.ADMIN_URL = 'https://admin.localsampark.in';
  process.env.ALLOWED_ORIGINS = 'https://www.localsampark.in , https://localsampark.in';

  expect(configuredOrigins()).toEqual([
    'https://localsampark-web.onrender.com',
    'https://admin.localsampark.in',
    'https://www.localsampark.in',
    'https://localsampark.in',
  ]);
  for (const origin of configuredOrigins()) expect(isAllowedOrigin(origin)).toBe(true);
  expect(isAllowedOrigin('https://localsampark-web.onrender.com/')).toBe(true);
});

test('another site on the same hosting platform is not one of ours', () => {
  process.env.NODE_ENV = 'production';
  process.env.CLIENT_URL = 'https://localsampark-web.onrender.com';

  // Anyone can register these.
  expect(isAllowedOrigin('https://attacker.onrender.com')).toBe(false);
  expect(isAllowedOrigin('https://localsampark-web.onrender.com.evil.example')).toBe(false);
  expect(isAllowedOrigin('https://evil.example')).toBe(false);
});

test('localhost is for development and test, not for a deployed server', () => {
  for (const env of ['production', 'staging', undefined]) {
    if (env === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = env;
    expect(isAllowedOrigin('http://localhost:3000')).toBe(false);
  }
  for (const env of ['development', 'test']) {
    process.env.NODE_ENV = env;
    expect(isAllowedOrigin('http://localhost:3000')).toBe(true);
    expect(isAllowedOrigin('http://127.0.0.1:3001')).toBe(true);
    // Being in development does not open the door to everything else.
    expect(isAllowedOrigin('https://evil.example')).toBe(false);
  }
});

test('a request with no Origin is not a browser cross-origin request', () => {
  process.env.NODE_ENV = 'production';
  expect(isAllowedOrigin(undefined)).toBe(true);
});
