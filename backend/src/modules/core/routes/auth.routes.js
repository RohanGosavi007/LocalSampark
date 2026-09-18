const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { getJwtRefreshSecret } = require('../../../config/secrets');
// One shared client instead of a per-module pool; see config/prisma.js.
const prisma = require('../../../config/prisma').sharedPrisma;
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
const { queryOne } = require('../../../config/database');
const otpStore = require('../services/otpStore.service');

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

router.post('/send-otp', authLimiter, async (req, res, next) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    // Generate a cryptographically secure 6-digit OTP.
    //
    // The +919000* range short-circuits to a fixed 123456 so the seeded demo
    // accounts can be used without an SMS round-trip. That shortcut MUST stay
    // out of production: those twelve numbers map to the twelve platform roles
    // in /verify-otp below, +919000000012 among them being super_admin, so an
    // ungated fixed OTP is an unauthenticated path to a signed super-admin
    // token for anyone who knows the number.
    const allowDemoNumbers = process.env.NODE_ENV !== 'production';
    const isDevNumber = allowDemoNumbers && phoneNumber.startsWith('+919000');
    const otp = isDevNumber ? '123456' : generateOTP();
    
    if (!requireOtpStore(res)) return;

    // Written through the shared store so other routes can verify it. It used
    // to live in a Map private to this module, which is why /admin-auth/login
    // required an `otp` field and then never checked its value.
    await otpStore.setOtp(`otp:${phoneNumber}`, otp);

    // Send OTP via SMS provider (MSG91) or console fallback
    const smsResult = await sendOTP(phoneNumber, otp);
    console.log(`[OTP] Provider: ${smsResult.provider} | Phone: ${phoneNumber}`);

    const response = {
      success: true,
      message: 'OTP sent successfully',
      provider: smsResult.provider,
    };

    // Only return OTP in response during development â€” NEVER in production
    if (process.env.NODE_ENV !== 'production') {
      response.otp = otp;
      response.message = 'OTP sent successfully (Check server logs or use the OTP below)';
    }

    res.json(response);
  } catch (error) {
    next(error);
  }
});

router.post('/verify-otp', authLimiter, async (req, res, next) => {
  try {
    const { phoneNumber, otp, fullName, regionId, pincode, method } = req.body;
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
    const otpValid = await otpStore.verifyAndConsume(otpKey, otp);
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
      if (process.env.NODE_ENV !== 'production' && phoneNumber.startsWith('+919000')) {
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
        user = await prisma.user.findUnique({ where: { phone: phoneNumber } });
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

        const id = crypto.randomUUID();
        user = await prisma.user.create({
          data: {
            phone: phoneNumber,
            name: fullName,
            regionId: assignedRegionId,
            role: 'CUSTOMER'
          }
        });
      }
    } catch (dbError) {
      if (process.env.NODE_ENV !== 'production') {
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

    let user = await prisma.user.findUnique({ where: { phone: phoneNumber } });

    if (!user) {
      if (!fullName) {
        return res.status(200).json({
          registered: false,
          message: 'Phone verified via Firebase. Profile registration required.'
        });
      }

      let assignedRegionId = regionId || null;
      if (!assignedRegionId && pincode) {
        const matchedRegion = await prisma.region.findFirst({ where: { pincode } });
        if (matchedRegion) assignedRegionId = matchedRegion.id;
      }

      const id = crypto.randomUUID();
      user = await prisma.user.create({
        data: {
          phone: phoneNumber,
          name: fullName,
          regionId: assignedRegionId,
          role: 'CUSTOMER'
        }
      });
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

router.post('/refresh-token', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    jwt.verify(refreshToken, getJwtRefreshSecret(), async (err, decoded) => {
      if (err) {
        return res.status(401).json({ error: 'Invalid or expired refresh token' });
      }

      const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const { accessToken } = generateTokens(
        user.id, 
        user.role, 
        user.tokenVersion || 0,
        { regionId: user.regionId }
      );

      res.json({ accessToken });
    });
  } catch (error) {
    next(error);
  }
});

// WhatsApp OTP Send
router.post('/send-whatsapp-otp', authLimiter, async (req, res, next) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone/WhatsApp number is required' });
    }

    // generateOTP() uses crypto.randomInt. Math.random() is a seeded PRNG whose
    // output is predictable from prior draws, so an attacker who can request
    // OTPs for their own number can narrow the code sent to someone else's.
    // The SMS path already used generateOTP; only this WhatsApp path did not.
    const otp = generateOTP();

    if (!requireOtpStore(res)) return;

    await otpStore.setOtp(`whatsapp_otp:${phoneNumber}`, otp);

    if (process.env.NODE_ENV === 'development') {
      console.log(`[WHATSAPP OTP DEBUG] Sent OTP ${otp} via WhatsApp to ${phoneNumber}`);
    }
    res.json({
      success: true,
      message: 'WhatsApp OTP sent successfully',
      otp: process.env.NODE_ENV === 'development' ? otp : undefined
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

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    
    // Generate dummy random phone number prefix since phone is required in schema
    const dummyPhone = `email_${Math.floor(100000 + Math.random() * 900000)}_${Date.now().toString().slice(-4)}`;
    
    let assignedRegionId = regionId || null;
    if (!assignedRegionId && pincode) {
      const matchedRegion = await prisma.region.findFirst({ where: { pincode } });
      if (matchedRegion) assignedRegionId = matchedRegion.id;
    }

    const user = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        phone: dummyPhone,
        email: email,
        name: fullName,
        role: 'CUSTOMER',
        passwordHash: passwordHash,
        authMethod: 'email',
        emailVerified: false,
        regionId: assignedRegionId
      }
    });

    // Create wallet
    await prisma.wallet.create({
      data: {
        userId: user.id,
        balance: 0.00
      }
    });

    // Send email verification link token.
    //
    // Was Math.random().toString(36) twice. Math.random() is V8's xorshift128+,
    // whose full internal state is recoverable from a couple of observed
    // outputs — so an attacker who registers an account and reads their own
    // token can predict every token issued around the same time. 32 bytes from
    // the CSPRNG removes the guess entirely.
    const token = crypto.randomBytes(32).toString('hex');
    await prisma.emailVerificationToken.create({
      data: {
        id: uuidv4(),
        userId: user.id,
        token: token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        used: false
      }
    });

    const verifyLink = `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/v1/auth/verify-email?token=${token}`;
    
    await sendEmail(
      email, 
      'Verify Your Email', 
      `<h2>Welcome to LocalSampark!</h2>
       <p>Please verify your email to activate your account.</p>
       <a href="${verifyLink}" style="padding:10px 20px;background:blue;color:white;text-decoration:none;border-radius:5px">Verify Email</a>`
    );

    console.log(`[EMAIL VERIFY DEBUG] Verification link: ${verifyLink}`);

    res.status(201).json({
      success: true,
      message: 'Registration successful. Verification email sent.',
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

    const tokenRecord = await prisma.emailVerificationToken.findFirst({
      where: {
        token: token,
        used: false
      }
    });

    if (!tokenRecord || new Date(tokenRecord.expiresAt) < new Date()) {
      return res.status(400).send('<h1>Error: Invalid or expired verification token</h1>');
    }

    await prisma.emailVerificationToken.update({
      where: { id: tokenRecord.id },
      data: { used: true }
    });

    await prisma.user.update({
      where: { id: tokenRecord.userId },
      data: { emailVerified: true }
    });

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

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.emailVerified) {
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

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'No user registered with this email address' });
    }

    // Password-reset token.
    //
    // This was Math.random().toString(36).substring(2, 15) — about 13 base-36
    // characters drawn from a predictable PRNG, and it is the single credential
    // that lets the holder set a new password. The attack is not theoretical:
    // request a reset for an account you control, observe the token, solve for
    // V8's xorshift128+ state, then request a reset for the victim and compute
    // the token you know they were sent. That is account takeover for any email
    // address, with no access to the victim's inbox.
    const token = crypto.randomBytes(32).toString('hex');
    await prisma.passwordResetToken.create({
      data: {
        id: uuidv4(),
        userId: user.id,
        token: token,
        expiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000),
        used: false
      }
    });

    // Instead of a direct link, the frontend should handle this token if it's a SPA. But for now we send the token.
    await sendEmail(
      email, 
      'Password Reset Request', 
      `<h2>Password Reset</h2>
       <p>You requested a password reset. Use the token below in your app:</p>
       <h3 style="background:#f4f4f4;padding:10px;display:inline-block;letter-spacing:2px;">${token}</h3>`
    );

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

