const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { query, queryOne } = require('../../../config/database');
const { authLimiter } = require('../../../middleware/rateLimit.middleware');
const { v4: uuidv4 } = require('uuid');
const { generateTokens, authenticate } = require('../../../middleware/auth.middleware');
const otpStore = require('../../core/services/otpStore.service');
const { generateCsrfToken, CSRF_COOKIE } = require('../../../middleware/csrf.middleware');

// Default dev PIN for bootstrapping (will be bcrypt-compared)
const DEV_DEFAULT_PIN = '123456';

const ADMIN_TOKEN_COOKIE = 'admin_token';

/**
 * Cookie attributes for the admin session.
 *
 * sameSite is the awkward part. The admin panel and the API are served from
 * different origins (admin.localsampark.in vs the API host, or :3001 vs :5000
 * locally), so a 'strict' or 'lax' cookie would simply not be sent with the
 * panel's XHRs and every request would come back 401. 'none' is therefore
 * required, and 'none' is exactly the setting that permits cross-site replay --
 * which is why the CSRF token is not optional here.
 *
 * 'none' also requires Secure, which requires HTTPS. In development over plain
 * http://localhost that combination is rejected by the browser, so development
 * falls back to 'lax' + insecure, which works because both ends are localhost.
 */
function sessionCookieOptions(isProduction) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
    maxAge: 24 * 60 * 60 * 1000, // 24h, matching the access token's lifetime
  };
}

/**
 * Issues the httpOnly session cookie plus the readable CSRF cookie.
 * The CSRF cookie deliberately omits httpOnly: the client has to read it to
 * echo it back in the X-CSRF-Token header.
 */
function setAdminSessionCookies(res, accessToken) {
  const isProduction = process.env.NODE_ENV === 'production';
  const base = sessionCookieOptions(isProduction);

  res.cookie(ADMIN_TOKEN_COOKIE, accessToken, base);
  res.cookie(CSRF_COOKIE, generateCsrfToken(), { ...base, httpOnly: false });
}

/** Clears both cookies. Attributes must match those used to set them. */
function clearAdminSessionCookies(res) {
  const isProduction = process.env.NODE_ENV === 'production';
  const { maxAge, ...base } = sessionCookieOptions(isProduction);

  res.clearCookie(ADMIN_TOKEN_COOKIE, base);
  res.clearCookie(CSRF_COOKIE, { ...base, httpOnly: false });
}

