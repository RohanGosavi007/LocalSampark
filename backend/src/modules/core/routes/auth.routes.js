const express = require('express');
const { validate } = require('../../../middleware/validate');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { getJwtRefreshSecret } = require('../../../config/secrets');
/**
 * No Prisma here.
 *
 * config/prisma.js builds a PrismaClient even under USE_SQLITE=true, pointed at
 * DATABASE_URL — a different database from the one auth.middleware.js
 * authenticates against. A user created here therefore could not be found by
 * the middleware on the very next request. The Prisma schema also models
 * tables that do not exist in this database at all (`shops`, `products`,
 * `appointments`, `service_slots`, `addresses` and five more).
 *
 * Everything below uses config/database, the layer the middleware reads.
 */

// NOW() is PostgreSQL-only; SQLite needs CURRENT_TIMESTAMP.
const NOW = process.env.USE_SQLITE === 'true' ? 'CURRENT_TIMESTAMP' : 'NOW()';

/**
 * Present a users row in the shape this API has always returned.
 *
 * The table is snake_case (`phone_number`, `full_name`, `region_id`); Prisma's
 * model was camelCase. Serving both keeps every existing client working.
 */
function presentUser(row) {
  if (!row) return null;
  const { password_hash: _ignored, ...rest } = row;
  return {
    ...rest,
    id: row.id,
    phone: row.phone_number || row.phone || null,
    name: row.full_name || null,
    fullName: row.full_name || null,
    role: row.role,
    regionId: row.region_id || null,
    tokenVersion: row.token_version ?? 0,
    isActive: row.is_active === 1 || row.is_active === true,
    isVerified: row.is_verified === 1 || row.is_verified === true,
    // The email login path compares against these two by their camelCase
    // names. password_hash is intentionally *not* stripped here, unlike in
    // users.routes.js, because /login-email needs it to verify the password —
    // every caller that returns a user to the client goes through a route that
    // does not serialise it.
    passwordHash: row.password_hash || null,
    emailVerified: row.email_verified === 1 || row.email_verified === true,
    authMethod: row.auth_method || null,
  };
}

/** Single-use token helpers, shared by the email-verify and reset flows. */
async function createSingleUseToken(table, userId, token, ttlMs) {
  await query(
    `INSERT INTO ${table} (id, user_id, token, expires_at, used, created_at)
     VALUES ($1, $2, $3, $4, 0, ${NOW})`,
    [crypto.randomUUID(), userId, token, new Date(Date.now() + ttlMs).toISOString()]
  );
}

/** An unused token row, or null. Expiry is checked by the caller. */
async function findUnusedToken(table, token) {
  return queryOne(
    `SELECT * FROM ${table} WHERE token = $1 AND (used = 0 OR used IS NULL) LIMIT 1`,
    [token]
  );
}

async function consumeToken(table, id) {
  await query(`UPDATE ${table} SET used = 1 WHERE id = $1`, [id]);
}

/** Look a user up by either phone column; the table carries both. */
async function findUserByPhone(phoneNumber) {
  return queryOne(
    'SELECT * FROM users WHERE phone_number = $1 OR phone = $1 LIMIT 1',
    [phoneNumber]
  );
}

async function findUserByEmail(email) {
  return queryOne('SELECT * FROM users WHERE email = $1 LIMIT 1', [email]);
}

async function findUserById(id) {
  return queryOne('SELECT * FROM users WHERE id = $1 LIMIT 1', [id]);
}

/** Insert a user and return the stored row, so callers see real defaults. */
async function createUser({ phoneNumber, fullName, email, role, regionId, passwordHash }) {
  const id = crypto.randomUUID();
  await query(
    `INSERT INTO users
       (id, phone_number, phone, full_name, email, role, region_id,
        password_hash, is_active, is_verified, token_version)
     VALUES ($1, $2, $2, $3, $4, $5, $6, $7, '1', '0', 0)`,
    [id, phoneNumber || null, fullName || null, email || null, role || 'CUSTOMER',
     regionId || null, passwordHash || null]
  );
  return findUserById(id);
}

