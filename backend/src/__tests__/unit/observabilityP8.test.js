/**
 * P8 Observability — what the API logs and what it reports, without secrets.
 *
 * P8.10  logs are redacted on the way out: tokens, OTPs, passwords, JWTs, bearer
 *       headers, database URLs, phone numbers, e-mail addresses.
 * P8.11  Sentry: off without a production DSN; sampling, release and scrubbing
 *       are set in config/sentry.js (it used to trace and profile 100% of requests).
 * P8.12  the WhatsApp one-time code is not handed back to whoever asks for it.
 * P8.13  no log statement prints a credential.
 */
const fs = require('fs');
const path = require('path');
const express = require('express');
const request = require('supertest');
const { redactText, redactValue, REDACTED } = require('../../utils/logRedaction');
const { sentryConfig, scrubEvent, validDsn } = require('../../config/sentry');

const SRC = path.join(__dirname, '../..');

describe('[P8.10] logs are redacted on the way out', () => {
  test('[P8.10] credentials in a message are masked, the rest of it is left alone', () => {
    const out = redactText('Password reset for user 42: token=9f8e7d6c5b4a password: hunter2 Bearer abcdefghijklmnop done');
    expect(out).toBe(`Password reset for user 42: token=${REDACTED} password: ${REDACTED} Bearer ${REDACTED} done`);
  });

  test('[P8.10] a JWT, a secret query parameter and a database URL password are masked', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiIxMjMifQ.c2lnbmF0dXJlMTIz';
    expect(redactText(`auth ${jwt} ok`)).toBe('auth [jwt] ok');
    expect(redactText('GET /verify-email?token=abc123&lang=en')).toBe(`GET /verify-email?token=${REDACTED}&lang=en`);
    expect(redactText('connect postgresql://app:s3cr3t@db.internal:5432/prod failed')).toBe('connect postgresql://app:***@db.internal:5432/prod failed');
  });

  test('[P8.10] phone numbers keep their last four digits and e-mail addresses their first letter', () => {
    expect(redactText('OTP sent to +919876543210')).toBe('OTP sent to +91******3210');
    expect(redactText('call 9876543210 or 91 9876543210')).toBe('call ******3210 or +91******3210');
    expect(redactText('mail rohan.k@example.com')).toBe('mail r***@example.com');
  });

  test('[P8.10] things that only look like phone numbers are left alone', () => {
    const text = 'order 5f9b2c1e-1234-4abc-8def-919876543210 at 1731582000123 total 1234567890.50 id 2026111400';
    expect(redactText(text)).toBe(text);
  });

  test('[P8.10] a value under a secret-named key is replaced whole, however deep; harmless counters are kept', () => {
    const out = redactValue({
      userId: 7,
      token: 'abc',
      nested: { authorization: 'Bearer x', ok: 'fine', list: [{ otp: 123456, name: 'n' }] },
      tokenVersion: 3,
      usedRefreshTokens: 4,
      password: 'p',
    });
    expect(out).toEqual({
      userId: 7,
      token: REDACTED,
      nested: { authorization: REDACTED, ok: 'fine', list: [{ otp: REDACTED, name: 'n' }] },
      tokenVersion: 3,
      usedRefreshTokens: 4,
      password: REDACTED,
    });
  });

  test('[P8.10] an Error keeps its stack but loses the credentials in it, and a cycle does not hang', () => {
    const error = new Error('db down password=hunter2');
    const out = redactValue(error);
    expect(out).toBeInstanceOf(Error);
    expect(out.message).toBe(`db down password=${REDACTED}`);
    expect(out.stack).not.toMatch(/hunter2/);
    const loop = { a: 1 }; loop.self = loop;
    expect(redactValue(loop).self).toBe('[Circular]');
  });

  test('[P8.10] the real logger writes redacted JSON: nothing reaches a transport unmasked', async () => {
    const winston = require('winston');
    const { Writable } = require('stream');
    const lines = [];
    const sink = new Writable({ write(chunk, _enc, done) { lines.push(chunk.toString()); done(); } });
    const logger = winston.createLogger({
      format: winston.format.combine(winston.format.errors({ stack: true }), require('../../utils/logRedaction').winstonRedactor(winston), winston.format.json()),
      transports: [new winston.transports.Stream({ stream: sink })],
    });
    logger.info('reset token: abcdef123456 sent to a.b@example.com', { password: 'p', phone: '9876543210', extra: { refreshToken: 'r' } });
    logger.error(new Error('failed with authorization: Bearer abcdefghijkl'));
    await new Promise((resolve) => setImmediate(resolve));
    const all = lines.join('');
    for (const secret of ['abcdef123456', 'a.b@example.com', '"p"', '9876543210', 'abcdefghijkl']) expect(all).not.toContain(secret);
    expect(all).toContain(REDACTED);
    // And the shared logger itself has the redactor first in its format chain.
    const loggerSource = fs.readFileSync(path.join(SRC, 'config/logger.js'), 'utf8');
    expect(loggerSource).toMatch(/winston\.format\.errors\(\{ stack: true \}\),\s*winstonRedactor\(winston\)/);
  });
});