// Separate login for admins
router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { phoneNumber, pin, otp } = req.body;
    const clientIp = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';

    if (!phoneNumber || !pin || !otp) {
      return res.status(400).json({ error: 'Phone, PIN, and OTP are required' });
    }

    // ── The OTP is now actually verified ────────────────────────────────
    //
    // Previously `otp` was destructured, checked for presence by the guard
    // above, and never looked at again. The second factor was therefore
    // decorative: any non-empty string passed, so admin sign-in reduced to
    // phone + PIN. The value could not be checked here because /auth/send-otp
    // kept its codes in a Map private to auth.routes.js — hence the shared
    // otpStore service this now reads from.
    //
    // Consumed on success, so a captured code cannot be replayed.
    const otpUnavailable = otpStore.unavailableReason();
    if (otpUnavailable) {
      console.error(`[admin-auth] rejected: ${otpUnavailable}`);
      return res.status(503).json({ error: 'Verification is temporarily unavailable. Please try again shortly.' });
    }

    const otpValid = await otpStore.verifyAndConsume(`otp:${phoneNumber}`, otp);
    if (!otpValid) {
      return res.status(401).json({ error: 'Invalid or expired OTP' });
    }

    // Check user and role
    let user = await queryOne('SELECT * FROM users WHERE phone_number = $1', [phoneNumber]);
    if (!user) {
      if (phoneNumber === '+919999999991' && pin === '123456' && process.env.NODE_ENV !== 'production') {
        // SQLite uses INTEGER PRIMARY KEY AUTOINCREMENT — do NOT insert a UUID as id
        await query('INSERT INTO users (phone_number, full_name, role) VALUES ($1, $2, $3)', [phoneNumber, 'God Developer', 'super_admin']);
        // Re-query to get the actual row with auto-assigned integer id
        user = await queryOne('SELECT * FROM users WHERE phone_number = $1', [phoneNumber]);
        if (!user) throw new Error('Failed to create dev admin user');
      } else {
        return res.status(403).json({ error: 'Access denied. User not found.' });
      }
    }

    // Verify admin role
    const adminRole = await queryOne('SELECT * FROM admin_roles WHERE user_id = $1 AND is_active = true', [user.id]);
    const isDirectAdmin = user.role === 'admin' || user.role === 'super_admin';
    if (!adminRole && !isDirectAdmin) {
      return res.status(403).json({ error: 'Access denied. Admin role not assigned.' });
    }

    // IP Allowlist Check
    const allowedIpsCount = await queryOne('SELECT COUNT(*) as count FROM admin_ip_allowlist WHERE is_active = true');
    if (allowedIpsCount && parseInt(allowedIpsCount.count) > 0) {
      const isAllowed = await queryOne('SELECT * FROM admin_ip_allowlist WHERE ip_address = $1 AND is_active = true', [clientIp]);
      // Simple localhost overrides for development convenience
      const isLocal = clientIp === '127.0.0.1' || clientIp === '::1' || clientIp.includes('::ffff:127.0.0.1');
      if (!isAllowed && !isLocal) {
        return res.status(403).json({ error: `Access denied from IP address ${clientIp}` });
      }
    }

    // Verify PIN code
    const adminPin = await queryOne('SELECT * FROM admin_pins WHERE user_id = $1', [user.id]);
    if (adminPin && adminPin.locked_until && new Date(adminPin.locked_until) > new Date()) {
      return res.status(403).json({ error: 'Account locked due to multiple failed PIN attempts. Try again later.' });
    }

    const allowDevPinShortcuts = process.env.NODE_ENV !== 'production';

    // Secure PIN verification with bcrypt. Two shortcuts below are development-only.
    let pinValid = false;
    if (adminPin && adminPin.pin_hash) {
      if (adminPin.pin_hash.startsWith('mock_pin_')) {
        // Legacy seed data stores the PIN in the clear as `mock_pin_<pin>`, so
        // a seeded mock_pin_123456 row makes that admin's PIN literally 123456.
        // Honouring it in production turns leftover seed data into a working
        // credential; refuse instead, and let the operator re-issue a PIN.
        // backend/src/scripts/purge_demo_credentials.js clears these rows.
        if (!allowDevPinShortcuts) {
          console.error(
            `[admin-auth] refusing legacy plaintext PIN hash for user ${user.id} in production. ` +
            'Run src/scripts/purge_demo_credentials.js and issue a new PIN.'
          );
          return res.status(403).json({ error: 'Admin PIN must be reset. Contact platform support.' });
        }
        pinValid = adminPin.pin_hash === `mock_pin_${pin}`;
        // Auto-upgrade: replace legacy hash with bcrypt
        if (pinValid) {
          const bcryptHash = await bcrypt.hash(pin, 12);
          await query('UPDATE admin_pins SET pin_hash = $1 WHERE user_id = $2', [bcryptHash, user.id]);
        }
      } else {
        // Proper bcrypt comparison
        pinValid = await bcrypt.compare(pin, adminPin.pin_hash);
      }
    } else {
      // No admin_pins record.
      //
      // This accepted DEV_DEFAULT_PIN ('123456') unconditionally and then
      // persisted it as the account's real PIN. In production that meant any
      // admin who had never set a PIN could be signed into by anyone who knew
      // the phone number — and the attacker's first successful login silently
      // established 123456 as that admin's standing credential.
      if (!allowDevPinShortcuts) {
        console.error(`[admin-auth] no admin_pins row for user ${user.id}; refusing the development default PIN in production.`);
        return res.status(403).json({ error: 'No admin PIN configured for this account. Contact platform support.' });
      }
      pinValid = (pin === DEV_DEFAULT_PIN);
      if (pinValid) {
        const bcryptHash = await bcrypt.hash(pin, 12);
        try {
          const pinId = uuidv4();
          await query('INSERT INTO admin_pins (id, user_id, pin_hash, failed_attempts) VALUES ($1, $2, $3, 0)',
            [pinId, user.id, bcryptHash]
          );
        } catch(e) { /* table might not exist yet, ignore */ }
      }
    }
    
    if (!pinValid) {
      if (adminPin) {
        const attempts = (adminPin.failed_attempts || 0) + 1;
        if (attempts >= 5) {
          const lockTime = new Date(Date.now() + 15 * 60 * 1000).toISOString();
          await query('UPDATE admin_pins SET failed_attempts = $1, locked_until = $2 WHERE user_id = $3', [attempts, lockTime, user.id]);
        } else {
          await query('UPDATE admin_pins SET failed_attempts = $1 WHERE user_id = $2', [attempts, user.id]);
        }
      }
      return res.status(401).json({ error: 'Invalid Admin PIN code.' });
    }

    // Reset PIN failed attempts
    if (adminPin) {
      await query('UPDATE admin_pins SET failed_attempts = 0, locked_until = NULL WHERE user_id = $1', [user.id]);
    }

    // Generate Admin JWT tokens
    const roleString = (adminRole ? adminRole.role : user.role).toUpperCase();
    const regionId = adminRole ? adminRole.region_id : user.region_id;

    const { accessToken } = generateTokens(
      user.id, 
      roleString, 
      user.token_version || 0,
      { regionId, isAdminSession: true }
    );

    // Session log
    await query(`INSERT INTO admin_audit_log (id, admin_id, action, target_type, target_id, ip_address, user_agent, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        uuidv4 ? uuidv4() : Math.random().toString(),
        user.id,
        'login',
        'user',
        user.id,
        clientIp,
        req.headers['user-agent'] || 'unknown',
        JSON.stringify({ status: 'success' })
      ]
    );

    // Session cookies.
    //
    // The admin panel used to keep accessToken in localStorage, where any
    // injected script could read it. It now arrives as an httpOnly cookie that
    // JavaScript cannot touch, paired with a readable CSRF value the client
    // echoes back in X-CSRF-Token (see middleware/csrf.middleware.js).
    //
    // accessToken is still returned in the body. Removing it would break any
    // non-browser caller mid-deploy, and the browser client no longer stores it.
    setAdminSessionCookies(res, accessToken);

    res.json({
      success: true,
      user: {
        id: user.id,
        fullName: user.full_name,
        role: roleString,
        regionId
      },
      accessToken
    });

  } catch (error) {
    console.error('--- ADMIN LOGIN ERROR ---', error);
    next(error);
  }
});

/**
 * GET /admin-auth/me — confirm a stored admin session is still valid.
 *
 * apps/web's AdminAuthContext calls this on every mount to re-verify the
 * `admin_token` it restored from localStorage. The route did not exist, so the
 * call 404'd; because that context only signs the admin out on an explicit 401
 * or 403 (a 500 or a network fault must not end a session mid-work), a 404 fell
 * into the "keep the cached identity" branch. The verification therefore never
 * actually ran: a revoked, expired or role-downgraded admin token kept working
 * in the dashboard UI until a request happened to hit a route that enforced it.
 *
 * The response mirrors /login's `user` shape so the context can store the two
 * interchangeably.
 */
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = req.user;

    // Re-derive admin standing from the database rather than trusting the role
    // baked into the JWT at login — an admin whose admin_roles row was
    // deactivated since then must fail here.
    const adminRole = await queryOne(
      'SELECT * FROM admin_roles WHERE user_id = $1 AND is_active = true',
      [user.id]
    );
    const isDirectAdmin = user.role === 'admin' || user.role === 'super_admin';

    if (!adminRole && !isDirectAdmin) {
      return res.status(403).json({ error: 'Access denied. Admin role not assigned.' });
    }

    const roleString = String(adminRole ? adminRole.role : user.role).toUpperCase();
    const regionId = adminRole ? adminRole.region_id : user.region_id;

    res.json({
      success: true,
      user: {
        id: user.id,
        fullName: user.full_name,
        role: roleString,
        regionId
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Ends the admin session.
 *
 * An httpOnly cookie cannot be deleted by the client, so signing out has to be
 * a server round trip -- previously the panel just dropped the localStorage key
 * and considered itself logged out. Deliberately unauthenticated: clearing
 * cookies on a session that has already expired must still work, and there is
 * nothing to protect in "stop sending me these cookies".
 */
router.post('/logout', (req, res) => {
  clearAdminSessionCookies(res);
  res.json({ success: true });
});

module.exports = router;
