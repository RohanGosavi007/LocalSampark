/**
 * CSRF protection for cookie-authenticated requests.
 *
 * WHY THIS EXISTS
 * ---------------
 * The admin panel used to keep its access token in localStorage and send it as
 * an Authorization header. That is immune to CSRF -- a header is never attached
 * automatically -- but it is readable by any script running on the page, so a
 * single XSS anywhere in the admin panel would hand over a full super-admin
 * session.
 *
 * Moving the token into an httpOnly cookie fixes that, and introduces the
 * opposite problem: browsers attach cookies to cross-site requests on their
 * own, so without a second factor any page on the internet could drive
 * state-changing calls against the API as a logged-in admin.
 *
 * THE SCHEME
 * ----------
 * Double-submit cookie. At login the server sets two cookies:
 *
 *   admin_token  httpOnly  -- the JWT. Script cannot read it.
 *   csrf_token   readable  -- a random value. Script CAN read it, deliberately.
 *
 * The client echoes csrf_token back in the X-CSRF-Token header. An attacker's
 * page can cause the cookies to be *sent*, but same-origin policy stops it
 * *reading* csrf_token from another origin, so it cannot produce the matching
 * header. The comparison below therefore fails for forged requests and passes
 * for genuine ones.
 *
 * WHAT IS AND IS NOT CHECKED
 * --------------------------
 *  - Only requests that authenticated via the cookie (req.authSource ===
 *    'cookie', set in auth.middleware.js). Bearer-header callers -- the mobile
 *    app, scripts, curl -- are unaffected, which is what keeps this backwards
 *    compatible.
 *  - Only unsafe methods. GET/HEAD/OPTIONS are exempt per the usual rule that
 *    safe methods must not change state; note that this assumes the API honours
 *    that, which is worth remembering if a GET ever starts mutating.
 *
 * This runs AFTER authenticate(), because it needs req.authSource.
 */
const crypto = require('crypto');

const CSRF_COOKIE = 'csrf_token';
const CSRF_HEADER = 'x-csrf-token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** A fresh, unguessable CSRF value. */
function generateCsrfToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Constant-time compare, so that a token cannot be recovered one byte at a
 * time by measuring how long the rejection takes.
 */
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  // timingSafeEqual throws on a length mismatch, which would itself leak the
  // length, so normalise by hashing to a fixed width first.
  const hashA = crypto.createHash('sha256').update(bufA).digest();
  const hashB = crypto.createHash('sha256').update(bufB).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

const verifyCsrf = (req, res, next) => {
  if (req.authSource !== 'cookie') return next();
  if (SAFE_METHODS.has(req.method)) return next();

  const fromCookie = req.cookies && req.cookies[CSRF_COOKIE];
  const fromHeader = req.get(CSRF_HEADER);

  if (!fromCookie || !fromHeader || !safeEqual(fromCookie, fromHeader)) {
    return res.status(403).json({
      error:
        'CSRF check failed. Send the csrf_token cookie value in the X-CSRF-Token header, or sign in again.',
      code: 'CSRF_INVALID',
    });
  }

  return next();
};

module.exports = {
  verifyCsrf,
  generateCsrfToken,
  CSRF_COOKIE,
  CSRF_HEADER,
};