// Reset Password
router.post('/reset-password', authLimiter, async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Reset token and new password are required' });
    }

    const tokenRecord = await prisma.passwordResetToken.findFirst({
      where: {
        token: token,
        used: false
      }
    });

    if (!tokenRecord || new Date(tokenRecord.expiresAt) < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired password reset token' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.passwordResetToken.update({
      where: { id: tokenRecord.id },
      data: { used: true }
    });
    await prisma.user.update({
      where: { id: tokenRecord.userId },
      data: { passwordHash: passwordHash }
    });

    res.json({
      success: true,
      message: 'Password reset successful. You can now login with your new password.'
    });
  } catch (error) {
    next(error);
  }
});

// Role Switching
router.put('/switch-role', authenticate, async (req, res, next) => {
  try {
    const { targetRole } = req.body;
    if (!targetRole) return res.status(400).json({ error: 'Target role is required' });

    // Validate if user has permission to switch to this role
    // In a fully built permission matrix, we would query user_roles table.
    // For now, we allow switching to 'user' unconditionally, or check if they own a shop.
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    
    if (targetRole !== 'user') {
      if (targetRole === 'shop_owner') {
        const shop = await prisma.localShop.findFirst({ where: { ownerId: req.user.id } });
        if (!shop) return res.status(403).json({ error: 'You do not own any shops' });
      }
      // Add other role validation as needed...
    }

    // Update their active role
    await prisma.user.update({
      where: { id: req.user.id },
      data: { role: targetRole }
    });

    // Issue new token with updated role
    const { accessToken } = generateTokens(
      user.id, 
      targetRole, 
      user.tokenVersion || 0,
      { regionId: user.regionId }
    );

    res.json({ success: true, accessToken, role: targetRole, message: `Switched to ${targetRole}` });
  } catch (error) {
    next(error);
  }
});

// Logout â€” invalidates refresh token (client should also delete localStorage tokens)
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    // In production this would blacklist the refresh token in Redis
    // For dev mode, just acknowledge; client-side localStorage.removeItem handles session clearing
    res.json({ success: true, message: 'Logged out successfully. Please clear your local session.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
