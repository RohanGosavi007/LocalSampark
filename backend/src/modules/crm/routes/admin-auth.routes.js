const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { query, queryOne } = require('../../../../config/database');
const { authLimiter } = require('../../../../middleware/rateLimit.middleware');
const { v4: uuidv4 } = require('uuid');
const { generateTokens } = require('../../../../middleware/auth.middleware');

// Default dev PIN for bootstrapping (will be bcrypt-compared)
const DEV_DEFAULT_PIN = '123456';

// Separate login for admins
router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { phoneNumber, pin, otp } = req.body;
    const clientIp = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';

    if (!phoneNumber || !pin || !otp) {
      return res.status(400).json({ error: 'Phone, PIN, and OTP are required' });
    }

    // Check user and role
    const user = await queryOne('SELECT * FROM users WHERE phone_number = $1', [phoneNumber]);
    if (!user) {
      return res.status(403).json({ error: 'Access denied. User not found.' });
    }

    // Verify admin role
    const adminRole = await queryOne('SELECT * FROM admin_roles WHERE user_id = $1 AND is_active = 1', [user.id]);
    const isDirectAdmin = user.role === 'admin' || user.role === 'super_admin';
    if (!adminRole && !isDirectAdmin) {
      return res.status(403).json({ error: 'Access denied. Admin role not assigned.' });
    }

    // IP Allowlist Check
    const allowedIpsCount = await queryOne('SELECT COUNT(*) as count FROM admin_ip_allowlist WHERE is_active = 1');
    if (allowedIpsCount && parseInt(allowedIpsCount.count) > 0) {
      const isAllowed = await queryOne('SELECT * FROM admin_ip_allowlist WHERE ip_address = $1 AND is_active = 1', [clientIp]);
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

    // Secure PIN verification with bcrypt + legacy mock_pin_ fallback
    let pinValid = false;
    if (adminPin && adminPin.pin_hash) {
      // Check if it's a legacy mock_pin_ hash (from old seed data)
      if (adminPin.pin_hash.startsWith('mock_pin_')) {
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
      // No admin_pins record — accept dev default PIN and auto-create hashed record
      pinValid = (pin === DEV_DEFAULT_PIN);
      if (pinValid) {
        const bcryptHash = await bcrypt.hash(pin, 12);
        try {
          await query(
            'INSERT INTO admin_pins (user_id, pin_hash, failed_attempts) VALUES ($1, $2, 0)',
            [user.id, bcryptHash]
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
    const roleString = adminRole ? adminRole.role : user.role;
    const regionId = adminRole ? adminRole.region_id : user.region_id;

    const { accessToken } = generateTokens(
      user.id, 
      roleString, 
      user.token_version || 0,
      { regionId, isAdminSession: true }
    );

    // Session log
    await query(
      `INSERT INTO admin_audit_log (id, admin_id, action, target_type, target_id, ip_address, user_agent, details)
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
    next(error);
  }
});

module.exports = router;
