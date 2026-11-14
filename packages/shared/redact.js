/**
 * Keeps credentials and personal details out of logs and error reports (P8).
 *
 * One implementation, used by the API (its logger and Sentry), the web app and
 * the admin console. The Android app cannot import from outside its own folder
 * (Metro), so apps/mobile/src/redact.js is a copy, held in step by
 * apps/mobile/__tests__/observabilityP8.test.js.
 *
 * Logs are read by whoever runs the servers and are copied to third parties
 * (Sentry, a log host). Before this, the logger printed whatever it was given:
 * the API logged password-reset tokens, OTPs and verification links in full.
 * The most direct fix is to stop logging them (done at those call sites), but
 * a careless `logger.info(\`...\${token}\`)` is one keystroke away, so the
 * logger also redacts on the way out:
 *
 *   - values under a key that names a secret (password, token, otp, authorization,
 *     cookie, api key, card/bank numbers, ...) are replaced whole;
 *   - strings are scanned for JWTs, "Bearer ..." headers, `password=...` pairs,
 *     secret query parameters, database URLs with a password, phone numbers
 *     (kept to their last 4 digits) and e-mail addresses (first letter only).
 */

const REDACTED = '[REDACTED]';
const MAX_DEPTH = 6;

/** Keys whose value is a secret or sensitive identifier, whatever it contains. */
const SENSITIVE_KEY = /(pass(word|wd)?$|^pwd$|secret|token|authorization|^cookie|set-cookie|api[-_]?key|private[-_]?key|otp|^pin$|credential|signature|cvv|card[-_]?number|aadhaar|account[-_]?number|^pan$|pan[-_]?number|gstin)/i;
/** Not secrets, though their names look like it. */
const SAFE_KEY = /^(tokenversion|token_version|tokens?_?(used|count|cleaned)|usedrefreshtokens|stalelocks)$/i;

const PATTERNS = [
  [/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{4,}\b/g, '[jwt]'],
  [/\bBearer\s+[A-Za-z0-9._~+/-]{8,}=*/gi, 'Bearer [REDACTED]'],
  [/\b(password|passwd|pwd|secret|token|otp|api[_-]?key|authorization|access_token|refresh_token)(\s*[=:]\s*)(?!\[REDACTED\])("[^"]*"|'[^']*'|[^\s,;&]+)/gi, `$1$2${REDACTED}`],
  [/([?&](?:token|key|secret|signature|sig|otp|code|apikey|api_key|access_token)=)[^&\s"']+/gi, `$1${REDACTED}`],
  [/(postgres(?:ql)?:\/\/[^:\s/@]+:)[^@\s]+@/gi, '$1***@'],
  // Indian mobile numbers, with or without +91: keep the last four digits.
  // No lookbehind: this file is bundled for browsers, and Safari before 16.4
  // fails to PARSE a regex with one, which would break the whole page.
  [/(^|[^\w.-])(\+?91[\s-]?)?([6-9]\d{5})(\d{4})(?![\w.-])/g, (m, pre, cc, hidden, last4) => `${pre}${cc ? '+91' : ''}******${last4}`],
  [/\b([A-Za-z0-9])[A-Za-z0-9._%+-]*@([A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/g, '$1***@$2'],
];

/** A string with credentials and personal details masked. */
function redactText(text) {
  if (typeof text !== 'string' || text.length === 0) return text;
  let out = text;
  for (const [pattern, replacement] of PATTERNS) out = out.replace(pattern, replacement);
  return out;
}

/** A copy of any value with every string masked and every secret-named key replaced. Cycles and depth are bounded. */
function redactValue(value, depth = 0, seen = new WeakSet()) {
  if (typeof value === 'string') return redactText(value);
  if (value === null || typeof value !== 'object') return value;
  if (value instanceof Date) return value;
  if (seen.has(value)) return '[Circular]';
  if (depth >= MAX_DEPTH) return '[Truncated]';
  seen.add(value);

  if (value instanceof Error) {
    const copy = new Error(redactText(value.message));
    copy.name = value.name;
    copy.stack = redactText(value.stack);
    for (const key of Object.keys(value)) copy[key] = redactEntry(key, value[key], depth, seen);
    return copy;
  }
  if (Array.isArray(value)) return value.map((item) => redactValue(item, depth + 1, seen));

  const out = {};
  for (const key of Object.keys(value)) out[key] = redactEntry(key, value[key], depth, seen);
  return out;
}

function redactEntry(key, value, depth, seen) {
  if (SENSITIVE_KEY.test(key) && !SAFE_KEY.test(key) && value !== null && value !== undefined && typeof value !== 'boolean') {
    return REDACTED;
  }
  return redactValue(value, depth + 1, seen);
}

const SENSITIVE_HEADER = /^(authorization|cookie|set-cookie|x-api-key|x-auth-token|x-csrf-token|x-razorpay-signature|x-hub-signature.*|proxy-authorization)$/i;

/**
 * Removes credentials and personal details from an event before it leaves:
 * auth headers and cookies, request bodies (they hold passwords, OTPs, phone
 * numbers and addresses), secret query parameters, and everything about the user
 * except an opaque id. Strings are masked the same way the logger masks them.
 */
function scrubEvent(event) {
  if (!event || typeof event !== 'object') return event;
  const e = event;

  if (e.request) {
    delete e.request.cookies;
    delete e.request.data;
    if (e.request.headers) {
      for (const name of Object.keys(e.request.headers)) {
        if (SENSITIVE_HEADER.test(name)) e.request.headers[name] = REDACTED;
      }
    }
    if (typeof e.request.url === 'string') e.request.url = redactText(e.request.url);
    if (typeof e.request.query_string === 'string') e.request.query_string = redactText(`?${e.request.query_string}`).replace(/^\?/, '');
    else if (e.request.query_string) e.request.query_string = redactValue(e.request.query_string);
  }

  if (e.user) {
    e.user = e.user.id != null ? { id: String(e.user.id) } : undefined; // no ip, email, phone or name
  }

  if (typeof e.message === 'string') e.message = redactText(e.message);
  if (e.logentry && typeof e.logentry.message === 'string') e.logentry.message = redactText(e.logentry.message);
  if (e.exception && Array.isArray(e.exception.values)) {
    for (const v of e.exception.values) {
      if (typeof v.value === 'string') v.value = redactText(v.value);
    }
  }
  if (e.extra) e.extra = redactValue(e.extra);
  if (e.contexts) e.contexts = redactValue(e.contexts);
  if (Array.isArray(e.breadcrumbs)) e.breadcrumbs = e.breadcrumbs.map((b) => scrubBreadcrumb(b)).filter(Boolean);
  return e;
}

function scrubBreadcrumb(breadcrumb) {
  if (!breadcrumb) return breadcrumb;
  // Console output is the log: it has its own redaction and is not needed here.
  if (breadcrumb.category === 'console') return null;
  const b = { ...breadcrumb };
  if (typeof b.message === 'string') b.message = redactText(b.message);
  if (b.data) b.data = redactValue(b.data);
  return b;
}

module.exports = { REDACTED, redactText, redactValue, scrubEvent, scrubBreadcrumb };
