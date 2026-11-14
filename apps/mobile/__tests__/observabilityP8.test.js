/**
 * P8 Observability on Android: crash reports leave the phone without personal
 * data, and are not sent at all unless a DSN is set.
 *
 * Sentry's React Native SDK installs JS and native crash handlers. Left at its
 * defaults, a report can carry request URLs with tokens, failed-request
 * details, and whatever an error message happened to contain (a phone number in
 * "could not send code to +91...").
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.resolve(ROOT, p), 'utf8').replace(/\r\n/g, '\n');

describe('[P8.9] the Android copy of the redaction rules matches the shared one', () => {
  const normalise = (text) => text
    .replace(/\/\*\*[\s\S]*?\*\//, '') // the header comment differs on purpose
    .replace(/module\.exports = \{([^}]*)\};/, 'EXPORTS {$1};')
    .replace(/export \{([^}]*)\};/, 'EXPORTS {$1};');

  test('[P8.9] apps/mobile/src/redact.js is the shared file, byte for byte, apart from its header and export line', () => {
    expect(normalise(read('src/redact.js'))).toBe(normalise(read('../../packages/shared/redact.js')));
  });

  test('[P8.9] it has no regex lookbehind (older Hermes and browsers fail to parse one)', () => {
    expect(read('src/redact.js')).not.toMatch(/\(\?<[=!]/);
  });
});

describe('[P8.9] what an Android crash report may contain', () => {
  const { scrubEvent, scrubBreadcrumb, redactText, REDACTED } = require('../src/redact');

  test('[P8.9] phone numbers, e-mail addresses, tokens and passwords are masked in a message', () => {
    expect(redactText('Could not send code to +919876543210 (a.b@example.com) token=abc123 password: hunter2'))
      .toBe(`Could not send code to +91******3210 (a***@example.com) token=${REDACTED} password: ${REDACTED}`);
  });

  test('[P8.9] an event loses auth headers, cookies, request bodies, secret query values and personal user details', () => {
    const event = scrubEvent({
      request: {
        url: 'https://api.example.in/api/v1/verify?token=secretvalue',
        headers: { Authorization: 'Bearer abc', 'content-type': 'application/json' },
        data: { phone: '9876543210' },
        cookies: { sid: '1' },
      },
      user: { id: 7, email: 'a@b.com', ip_address: '1.2.3.4', phone_number: '9876543210' },
      exception: { values: [{ value: 'failed for 9876543210' }] },
      extra: { refreshToken: 'r', screen: 'orders' },
    });
    expect(event.request.headers.Authorization).toBe(REDACTED);
    expect(event.request.headers['content-type']).toBe('application/json');
    expect(event.request.data).toBeUndefined();
    expect(event.request.cookies).toBeUndefined();
    expect(event.request.url).toBe(`https://api.example.in/api/v1/verify?token=${REDACTED}`);
    expect(event.user).toEqual({ id: '7' });
    expect(event.extra).toEqual({ refreshToken: REDACTED, screen: 'orders' });
    expect(JSON.stringify(event)).not.toMatch(/9876543210|a@b\.com|1\.2\.3\.4|secretvalue/);
  });

  test('[P8.9] console breadcrumbs are dropped; others are masked', () => {
    expect(scrubBreadcrumb({ category: 'console', message: 'x' })).toBeNull();
    expect(scrubBreadcrumb({ category: 'xhr', message: 'GET ?otp=123456', data: { authorization: 'Bearer z' } }))
      .toEqual({ category: 'xhr', message: `GET ?otp=${REDACTED}`, data: { authorization: REDACTED } });
  });
});

describe('[P8.9] the Android Sentry setup', () => {
  const saved = process.env.EXPO_PUBLIC_SENTRY_DSN;
  afterEach(() => {
    if (saved === undefined) delete process.env.EXPO_PUBLIC_SENTRY_DSN; else process.env.EXPO_PUBLIC_SENTRY_DSN = saved;
    jest.resetModules();
  });

  function load(dsn) {
    jest.resetModules();
    if (dsn) process.env.EXPO_PUBLIC_SENTRY_DSN = dsn; else delete process.env.EXPO_PUBLIC_SENTRY_DSN;
    const sdk = { init: jest.fn(), wrap: jest.fn((c) => c), captureException: jest.fn() };
    jest.doMock('@sentry/react-native', () => sdk, { virtual: true });
    const mod = require('../src/sentry');
    return { sdk, mod };
  }

  test('[P8.9] without a DSN nothing is initialised and reporting calls are harmless no-ops', () => {
    const { sdk, mod } = load(null);
    expect(sdk.init).not.toHaveBeenCalled();
    expect(mod.isEnabled()).toBe(false);
    expect(() => mod.captureException(new Error('x'))).not.toThrow();
    expect(sdk.captureException).not.toHaveBeenCalled();
  });

  test('[P8.9] with a DSN it initialises with the release, native crash handling, low trace sampling, no default PII and the scrubbers', () => {
    const { sdk, mod } = load('https://key@o1.ingest.sentry.io/2');
    expect(sdk.init).toHaveBeenCalledTimes(1);
    const options = sdk.init.mock.calls[0][0];
    expect(options).toMatchObject({
      dsn: 'https://key@o1.ingest.sentry.io/2',
      enableNative: true,
      enableNativeCrashHandling: true,
      sendDefaultPii: false,
      tracesSampleRate: 0.1,
    });
    expect(options.release).toMatch(/^in\.localsampark\.app@/);
    expect(options.beforeSend).toBe(require('../src/redact').scrubEvent);
    expect(options.beforeBreadcrumb).toBe(require('../src/redact').scrubBreadcrumb);
    expect(mod.isEnabled()).toBe(true);
    mod.captureException(new Error('boom'), { screen: 'orders' });
    expect(sdk.captureException).toHaveBeenCalledTimes(1);
  });

  test('[P8.9] the SDK being unavailable never takes the app down', () => {
    jest.resetModules();
    process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://key@o1.ingest.sentry.io/2';
    jest.doMock('@sentry/react-native', () => { throw new Error('native module missing'); }, { virtual: true });
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const mod = require('../src/sentry');
    expect(mod.isEnabled()).toBe(false);
    expect(() => mod.captureException(new Error('x'))).not.toThrow();
    expect(mod.wrap('Root')).toBe('Root');
    warn.mockRestore();
  });
});