describe('[P8.11] Sentry reports errors, sampled, with a release, and scrubbed', () => {
  const prod = { NODE_ENV: 'production', SENTRY_DSN: 'https://publickey@o123.ingest.sentry.io/456' };

  test('[P8.11] it is off outside production and without a valid DSN, so local runs and tests send nothing', () => {
    expect(sentryConfig({ ...prod, NODE_ENV: 'test' }).enabled).toBe(false);
    expect(sentryConfig({ NODE_ENV: 'production' }).enabled).toBe(false);
    expect(sentryConfig({ NODE_ENV: 'production', SENTRY_DSN: 'YOUR_SENTRY_DSN' }).enabled).toBe(false);
    expect(sentryConfig({ NODE_ENV: 'production', SENTRY_DSN: 'http://key@host/1' }).enabled).toBe(false);
    expect(validDsn(prod.SENTRY_DSN)).toBe(true);
  });

  test('[P8.11] traces default to 10% and profiling to off (it was 100% of both), and both can be tuned', () => {
    const { options } = sentryConfig(prod);
    expect(options).toMatchObject({ tracesSampleRate: 0.1, profilesSampleRate: 0, sendDefaultPii: false, environment: 'production' });
    expect(sentryConfig({ ...prod, SENTRY_TRACES_SAMPLE_RATE: '0.5', SENTRY_PROFILES_SAMPLE_RATE: '0.2' }).options).toMatchObject({ tracesSampleRate: 0.5, profilesSampleRate: 0.2 });
    expect(sentryConfig({ ...prod, SENTRY_TRACES_SAMPLE_RATE: '7' }).options.tracesSampleRate).toBe(0.1);
  });

  test('[P8.11] every report carries the release: the commit when there is one', () => {
    expect(sentryConfig({ ...prod, GIT_COMMIT: 'abc123' }).options.release).toBe('abc123');
    expect(sentryConfig({ ...prod, RENDER_GIT_COMMIT: 'def456' }).options.release).toBe('def456');
    expect(sentryConfig({ ...prod, SENTRY_RELEASE: 'v9' , GIT_COMMIT: 'abc123' }).options.release).toBe('v9');
    expect(sentryConfig(prod, '2.3.4').options.release).toBe('localsampark-api@2.3.4');
  });

  test('[P8.11] an event loses auth headers, cookies, bodies, secret query values and all personal user details', () => {
    const event = scrubEvent({
      message: 'failed for +919876543210 token=abc123',
      request: {
        url: 'https://api.example.in/verify?token=secretvalue&x=1',
        headers: { Authorization: 'Bearer abc', Cookie: 'sid=1', 'content-type': 'application/json', 'X-Razorpay-Signature': 'sig' },
        cookies: { sid: '1' },
        data: { phone: '9876543210', password: 'p' },
        query_string: 'otp=123456&page=2',
      },
      user: { id: 42, email: 'a@b.com', phone_number: '9876543210', ip_address: '1.2.3.4', username: 'rohan' },
      exception: { values: [{ type: 'Error', value: 'bad password=hunter2' }] },
      extra: { token: 'abc', note: 'fine' },
      breadcrumbs: [{ category: 'console', message: 'x' }, { category: 'http', message: 'GET ?token=abc', data: { authorization: 'Bearer z', url: '/x' } }],
    });
    expect(event.request.headers).toMatchObject({ Authorization: REDACTED, Cookie: REDACTED, 'X-Razorpay-Signature': REDACTED, 'content-type': 'application/json' });
    expect(event.request.cookies).toBeUndefined();
    expect(event.request.data).toBeUndefined();
    expect(event.request.url).toBe(`https://api.example.in/verify?token=${REDACTED}&x=1`);
    expect(event.request.query_string).toBe(`otp=${REDACTED}&page=2`);
    expect(event.user).toEqual({ id: '42' });
    expect(event.message).toBe(`failed for +91******3210 token=${REDACTED}`);
    expect(event.exception.values[0].value).toBe(`bad password=${REDACTED}`);
    expect(event.extra).toEqual({ token: REDACTED, note: 'fine' });
    expect(event.breadcrumbs).toEqual([{ category: 'http', message: `GET ?token=${REDACTED}`, data: { authorization: REDACTED, url: '/x' } }]);
    expect(JSON.stringify(event)).not.toMatch(/9876543210|hunter2|a@b\.com|1\.2\.3\.4|secretvalue/);
  });

  test('[P8.11] server.js uses these settings instead of its own', () => {
    const server = fs.readFileSync(path.join(SRC, 'server.js'), 'utf8');
    expect(server).toMatch(/sentryConfig\(undefined, /);
    expect(server).not.toMatch(/tracesSampleRate:\s*1\.0/);
    expect(server).not.toMatch(/profilesSampleRate:\s*1\.0/);
  });
});

describe('[P8.12] the WhatsApp one-time code is not given to whoever asks', () => {
  const saved = { ...process.env };
  afterEach(() => { process.env = { ...saved }; jest.resetModules(); jest.dontMock('../../modules/core/services/whatsapp.service'); jest.dontMock('../../modules/core/services/otpStore.service'); });

  function appFor(nodeEnv, { configured }) {
    jest.resetModules();
    process.env.NODE_ENV = nodeEnv;
    delete process.env.ALLOW_FREE_OTP_MODE;
    process.env.ENABLE_PHONE_OTP = 'true'; // phone codes are on: the case where the leak mattered
    jest.doMock('../../modules/core/services/whatsapp.service', () => ({
      isConfigured: () => configured,
      sendOtpTemplate: async () => true,
      getWhatsAppWebLink: (phone, text) => `https://wa.me/${String(phone).replace(/\D/g, '')}?text=${encodeURIComponent(text)}`,
    }));
    jest.doMock('../../modules/core/services/otpStore.service', () => ({
      unavailableReason: () => null,
      allowSend: async () => true,
      setOtp: async () => {},
      deleteOtp: async () => {},
    }));
    const app = express();
    app.use(express.json());
    app.use('/auth', require('../../modules/core/routes/auth.routes'));
    return app;
  }

  test('[P8.12] in production, with WhatsApp configured, the response carries no code and no link that contains it', async () => {
    const res = await request(appFor('production', { configured: true })).post('/auth/send-whatsapp-otp').send({ phoneNumber: '+919876543210' });
    expect(res.status).toBe(200);
    expect(res.body.otp).toBeUndefined();
    expect(res.body.whatsappWebLink).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toMatch(/\b\d{6}\b/);
    expect(JSON.stringify(res.body)).not.toMatch(/wa\.me|verification code/i);
  });

  test('[P8.12] in production without WhatsApp it is refused before any code is made', async () => {
    const res = await request(appFor('production', { configured: false })).post('/auth/send-whatsapp-otp').send({ phoneNumber: '+919876543210' });
    expect(res.status).toBe(503);
    expect(JSON.stringify(res.body)).not.toMatch(/\b\d{6}\b|wa\.me/);
  });
});

describe('[P8.13] no log statement prints a credential', () => {
  function* sources(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (['__tests__', 'node_modules', 'data'].includes(e.name)) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) yield* sources(p);
      else if (e.name.endsWith('.js')) yield p;
    }
  }
  /** A logger/console call whose template or arguments interpolate a credential variable. */
  const LEAK = /(logger|console)\.(log|info|warn|error|debug)\(\s*`[^`]*\$\{\s*(token|resetToken|otp|otpCode|password|refreshToken|accessToken|secret|verifyLink|resetLink)\s*\}/;

  test('[P8.13] none of the API’s logger or console calls interpolates a token, code, password or link carrying one', () => {
    const found = [];
    for (const file of sources(SRC)) {
      const lines = fs.readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, i) => {
        if (!LEAK.test(line)) return;
        // Developer-only sinks (the console SMS provider, the sandbox OTP service) are named, not exempted by pattern.
        found.push(`${path.relative(SRC, file)}:${i + 1}: ${line.trim().slice(0, 110)}`);
      });
    }
    // The development-only SMS "console provider" prints the code on a developer's
    // machine by design (it is only reached in development and test). Anything
    // else is a leak.
    const allowed = ['modules/core/services/sms.service.js', 'services/smsOtp.service.js'];
    const leaks = found.filter((f) => !allowed.some((a) => f.replace(/\\/g, '/').startsWith(a)));
    expect(leaks).toEqual([]);
  });

  test('[P8.13] the scanner flags a leaking line (so a clean result means something)', () => {
    expect(LEAK.test('logger.info(`[PASSWORD RESET DEBUG] Reset token: ${token}`);')).toBe(true);
    expect(LEAK.test('logger.info(`[PASSWORD RESET] Reset issued for user ${user.id}`);')).toBe(false);
  });
});

