/**
 * Where an email goes (P5): one interface, several carriers.
 *
 *   resend   Resend (https://resend.com), over HTTPS     RESEND_API_KEY
 *   brevo    Brevo (ex-Sendinblue), over HTTPS           BREVO_API_KEY
 *   smtp     any SMTP server (Gmail app password etc.)   SMTP_USER + SMTP_PASS
 *   file     development: written to backend/logs/outbox as a JSON file; nothing is sent
 *   none     production with no carrier configured: nothing is sent, and it says so
 *
 * EMAIL_PROVIDER picks one; without it the first of resend, brevo, smtp that has
 * its credentials is used, then `file` outside production, then `none`.
 *
 * Every carrier answers { success, messageId?, error? } and never throws. Each
 * HTTPS call is bounded (EMAIL_TIMEOUT_MS, 10 s): sendEmail is awaited inside
 * request handlers (an order status change, a refund), and a carrier that
 * never answers used to hold that request open.
 *
 * The development outbox is the only place a message body is written, and it is
 * a local file; a body is never logged. (The old development transport printed
 * the first 200 characters of every email, which for "reset your password" is the
 * reset token.)
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const TIMEOUT_MS = () => Number(process.env.EMAIL_TIMEOUT_MS) || 10000;
const OUTBOX = () => process.env.EMAIL_OUTBOX_DIR || path.join(__dirname, '../../../../logs/outbox');

/** 'Name <a@b.in>' or 'a@b.in' into { name, email }. */
function parseAddress(value) {
  const m = /^\s*(?:"?([^"<]*?)"?\s*)?<([^>]+)>\s*$/.exec(String(value || ''));
  return m ? { name: (m[1] || '').trim() || undefined, email: m[2].trim() } : { email: String(value || '').trim() };
}

/** The settings that choose a carrier, read by name. */
function readEnv() {
  return {
    EMAIL_PROVIDER: process.env.EMAIL_PROVIDER,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    BREVO_API_KEY: process.env.BREVO_API_KEY,
    SMTP_USER: process.env.SMTP_USER,
    NODE_ENV: process.env.NODE_ENV,
  };
}

/** Which carrier is in use, from the environment. */
function resolveProvider(env = readEnv()) {
  const wanted = String(env.EMAIL_PROVIDER || '').trim().toLowerCase();
  if (['resend', 'brevo', 'smtp', 'file', 'none'].includes(wanted)) return wanted;
  if (env.RESEND_API_KEY) return 'resend';
  if (env.BREVO_API_KEY) return 'brevo';
  if (env.SMTP_USER) return 'smtp';
  return env.NODE_ENV === 'production' ? 'none' : 'file';
}

async function postJson(url, headers, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS()),
  });
  let payload = null;
  try { payload = await response.json(); } catch { /* an empty or non-JSON body */ }
  if (!response.ok) {
    const reason = (payload && (payload.message || payload.error || payload.name)) || `HTTP ${response.status}`;
    throw new Error(String(reason).slice(0, 200));
  }
  return payload || {};
}

const carriers = {
  async resend({ from, to, subject, html }) {
    const out = await postJson('https://api.resend.com/emails', { Authorization: `Bearer ${process.env.RESEND_API_KEY}` }, { from, to: [to], subject, html });
    return { success: true, messageId: out.id };
  },

  async brevo({ from, to, subject, html }) {
    const sender = parseAddress(from);
    const out = await postJson('https://api.brevo.com/v3/smtp/email', { 'api-key': process.env.BREVO_API_KEY }, {
      sender, to: [{ email: to }], subject, htmlContent: html,
    });
    return { success: true, messageId: out.messageId };
  },

  async smtp({ from, to, subject, html }, { transporter }) {
    const info = await transporter.sendMail({ from, to, subject, html });
    return { success: true, messageId: info.messageId };
  },

  async file({ from, to, subject, html }) {
    const dir = OUTBOX();
    await fs.promises.mkdir(dir, { recursive: true });
    const id = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const file = path.join(dir, `${id}.json`);
    await fs.promises.writeFile(file, JSON.stringify({ from, to, subject, html, at: new Date().toISOString() }, null, 2));
    return { success: true, messageId: id, mock: true, file };
  },

  async none() {
    return { success: false, error: 'EMAIL_NOT_CONFIGURED', notConfigured: true };
  },
};

/**
 * Sends one message through the chosen carrier. Never throws.
 * `context.transporter` is the SMTP transport (kept by email.service).
 */
async function deliver(message, context = {}, env = readEnv()) {
  const provider = resolveProvider(env);
  try {
    const result = await carriers[provider](message, context);
    return { provider, ...result };
  } catch (error) {
    return { provider, success: false, error: String(error && error.message || error).slice(0, 200) };
  }
}

module.exports = { resolveProvider, deliver, parseAddress, carriers };