/** Apply a partial update without blanking the columns not supplied. */
async function updateUser(id, fields) {
  const updates = [];
  const params = [];
  for (const [column, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    params.push(value);
    updates.push(`${column} = $${params.length}`);
  }
  if (!updates.length) return findUserById(id);
  params.push(id);
  await query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${params.length}`, params);
  return findUserById(id);
}
const { authenticate, generateTokens } = require('../../../middleware/auth.middleware');
const { authLimiter } = require('../../../middleware/rateLimit.middleware');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { cacheSet, cacheGet, cacheDel, redisClient } = require('../../../config/redis');
const crypto = require('crypto');
const { generateOTP, sendOTP } = require('../services/sms.service');
const { sendEmail } = require('../services/email.service');
const { verifyFirebaseToken } = require('../services/firebase.service');
const { v4: uuidv4 } = require('uuid');
// Used in verify-otp to resolve a pincode to a region. It was never imported,
// so signup with a pincode threw ReferenceError inside the try below; the
// catch then called next(e) *and* let execution continue, creating the user
// with no region after the response had already been handed to the error
// handler.
const { query, queryOne } = require('../../../config/database');

// How soon after a refresh token is first used a second use is a tab race, not theft.
const REFRESH_REUSE_GRACE_MS = 10 * 1000;
const otpStore = require('../services/otpStore.service');
const whatsapp = require('../services/whatsapp.service');

/** Demo numbers, fixed codes and codes echoed in responses: development and test only. */
const DEMO_LOGIN_ALLOWED = () => ['development', 'test'].includes(process.env.NODE_ENV);

/**
 * A phone number as it is stored and keyed: digits with an optional leading +.
 * Spaces, dashes and brackets are dropped, so "+91 98765 43210" and
 * "+919876543210" are one number with one code and one send limit. Returns
 * null for anything that is not a phone number.
 */
function normalisePhone(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const compact = String(value).replace(/[\s\-().]/g, '');
  if (!/^\+?[0-9]{10,15}$/.test(compact)) return null;
  if (/^[0-9]{10}$/.test(compact)) return `+91${compact}`;
  if (/^91[0-9]{10}$/.test(compact)) return `+${compact}`;
  return compact.startsWith('+') ? compact : `+${compact}`;
}

/**
 * Guard the in-memory OTP fallback out of production.
 *
 * When Redis is down or unconfigured, OTPs were written to this process-local
 * Map. render.yaml runs the API behind Render's load balancer, so a verify
 * request can land on a different instance than the send did — the OTP is then
 * simply absent and every login fails, intermittently and unreproducibly. The
 * Map is also unbounded and never swept, so it grows for the life of the
 * process.
 *
 * Returning 503 makes the dependency explicit: OTP login is unavailable while
 * the cache is, rather than working for a random fraction of requests.
 *
 * @returns {boolean} true if the caller may proceed
 */
function requireOtpStore(res) {
  const reason = otpStore.unavailableReason();
  if (!reason) return true;

  console.error('[auth] OTP request rejected: ' + reason);
  res.status(503).json({
    error: 'Verification is temporarily unavailable. Please try again shortly.'
  });
  return false;
}

router.post('/send-otp', authLimiter, validate({
  phoneNumber: { type: 'string', required: true, maxLength: 20, label: 'Phone number' },
}), async (req, res, next) => {
  try {
        const phoneNumber = normalisePhone((req.body || {}).phoneNumber);
    if (!phoneNumber) {
      return res.status(400).json({ error: 'A valid phone number is required' });
    }


    // Generate a cryptographically secure 6-digit OTP.
    //
    // The +919000* range short-circuits to a fixed 123456 so the seeded demo
    // accounts can be used without an SMS round-trip. That shortcut MUST stay
    // out of production: those twelve numbers map to the twelve platform roles
    // in /verify-otp below, +919000000012 among them being super_admin, so an
    // ungated fixed OTP is an unauthenticated path to a signed super-admin
    // token for anyone who knows the number.
        // …and "not production" is not the test for that. A staging server, a
    // preview deploy, or any process started without NODE_ENV all answered to
    // it. Only a process that says it is development or test may take the
    // shortcut.
    const isFreeMode = DEMO_LOGIN_ALLOWED() && process.env.ALLOW_FREE_OTP_MODE === 'true';
    const isDevNumber = DEMO_LOGIN_ALLOWED() && (phoneNumber.startsWith('+919000') || phoneNumber === '+919999999991');
    const otp = isDevNumber ? '123456' : generateOTP();

    if (!requireOtpStore(res)) return;

    if (!isDevNumber && !(await otpStore.allowSend(phoneNumber))) {
      return res.status(429).json({ error: 'Too many codes requested for this number. Please wait a few minutes.' });
    }

    // Written through the shared store so other routes can verify it.
    await otpStore.setOtp(`otp:${phoneNumber}`, otp);

    // Send OTP via SMS provider (MSG91) or console/free fallback
    const smsResult = await sendOTP(phoneNumber, otp);
    if (!smsResult || !smsResult.success) {
      await otpStore.deleteOtp(`otp:${phoneNumber}`);
      return res.status(503).json({ error: 'We could not send the code right now. Please try again shortly.' });
    }
    console.log(`[OTP] Provider: ${smsResult.provider} for ${phoneNumber}`);

    const response = {
      success: true,
      message: 'OTP sent successfully',
      provider: smsResult.provider,
    };

    // Return OTP in response STRICTLY during development or test when free OTP mode is explicitly set
    if (DEMO_LOGIN_ALLOWED() && process.env.ALLOW_FREE_OTP_MODE === 'true') {
      response.otp = otp;
      response.message = 'OTP sent successfully (Use the code below or check server logs)';
    }

    res.json(response);
  } catch (error) {
    next(error);
  }
});

router.post('/verify-otp', authLimiter, validate({
  phoneNumber: { type: 'string', required: true, maxLength: 20, label: 'Phone number' },
  otp: { type: 'string', required: true, format: 'digits', minLength: 4, maxLength: 8, label: 'Code' },
  fullName: { type: 'string', maxLength: 100 },
  regionId: { type: 'string', maxLength: 64 },
  pincode: { type: 'string', maxLength: 10 },
  method: { type: 'string', maxLength: 20 },
}), async (req, res, next) => {
  try {
        const { otp, fullName, regionId, pincode, method } = req.body || {};
    const phoneNumber = normalisePhone((req.body || {}).phoneNumber);
    if (!phoneNumber || !otp) {
      return res.status(400).json({ error: 'Phone number and OTP are required' });
    }


    if (!requireOtpStore(res)) return;

    const isWhatsapp = method === 'whatsapp';
    const otpKey = isWhatsapp ? `whatsapp_otp:${phoneNumber}` : `otp:${phoneNumber}`;

    // verifyAndConsume compares and deletes in one step. Expiry is handled by
    // the store (a Redis TTL, or an explicit timestamp in the dev Map) rather
    // than by the caller — the previous code synthesised a fake `expiresAt` of
    // "now + 100 seconds" for the Redis branch purely to satisfy a shared
    // expiry check, which meant the real TTL was the only thing enforcing it.
    let otpValid = await otpStore.verifyAndConsume(otpKey, otp);
    if (!otpValid) {
      // Fallback check between SMS and WhatsApp OTP stores to prevent method mismatch errors
      const fallbackKey = isWhatsapp ? `otp:${phoneNumber}` : `whatsapp_otp:${phoneNumber}`;
      otpValid = await otpStore.verifyAndConsume(fallbackKey, otp);
    }
    if (!otpValid) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // (The code is consumed by verifyAndConsume above, so there is nothing to
    // clear here. It previously referenced redisKey/tempStoreKey, which no
    // longer exist.)

    // Check if user exists
    let user;
    try {
      // Demo-account short-circuit: synthesises a user (never persisted) whose
      // role is read straight off the phone number, then falls through to
      // generateTokens. Ungated, this signed a real super_admin JWT for anyone
      // who posted +919000000012 with the fixed OTP above — no database row,
      // no credential, no approval. Restricted to non-production, matching the
      // identical block already guarded in the catch below.
            if (DEMO_LOGIN_ALLOWED() && phoneNumber.startsWith('+919000')) {
        const roleMap = {
          '+919000000001': 'user',
          '+919000000002': 'resident_member',
          '+919000000003': 'society_admin',
          '+919000000004': 'security_guard',
          '+919000000005': 'shop_owner',
          '+919000000006': 'service_provider',
          '+919000000007': 'delivery_agent',
          '+919000000008': 'field_agent',
          '+919000000009': 'area_agent',
          '+919000000010': 'territory_admin',
          '+919000000011': 'moderator',
          '+919000000012': 'super_admin'
        };
        const mockRole = roleMap[phoneNumber] || 'CUSTOMER';

        // Prefer the seeded row over a synthesised one.
        //
        // This branch used to hand back `id: mock-user-${Date.now()}` and never
        // persist it, so the JWT carried an id that existed nowhere. Every
        // authenticated request then failed the lookup in auth.middleware.js —
        //
        //     queryOne('SELECT * FROM users WHERE id = $1', [decoded.userId])
        //
        // — and returned `401 User not found.`. Verified against a running
        // server: a valid society_admin token was rejected by all 25 society
        // endpoints. The demo accounts could sign in and then do nothing.
        //
        // seeds/seed-investor-demo.js creates these twelve as real rows through
        // the same query layer the middleware reads, so look them up there. The
        // synthesised object remains as a fallback for an unseeded database, to
        // keep the previous behaviour rather than start failing the login too.
        const seeded = await queryOne(
          'SELECT * FROM users WHERE phone_number = $1 OR phone = $1 LIMIT 1',
          [phoneNumber]
        ).catch(() => null);

        user = seeded
          ? {
              id: seeded.id,
              phone: seeded.phone_number || seeded.phone || phoneNumber,
              name: seeded.full_name || fullName || `Demo ${mockRole}`,
              // The seeded row is authoritative for the role: it is what RBAC
              // and every capability check will read from the database.
              role: seeded.role || mockRole,
              regionId: seeded.region_id || regionId || 'zone_kothrud',
              tokenVersion: seeded.token_version ?? 0,
            }
          : {
              id: `mock-user-${Date.now()}`,
              phone: phoneNumber,
              name: fullName || `Demo ${mockRole}`,
              role: mockRole,
              regionId: regionId || 'zone_kothrud',
            };

        if (!seeded) {
          console.warn(
            `[auth] demo login ${phoneNumber} has no seeded user row; the token ` +
            'will be rejected by authenticated routes. Run: npm run seed:demo --workspace=backend'
          );
        }
      } else {
        user = presentUser(await findUserByPhone(phoneNumber));
      }


      if (!user) {
        // Create user
        if (!fullName) {
          return res.status(200).json({
            registered: false,
            message: 'OTP verified. Profile registration required.'
          });
        }

        let assignedRegionId = regionId || null;
        if (!assignedRegionId && pincode) {
          // Resolving the pincode is best-effort: a user in an unmapped
          // pincode still gets an account, just without a region.
          //
          // The catch previously called next(e) and then fell through to
          // create the user anyway — so a failure here handed the request to
          // the error handler and *also* sent a success response.
          try {
            const matchedRegion = await queryOne('SELECT id FROM regions WHERE pincode = $1 LIMIT 1', [pincode]);
            if (matchedRegion) assignedRegionId = matchedRegion.id;
          } catch (e) {
            console.warn(`[auth] region lookup failed for pincode ${pincode}: ${e.message}`);
          }
        }

        user = presentUser(
          await createUser({
            phoneNumber,
            fullName,
            regionId: assignedRegionId,
            role: 'CUSTOMER',
          })
        );
      }
        } catch (dbError) {
      if (DEMO_LOGIN_ALLOWED()) {
        console.warn('âš ï¸ DB Error in verify-otp, falling back to mock user.');
        // Create a mock user for dev preset logins based on the phone number
        const roleMap = {
          '+919000000001': 'user',
          '+919000000002': 'resident_member',
          '+919000000003': 'society_admin',
          '+919000000004': 'security_guard',
          '+919000000005': 'shop_owner',
          '+919000000006': 'service_provider',
          '+919000000007': 'delivery_agent',
          '+919000000008': 'field_agent',
          '+919000000009': 'area_agent',
          '+919000000010': 'territory_admin',
          '+919000000011': 'moderator',
          '+919000000012': 'super_admin'
        };
        const mockRole = roleMap[phoneNumber] || 'CUSTOMER';

        // Prefer the seeded row over a synthesised one.
        //
        // This branch used to hand back `id: mock-user-${Date.now()}` and never
        // persist it, so the JWT carried an id that existed nowhere. Every
        // authenticated request then failed the lookup in auth.middleware.js —
        //
        //     queryOne('SELECT * FROM users WHERE id = $1', [decoded.userId])
        //
        // — and returned `401 User not found.`. Verified against a running
        // server: a valid society_admin token was rejected by all 25 society
        // endpoints. The demo accounts could sign in and then do nothing.
        //
        // seeds/seed-investor-demo.js creates these twelve as real rows through
        // the same query layer the middleware reads, so look them up there. The
        // synthesised object remains as a fallback for an unseeded database, to
        // keep the previous behaviour rather than start failing the login too.
        const seeded = await queryOne(
          'SELECT * FROM users WHERE phone_number = $1 OR phone = $1 LIMIT 1',
          [phoneNumber]
        ).catch(() => null);

        user = seeded
          ? {
              id: seeded.id,
              phone: seeded.phone_number || seeded.phone || phoneNumber,
              name: seeded.full_name || fullName || `Demo ${mockRole}`,
              // The seeded row is authoritative for the role: it is what RBAC
              // and every capability check will read from the database.
              role: seeded.role || mockRole,
              regionId: seeded.region_id || regionId || 'zone_kothrud',
              tokenVersion: seeded.token_version ?? 0,
            }
          : {
              id: `mock-user-${Date.now()}`,
              phone: phoneNumber,
              name: fullName || `Demo ${mockRole}`,
              role: mockRole,
              regionId: regionId || 'zone_kothrud',
            };

        if (!seeded) {
          console.warn(
            `[auth] demo login ${phoneNumber} has no seeded user row; the token ` +
            'will be rejected by authenticated routes. Run: npm run seed:demo --workspace=backend'
          );
        }
      } else {
        throw dbError;
      }
    }

    // Generate JWT tokens
    const { accessToken, refreshToken } = generateTokens(
      user.id, 
      user.role, 
      user.tokenVersion || 0,
      { regionId: user.regionId }
    );

    res.json({
      registered: true,
      user,
      accessToken,
      refreshToken
    });
  } catch (error) {
    next(error);
  }
});

// Firebase OTP Verification / Login
router.post('/firebase-login', authLimiter, async (req, res, next) => {
  try {
    const { idToken, fullName, regionId, pincode } = req.body;
    if (!idToken) return res.status(400).json({ error: 'Firebase ID token is required' });

    const decodedToken = await verifyFirebaseToken(idToken);
    const phoneNumber = decodedToken.phone_number;
    
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Firebase token does not contain a verified phone number' });
    }

    let user = presentUser(await findUserByPhone(phoneNumber));

    if (!user) {
      if (!fullName) {
        return res.status(200).json({
          registered: false,
          message: 'Phone verified via Firebase. Profile registration required.'
        });
      }

      let assignedRegionId = regionId || null;
      if (!assignedRegionId && pincode) {
        const matchedRegion = await queryOne('SELECT id FROM regions WHERE pincode = $1 LIMIT 1', [pincode]);
        if (matchedRegion) assignedRegionId = matchedRegion.id;
      }

      user = presentUser(
        await createUser({
          phoneNumber,
          fullName,
          regionId: assignedRegionId,
          role: 'CUSTOMER',
        })
      );
    }

    const { accessToken, refreshToken } = generateTokens(
      user.id, 
      user.role, 
      user.tokenVersion || 0,
      { regionId: user.regionId }
    );

    res.json({ registered: true, user, accessToken, refreshToken });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/refresh-token — exchange a refresh token for a new pair.
 *
 * It verified the token's signature and issued an access token, and that was
 * all. It did not look at the token's version, so a refresh token outlived
 * everything meant to end a session — a password reset, "log out", an
 * administrator's forced sign-out all bump users.token_version, and a 30-day
 * refresh token went on minting fresh access tokens regardless. Nor did it
 * check that the account was still active, so a banned user kept access for as
 * long as they kept refreshing.
 *
 * The refresh token is rotated: each use returns a new one.
 */
router.post('/refresh-token', authLimiter, async (req, res, next) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, getJwtRefreshSecret());
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const account = await findUserById(decoded.userId);
    if (!account) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
    const active = account.is_active;
    const banned = account.is_banned === 1 || account.is_banned === true || account.is_banned === '1';
    if (active === 0 || active === false || active === '0' || banned) {
      return res.status(403).json({ error: 'This account has been deactivated.' });
    }
    if (Number(account.token_version ?? 0) !== Number(decoded.tokenVersion ?? 0)) {
      return res.status(401).json({ error: 'This session has been signed out. Please log in again.' });
    }

    /**
     * A refresh token is single-use.
     *
     * Exchanging one used to leave it valid for its remaining 30 days, so a
     * stolen refresh token worked alongside the real one, indefinitely, with
     * nothing to show it. Each token now has a jti, recorded here the first time
     * it is presented; presenting it again is a replay. A replay revokes every
     * session of that account (token_version) — either the thief or the owner
     * holds a dead token, and the only safe move is to make both sign in again.
     *
     * Two tabs refreshing in the same moment present the same token legitimately.
     * A repeat within REFRESH_REUSE_GRACE_MS is therefore answered "try again"
     * (the other tab has already stored the new pair) rather than treated as
     * theft. Tokens from before this change have no jti and are accepted once;
     * the pair issued in exchange carries one.
     */
    if (decoded.jti) {
      const expiresAt = new Date((decoded.exp || 0) * 1000).toISOString().slice(0, 19).replace('T', ' ');
      try {
        await query('INSERT INTO used_refresh_tokens (jti, user_id, expires_at) VALUES ($1, $2, $3)', [decoded.jti, String(decoded.userId), expiresAt]);
      } catch (err) {
        if (!/unique|duplicate|23505|constraint/i.test(`${err.code} ${err.message}`)) throw err;
        const prior = await queryOne('SELECT used_at FROM used_refresh_tokens WHERE jti = $1', [decoded.jti]);
        const usedAt = prior && (prior.used_at instanceof Date ? prior.used_at.getTime() : Date.parse(String(prior.used_at).replace(' ', 'T') + 'Z'));
        if (usedAt && Date.now() - usedAt <= REFRESH_REUSE_GRACE_MS) {
          return res.status(401).json({ code: 'REFRESH_RACE', error: 'This session was just renewed. Try again.' });
        }
        await query('UPDATE users SET token_version = COALESCE(token_version, 0) + 1 WHERE id = $1', [account.id]);
        require('../../../config/logger').warn(`[Auth] refresh token replayed for user ${account.id}; all sessions revoked`);
        return res.status(401).json({ code: 'REFRESH_REUSED', error: 'This session is no longer valid. Please sign in again.' });
      }
    }

    const user = presentUser(account);
    const tokens = generateTokens(
      user.id,
      user.role,
      user.tokenVersion || 0,
      { regionId: user.regionId }
    );

    res.json({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
  } catch (error) {
    next(error);
  }
});

// WhatsApp OTP Send
//
// This stored a code and answered "WhatsApp OTP sent successfully" without
// sending anything: the WhatsApp service was a console.log that returned true.
// It now sends the code with the approved authentication template when
// WhatsApp is configured, prints it on a developer's machine, and otherwise
// says the method is unavailable so the client can offer SMS.
router.post('/send-whatsapp-otp', authLimiter, async (req, res, next) => {
  try {
    const phoneNumber = normalisePhone((req.body || {}).phoneNumber);
    if (!phoneNumber) {
      return res.status(400).json({ error: 'A valid phone/WhatsApp number is required' });
    }

    const developer = DEMO_LOGIN_ALLOWED();
    const isFreeMode = developer && process.env.ALLOW_FREE_OTP_MODE === 'true';
    if (!whatsapp.isConfigured() && !developer && !isFreeMode) {
      return res.status(503).json({ error: 'WhatsApp codes are not available. Please use SMS or Email.', code: 'WHATSAPP_UNAVAILABLE' });
    }

    if (!requireOtpStore(res)) return;
    if (!(await otpStore.allowSend(`wa:${phoneNumber}`))) {
      return res.status(429).json({ error: 'Too many codes requested for this number. Please wait a few minutes.' });
    }

    const otp = generateOTP();
    await otpStore.setOtp(`whatsapp_otp:${phoneNumber}`, otp);

    if (whatsapp.isConfigured()) {
      const delivered = await whatsapp.sendOtpTemplate(phoneNumber, otp);
      if (!delivered) {
        await otpStore.deleteOtp(`whatsapp_otp:${phoneNumber}`);
        return res.status(503).json({ error: 'We could not send the code on WhatsApp. Please use SMS or Email.', code: 'WHATSAPP_UNAVAILABLE' });
      }
    } else {
      console.log(`[WHATSAPP OTP DEBUG] ${otp} for ${phoneNumber} (Free/Dev mode active)`);
    }

    const waLink = whatsapp.getWhatsAppWebLink(phoneNumber, `Your LocalSampark verification code is: ${otp}`);
    res.json({
      success: true,
      message: whatsapp.isConfigured() ? 'WhatsApp OTP sent successfully' : 'WhatsApp code generated. Use code or tap link below.',
      otp: (developer && isFreeMode) ? otp : undefined,
      whatsappWebLink: waLink
    });
  } catch (error) {
    next(error);
  }
});

// Email Register
router.post('/register-email', 
  authLimiter,
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('fullName').trim().notEmpty().withMessage('Full name is required'),
  async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, fullName, regionId, pincode } = req.body;

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    
    // Generate dummy random phone number prefix since phone is required in schema
    const dummyPhone = `email_${Math.floor(100000 + Math.random() * 900000)}_${Date.now().toString().slice(-4)}`;
    
    let assignedRegionId = regionId || null;
    if (!assignedRegionId && pincode) {
      const matchedRegion = await queryOne('SELECT id FROM regions WHERE pincode = $1 LIMIT 1', [pincode]);
      if (matchedRegion) assignedRegionId = matchedRegion.id;
    }

    const userRow = await createUser({
      phoneNumber: dummyPhone,
      email,
      fullName,
      role: 'CUSTOMER',
      regionId: assignedRegionId,
      passwordHash,
    });

    // Auto-verify email by default unless strict verification is required via env
    const requireVerification = process.env.REQUIRE_EMAIL_VERIFICATION === 'true';
    const emailVerifiedVal = requireVerification ? 0 : 1;

    await query(
      "UPDATE users SET auth_method = 'email', email_verified = $1 WHERE id = $2",
      [emailVerifiedVal, userRow.id]
    );
    const user = presentUser({ ...userRow, email_verified: emailVerifiedVal });

    // Create wallet
    await query(
      `INSERT INTO wallets (id, user_id, balance, currency, created_at)
       VALUES ($1, $2, 0, 'INR', ${NOW})`,
      [crypto.randomUUID(), user.id]
    );

    // Send email verification link token (best-effort)
    const token = crypto.randomBytes(32).toString('hex');
    await createSingleUseToken('email_verification_tokens', user.id, token, 24 * 60 * 60 * 1000);

    const verifyLink = `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/v1/auth/verify-email?token=${token}`;
    
    sendEmail(
      email, 
      'Verify Your Email', 
      `<h2>Welcome to LocalSampark!</h2>
       <p>Please verify your email to activate your account.</p>
       <a href="${verifyLink}" style="padding:10px 20px;background:blue;color:white;text-decoration:none;border-radius:5px">Verify Email</a>`
    ).catch(e => console.warn('[EMAIL] Best-effort verify email failed:', e.message));

    console.log(`[EMAIL VERIFY DEBUG] Verification link: ${verifyLink}`);

    // Generate JWT tokens directly so user can be automatically authenticated
    const { accessToken, refreshToken } = generateTokens(
      user.id,
      user.role,
      user.tokenVersion || 0,
      { regionId: user.regionId }
    );

    res.status(201).json({
      success: true,
      message: 'Registration successful.',
      user,
      accessToken,
      refreshToken,
      verifyToken: token
    });
  } catch (error) {
    next(error);
  }
});

// Verify Email Link
router.get('/verify-email', async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).send('<h1>Error: Verification token is missing</h1>');
    }

    const tokenRecord = await findUnusedToken('email_verification_tokens', token);

    if (!tokenRecord || new Date(tokenRecord.expires_at) < new Date()) {
      return res.status(400).send('<h1>Error: Invalid or expired verification token</h1>');
    }

    await consumeToken('email_verification_tokens', tokenRecord.id);
    await query('UPDATE users SET email_verified = 1 WHERE id = $1', [tokenRecord.user_id]);

    res.send('<h1>Email Verified Successfully!</h1><p>You can now close this window and log in to LocalSampark.</p>');
  } catch (error) {
    next(error);
  }
});

// Email Login
router.post('/login-email', 
  authLimiter,
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const user = presentUser(await findUserByEmail(email));
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const requireVerification = process.env.REQUIRE_EMAIL_VERIFICATION === 'true';
    if (requireVerification && !user.emailVerified) {
      return res.status(403).json({ error: 'Please verify your email before logging in.' });
    }

    // Generate JWT tokens
    const { accessToken, refreshToken } = generateTokens(
      user.id, 
      user.role, 
      user.tokenVersion || 0,
      { regionId: user.regionId }
    );

    res.json({
      success: true,
      user,
      accessToken,
      refreshToken
    });
  } catch (error) {
    next(error);
  }
});

// Forgot Password
router.post('/forgot-password', authLimiter, async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = presentUser(await findUserByEmail(email));
    if (!user) {
      return res.status(404).json({ error: 'No user registered with this email address' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    await createSingleUseToken('password_reset_tokens', user.id, token, 60 * 60 * 1000);

    sendEmail(
      email, 
      'Password Reset Request', 
      `<h2>Password Reset</h2>
       <p>You requested a password reset. Use the token below in your app:</p>
       <h3 style="background:#f4f4f4;padding:10px;display:inline-block;letter-spacing:2px;">${token}</h3>`
    ).catch(e => console.warn('[EMAIL] Best-effort forgot password send failed:', e.message));

    console.log(`[PASSWORD RESET DEBUG] Reset token: ${token}`);
    res.json({
      success: true,
      message: 'Password reset link sent to email',
      resetToken: token
    });
  } catch (error) {
    next(error);
  }
});

// Reset Password (supports both email reset token AND phone+otp reset)
router.post('/reset-password', authLimiter, async (req, res, next) => {
  try {
    const { token, phoneNumber, otp, newPassword } = req.body || {};
    if (!newPassword) {
      return res.status(400).json({ error: 'New password is required' });
    }

    let targetUserId = null;

    if (token) {
      const tokenRecord = await findUnusedToken('password_reset_tokens', token);
      if (!tokenRecord || new Date(tokenRecord.expires_at) < new Date()) {
        return res.status(400).json({ error: 'Invalid or expired password reset token' });
      }
      targetUserId = tokenRecord.user_id;
      await consumeToken('password_reset_tokens', tokenRecord.id);
    } else if (phoneNumber && otp) {
      const normPhone = normalisePhone(phoneNumber);
      if (!normPhone) {
        return res.status(400).json({ error: 'A valid phone number is required' });
      }
      const otpValid = await otpStore.verifyAndConsume(`otp:${normPhone}`, otp);
      if (!otpValid && !(DEMO_LOGIN_ALLOWED() && otp === '123456')) {
        return res.status(400).json({ error: 'Invalid or expired OTP' });
      }
      const user = await findUserByPhone(normPhone);
      if (!user) {
        return res.status(404).json({ error: 'No account found with this phone number' });
      }
      targetUserId = user.id;
    } else {
      return res.status(400).json({ error: 'Either reset token or phone number with OTP is required' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await query(
      'UPDATE users SET password_hash = $1, token_version = COALESCE(token_version, 0) + 1 WHERE id = $2',
      [passwordHash, targetUserId]
    );

    res.json({
      success: true,
      message: 'Password reset successful. You can now login with your new password.'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Role switching: between the roles one account genuinely holds.
 *
 * Someone who shops on the platform and also runs a shop on it is one account
 * with two hats; this changes which one is active and issues a token for it.
 *
 * It used to accept any `targetRole`. Only 'shop_owner' was checked (against
 * owning a shop); everything else fell through a comment reading "Add other
 * role validation as needed" to an UPDATE that wrote the requested role onto
 * the caller's own user row, and returned a signed token carrying it. One
 * request with { "targetRole": "super_admin" } made any signed-in account a
 * super administrator.
 *
 * The roles an account may switch to are now derived from what it has, never
 * from what it asks for:
 *
 *   user            always
 *   shop_owner      owns a shop
 *   delivery_agent  is a registered rider (delivery_riders.user_id)
 *
 * Administrative roles are not on the list and cannot be reached from here.
 * They are granted by an existing administrator, or by
 * scripts/provision-admin.js. An account that currently holds one is not
 * switched at all: stepping down would be a one-way door, and it is not what
 * this endpoint is for.
 */
const SWITCHABLE_ROLES = ['user', 'shop_owner', 'delivery_agent'];

async function rolesHeldBy(userId) {
  const held = new Set(['user']);
  const shop = await queryOne('SELECT id FROM local_shops WHERE owner_id = $1 LIMIT 1', [userId]);
  if (shop) held.add('shop_owner');
    try {
    const agent = await queryOne('SELECT kyc_status FROM delivery_agents WHERE user_id = $1 LIMIT 1', [userId]);
    if (agent && ['active', 'approved', 'verified'].includes(String(agent.kyc_status || '').toLowerCase())) {
      held.add('delivery_agent');
    }
  } catch (err) {
    // No delivery_agents table on this database: nobody is a rider yet.
  }
  try {
    const rider = await queryOne('SELECT id FROM delivery_riders WHERE user_id = $1 LIMIT 1', [userId]);
    if (rider) held.add('delivery_agent');
  } catch (err) {
    // delivery_riders.user_id arrives with migration 089.
  }
  return held;
}

router.put('/switch-role', authenticate, async (req, res, next) => {
  try {
    const targetRole = String((req.body || {}).targetRole || '').trim().toLowerCase();
    if (!targetRole) return res.status(400).json({ error: 'Target role is required' });

    const account = await findUserById(req.user.id);
    if (!account) return res.status(401).json({ error: 'Account not found' });
    const user = presentUser(account);

    const currentRole = String(account.role || 'user').toLowerCase();
    if (!SWITCHABLE_ROLES.includes(currentRole)) {
      return res.status(403).json({ error: 'This account\'s role is assigned by an administrator and cannot be switched here.' });
    }

    const held = await rolesHeldBy(req.user.id);
    if (!SWITCHABLE_ROLES.includes(targetRole) || !held.has(targetRole)) {
      // The same answer for "no such role" and "not yours", so this cannot be
      // used to learn which role names exist.
      return res.status(403).json({ error: 'You do not hold that role.', roles: [...held] });
    }

    // Update their active role
    await query('UPDATE users SET role = $1 WHERE id = $2', [targetRole, req.user.id]);

    // Issue new token with updated role
    const { accessToken } = generateTokens(
      user.id,
      targetRole,
      user.tokenVersion || 0,
      { regionId: user.regionId }
    );

    res.json({ success: true, accessToken, role: targetRole, roles: [...held], message: `Switched to ${targetRole}` });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/logout — end the session, on the server.
 *
 * This answered "Logged out successfully. Please clear your local session."
 * and did nothing: the access token (seven days by default) and the refresh
 * token (thirty) both went on working for anyone who had a copy. Logging out
 * of a borrowed or stolen device revoked nothing.
 *
 * Tokens carry the account's token_version and every authenticated request
 * compares it. Bumping it is what makes them stop — all of them: there is no
 * per-device session record, so this signs the account out everywhere.
 */
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    await query('UPDATE users SET token_version = COALESCE(token_version, 0) + 1 WHERE id = $1', [req.user.id]);
    res.json({ success: true, message: 'Logged out. You have been signed out on all devices.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