describe('[P8.14] /ready says whether the schema is current, not just whether three tables exist', () => {
  const { migrationStatus, shippedMigrations } = require('../../services/readiness.service');
  const all = shippedMigrations();
  const rows = (names) => async () => ({ rows: names.map((filename) => ({ filename })) });

  test('[P8.14] every shipped migration applied: current and ready', async () => {
    expect(await migrationStatus(rows(all), { isSqlite: false })).toEqual({ state: 'current', pending: [], ready: true });
  });

  test('[P8.14] a database missing the latest migrations is NOT ready, and says which', async () => {
    const out = await migrationStatus(rows(all.slice(0, -2)), { isSqlite: false });
    expect(out.ready).toBe(false);
    expect(out.state).toBe('pending');
    expect(out.pending).toEqual(all.slice(-2));
    expect(all.some((f) => /^148_order_status_history/.test(f))).toBe(true); // the files this build ships include the newest ones
  });

  test('[P8.14] a PostgreSQL database with no schema_migrations table is reported untracked, not failed (so a hand-built database is not pulled out of rotation)', async () => {
    const out = await migrationStatus(async () => { throw new Error('relation "schema_migrations" does not exist'); }, { isSqlite: false });
    expect(out).toEqual({ state: 'untracked', pending: [], ready: true });
  });

  test('[P8.14] SQLite (development and test) does not track migrations and is not failed for it', async () => {
    expect(await migrationStatus(async () => { throw new Error('unused'); }, { isSqlite: true })).toEqual({ state: 'not_tracked', pending: [], ready: true });
  });

  test('[P8.14] the live probe reports it', async () => {
    const res = await request(require('../../server').app).get('/ready');
    expect(res.status).toBe(200);
    expect(['current', 'not_tracked']).toContain(res.body.checks.migrations);
  });
});
