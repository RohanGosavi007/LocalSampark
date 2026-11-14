/**
 * P5 Notification providers — one interface, several carriers, no secrets in logs.
 *
 * P5.2  which email carrier is used (Resend, Brevo, SMTP, a local outbox, none).
 * P5.3  each carrier's request: where it goes, how it authenticates, what it carries;
 *       a failure or a timeout is an answer, never an exception, and never contains the key.
 * P5.4  development writes the message to a local outbox and logs no body; production
 *       with no carrier says "not sent" instead of pretending.
 * P5.5  sendEmail uses them: and a password-reset token never reaches a log line.
 * P5.6  SMS never "succeeds" in production without a gateway (D3: phone codes are behind a flag).
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const providers = require('../../modules/core/services/emailProviders');
const logger = require('../../config/logger');

const realFetch = global.fetch;
const saved = { ...process.env };
afterEach(() => { global.fetch = realFetch; process.env = { ...saved }; jest.restoreAllMocks(); });

const message = { from: 'LocalSampark <noreply@localsampark.in>', to: 'rohan@example.com', subject: 'Hello | LocalSampark', html: '<p>Hi</p>' };

describe('[P5.2] which carrier sends the email', () => {
  const pick = (env) => providers.resolveProvider(env);
  test('[P5.2] EMAIL_PROVIDER decides when it names a carrier', () => {
    for (const name of ['resend', 'brevo', 'smtp', 'file', 'none']) expect(pick({ EMAIL_PROVIDER: name.toUpperCase() })).toBe(name);
    expect(pick({ EMAIL_PROVIDER: 'carrier-pigeon', NODE_ENV: 'production' })).toBe('none');
  });
  test('[P5.2] otherwise the first carrier with credentials: Resend, then Brevo, then SMTP', () => {
    expect(pick({ RESEND_API_KEY: 'r', BREVO_API_KEY: 'b', SMTP_USER: 's' })).toBe('resend');
    expect(pick({ BREVO_API_KEY: 'b', SMTP_USER: 's' })).toBe('brevo');
    expect(pick({ SMTP_USER: 's', NODE_ENV: 'production' })).toBe('smtp');
  });
  test('[P5.2] with none: a local outbox in development and test, nothing in production', () => {
    expect(pick({ NODE_ENV: 'development' })).toBe('file');
    expect(pick({ NODE_ENV: 'test' })).toBe('file');
    expect(pick({ NODE_ENV: 'production' })).toBe('none');
  });
});

describe('[P5.3] what each carrier sends, and what a failure looks like', () => {
  const respond = (status, body) => jest.fn(async () => ({ ok: status < 400, status, json: async () => body }));

  test('[P5.3] Resend: bearer key, JSON body, one recipient, the message id comes back', async () => {
    process.env.RESEND_API_KEY = 're_secret_key_123';
    global.fetch = respond(200, { id: 'em_1' });
    const out = await providers.deliver(message, {}, process.env);
    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.headers.Authorization).toBe('Bearer re_secret_key_123');
    expect(JSON.parse(init.body)).toEqual({ from: message.from, to: ['rohan@example.com'], subject: message.subject, html: '<p>Hi</p>' });
    expect(init.signal).toBeDefined(); // bounded: it cannot hold a request open for ever
    expect(out).toEqual({ provider: 'resend', success: true, messageId: 'em_1' });
  });

  test('[P5.3] Brevo: api-key header, the sender split into name and address', async () => {
    process.env.BREVO_API_KEY = 'xkeysib-secret';
    global.fetch = respond(201, { messageId: '<m1@brevo>' });
    const out = await providers.deliver(message, {}, process.env);
    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe('https://api.brevo.com/v3/smtp/email');
    expect(init.headers['api-key']).toBe('xkeysib-secret');
    expect(JSON.parse(init.body)).toEqual({ sender: { name: 'LocalSampark', email: 'noreply@localsampark.in' }, to: [{ email: 'rohan@example.com' }], subject: message.subject, htmlContent: '<p>Hi</p>' });
    expect(out).toMatchObject({ provider: 'brevo', success: true, messageId: '<m1@brevo>' });
  });

  test('[P5.3] SMTP: sent through the transport it is given', async () => {
    process.env.SMTP_USER = 'user@example.com';
    const sendMail = jest.fn(async () => ({ messageId: 'smtp-1' }));
    const out = await providers.deliver(message, { transporter: { sendMail } }, process.env);
    expect(sendMail).toHaveBeenCalledWith(message);
    expect(out).toMatchObject({ provider: 'smtp', success: true, messageId: 'smtp-1' });
  });

  test('[P5.3] a carrier error, a refusal and a timeout are answers, not exceptions, and the key is never in them', async () => {
    process.env.RESEND_API_KEY = 're_secret_key_123';
    global.fetch = respond(422, { message: 'The to field must be a valid email' });
    expect(await providers.deliver(message, {}, process.env)).toEqual({ provider: 'resend', success: false, error: 'The to field must be a valid email' });

    global.fetch = jest.fn(async () => { throw Object.assign(new Error('The operation was aborted due to timeout'), { name: 'TimeoutError' }); });
    const timedOut = await providers.deliver(message, {}, process.env);
    expect(timedOut).toMatchObject({ provider: 'resend', success: false });
    expect(JSON.stringify(timedOut)).not.toContain('re_secret_key_123');

    global.fetch = respond(500, null);
    expect((await providers.deliver(message, {}, process.env)).error).toBe('HTTP 500');
  });

  test('[P5.3] a sender written as a bare address is passed through', () => {
    expect(providers.parseAddress('noreply@localsampark.in')).toEqual({ email: 'noreply@localsampark.in' });
    expect(providers.parseAddress('"Local Sampark" <a@b.in>')).toEqual({ name: 'Local Sampark', email: 'a@b.in' });
  });
});

describe('[P5.4] the development outbox, and production with no carrier', () => {
  test('[P5.4] in development the message is a file in the outbox; nothing is sent', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ls-outbox-'));
    process.env.EMAIL_OUTBOX_DIR = dir;
    global.fetch = jest.fn();
    const out = await providers.deliver({ ...message, html: '<p>code 483920</p>' }, {}, { NODE_ENV: 'development' });
    expect(out).toMatchObject({ provider: 'file', success: true, mock: true });
    const saved = JSON.parse(fs.readFileSync(out.file, 'utf8'));
    expect(saved).toMatchObject({ to: 'rohan@example.com', subject: message.subject, html: '<p>code 483920</p>' });
    expect(global.fetch).not.toHaveBeenCalled();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('[P5.4] in production with no carrier it says so and sends nothing', async () => {
    global.fetch = jest.fn();
    const out = await providers.deliver(message, {}, { NODE_ENV: 'production' });
    expect(out).toMatchObject({ provider: 'none', success: false, error: 'EMAIL_NOT_CONFIGURED' });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('[P5.5] sendEmail uses the carriers, and never logs a message body', () => {
  const load = () => { jest.resetModules(); return require('../../modules/core/services/email.service'); };

  test('[P5.5] a password-reset email: delivered through the carrier, and its token appears in no log line', async () => {
    process.env.NODE_ENV = 'development';
    for (const k of ['RESEND_API_KEY', 'BREVO_API_KEY', 'SMTP_USER', 'EMAIL_PROVIDER']) delete process.env[k];
    process.env.EMAIL_OUTBOX_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ls-outbox-'));
    const token = 'f3a9c1d27b8e4a60b5c2d9e1f0a47b3c8d6e2f1a9b0c4d7e5f8a1b2c3d4e5f60';
    const lines = [];
    const spy = (level) => jest.spyOn(require('../../config/logger'), level).mockImplementation((...args) => { lines.push(args.map(String).join(' ')); });
    const email = load();
    for (const level of ['info', 'warn', 'error']) spy(level);
    jest.spyOn(console, 'error').mockImplementation((...args) => lines.push(args.map(String).join(' ')));

    const result = await email.sendEmail('rohan@example.com', 'Password Reset Request', `<h2>Password Reset</h2><p>Use the token below:</p><h3>${token}</h3>`);

    expect(result).toMatchObject({ success: true, mock: true, provider: 'file' });
    expect(fs.readdirSync(process.env.EMAIL_OUTBOX_DIR)).toHaveLength(1);
    expect(lines.join('\n')).not.toContain(token);
    expect(lines.join('\n')).not.toMatch(/Content preview|Password Reset<\/h2>/);
    fs.rmSync(process.env.EMAIL_OUTBOX_DIR, { recursive: true, force: true });
  });

  test('[P5.5] with Resend configured, sendEmail goes through it and reports the carrier', async () => {
    process.env.NODE_ENV = 'production';
    process.env.RESEND_API_KEY = 're_x';
    global.fetch = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({ id: 'em_9' }) }));
    jest.spyOn(require('../../config/logger'), 'info').mockImplementation(() => {});
    const email = load();
    expect(await email.sendEmail('a@b.in', 'Order placed', '<p>x</p>')).toMatchObject({ success: true, messageId: 'em_9', provider: 'resend' });
    expect(JSON.parse(global.fetch.mock.calls[0][1].body).subject).toBe('Order placed | LocalSampark');
  });

  test('[P5.5] in production with no carrier, sendEmail reports "not sent" instead of "success"', async () => {
    process.env.NODE_ENV = 'production';
    for (const k of ['RESEND_API_KEY', 'BREVO_API_KEY', 'SMTP_USER', 'EMAIL_PROVIDER']) delete process.env[k];
    jest.spyOn(require('../../config/logger'), 'warn').mockImplementation(() => {});
    const email = load();
    expect(await email.sendEmail('a@b.in', 'Hi', '<p>x</p>')).toMatchObject({ success: false, error: 'EMAIL_NOT_CONFIGURED', provider: 'none' });
  });

  test('[P5.5] the SMTP transport gives up on a silent server in seconds, not minutes', () => {
    const source = fs.readFileSync(path.join(__dirname, '../../modules/core/services/email.service.js'), 'utf8');
    expect(source).toMatch(/connectionTimeout: 10000/);
    expect(source).toMatch(/socketTimeout: 15000/);
    expect(source).not.toMatch(/Content preview/);
  });
});

describe('[P5.6] SMS: no pretend success in production, and phone codes behind a flag (D3)', () => {
  test('[P5.6] with no gateway configured, production answers "not delivered"; development prints the code', async () => {
    const sms = require('../../modules/core/services/sms.service');
    for (const k of ['MSG91_AUTH_KEY', 'FAST2SMS_API_KEY']) delete process.env[k];
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(logger, 'info').mockImplementation(() => {});
    process.env.NODE_ENV = 'production';
    expect(await sms.sendOTP('+919876543210', '123456')).toEqual({ provider: 'none', success: false });
    process.env.NODE_ENV = 'development';
    expect(await sms.sendOTP('+919876543210', '123456')).toEqual({ provider: 'console', success: true });
  });

  test('[P5.6] phone sign-in is off in production unless ENABLE_PHONE_OTP=true, on in development and test', () => {
    const { phoneOtpEnabled } = require('../../middleware/auth.middleware');
    expect(phoneOtpEnabled({ NODE_ENV: 'production' })).toBe(false);
    expect(phoneOtpEnabled({ NODE_ENV: 'production', ENABLE_PHONE_OTP: 'true' })).toBe(true);
    expect(phoneOtpEnabled({ NODE_ENV: 'development' })).toBe(true);
    expect(phoneOtpEnabled({ NODE_ENV: 'test', ENABLE_PHONE_OTP: 'false' })).toBe(false);
  });
});
