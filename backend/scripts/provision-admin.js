#!/usr/bin/env node
/**
 * Create or update an administrator and set their PIN.
 *
 *   ADMIN_PIN=<6 digits> node scripts/provision-admin.js --phone +9198XXXXXXXX --name "Full Name"
 *
 *   --phone        required. The number the admin signs in with; it must be
 *                  able to receive the login OTP.
 *   --name         required when the account does not exist yet.
 *   --role         users.role: super_admin (default) or admin.
 *   --admin-role   admin_roles.role; defaults to super_admin for a super_admin
 *                  and territory_admin for an admin.
 *   --region       name of the region to scope the admin role to (optional).
 *
 * The PIN is read from ADMIN_PIN rather than taken as an argument, so it does
 * not land in shell history or the process list. If ADMIN_PIN is not set, one
 * is generated and printed once.
 *
 * Why this exists: POST /admin-auth/login requires a row in admin_pins, and the
 * only code that ever wrote one was the development shortcut, which stored the
 * fixed PIN 123456 on first use. That shortcut is rightly refused in
 * production, which left no way at all to give a production administrator a
 * PIN — every login answered "No admin PIN configured for this account" — short
 * of hand-writing a bcrypt hash into the table.
 *
  * Flags are written '1' in quotes throughout: users.is_active and
 * admin_roles.is_active are BOOLEAN on PostgreSQL and INTEGER on SQLite, and a
 * quoted literal is the spelling both accept.
 *
 * Runs against whichever database backend/.env selects, like the server does.
 * Safe to re-run: it updates the account, role and PIN in place.
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (!flag.startsWith('--')) throw new Error(`Unexpected argument: ${flag}`);
    const value = argv[i + 1];
    if (value === undefined || value.startsWith('--')) throw new Error(`${flag} needs a value`);
    args[flag.slice(2)] = value;
    i += 1;
  }
  return args;
}

/**
 * Why a PIN is unacceptable, or null if it is fine.
 *
 * Six digits is a small space, and the login locks an account for fifteen
 * minutes after five wrong attempts, so the PINs worth refusing are the ones an
 * attacker tries first.
 */
function pinProblem(pin) {
  if (!/^\d{6}$/.test(pin)) return 'must be exactly 6 digits';
  if (/^(\d)\1{5}$/.test(pin)) return 'must not be a single repeated digit';
  const digits = pin.split('').map(Number);
  const ascending = digits.every((d, i) => i === 0 || d === (digits[i - 1] + 1) % 10);
  const descending = digits.every((d, i) => i === 0 || d === (digits[i - 1] + 9) % 10);
  if (ascending || descending) return 'must not be a run of consecutive digits';
  if (/^(\d\d)\1\1$/.test(pin) || /^(\d\d\d)\1$/.test(pin)) return 'must not be a short repeated pattern';
  return null;
}

function generatePin() {
  for (;;) {
    const pin = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    if (!pinProblem(pin)) return pin;
  }
}

async function provisionAdmin({ phone, name, role = 'super_admin', adminRole, region, pin }) {
  if (!phone || !/^\+\d{10,15}$/.test(phone)) {
    throw new Error('--phone is required, in international form, e.g. +919812345678');
  }
  if (!['super_admin', 'admin'].includes(role)) {
    throw new Error('--role must be super_admin or admin');
  }
  const problem = pinProblem(pin);
  if (problem) throw new Error(`The PIN ${problem}.`);

  const { connectDB, query, queryOne } = require('../src/config/database');
  await connectDB();

  let regionId = null;
  if (region) {
    const row = await queryOne('SELECT id FROM regions WHERE name = $1', [region]);
    if (!row) throw new Error(`No region named "${region}".`);
    regionId = row.id;
  }

  let user = await queryOne('SELECT id, full_name, role FROM users WHERE phone_number = $1', [phone]);
  let created = false;
  if (!user) {
    if (!name) throw new Error('--name is required: no account exists for that phone number yet.');
    const id = crypto.randomUUID();
    await query(
      `INSERT INTO users (id, phone_number, full_name, role, is_verified, is_active, region_id)
       VALUES ($1, $2, $3, $4, '1', '1', $5)`,
      [id, phone, name, role, regionId]
    );
    user = { id, full_name: name, role };
    created = true;
  } else {
    await query("UPDATE users SET role = $1, is_active = '1' WHERE id = $2", [role, user.id]);
    if (name && name !== user.full_name) {
      await query('UPDATE users SET full_name = $1 WHERE id = $2', [name, user.id]);
    }
  }

  const grantedRole = adminRole || (role === 'super_admin' ? 'super_admin' : 'territory_admin');
  const existingRole = await queryOne(
    'SELECT id FROM admin_roles WHERE user_id = $1 AND role = $2',
    [user.id, grantedRole]
  );
  if (existingRole) {
    await query("UPDATE admin_roles SET is_active = '1', region_id = $1 WHERE id = $2", [regionId, existingRole.id]);
  } else {
    await query(
      `INSERT INTO admin_roles (id, user_id, role, region_id, permissions, is_active)
       VALUES ($1, $2, $3, $4, $5, '1')`,
      [crypto.randomUUID(), user.id, grantedRole, regionId, JSON.stringify({ all: true })]
    );
  }

  // Same cost factor the login route uses when it re-hashes a PIN.
  const pinHash = await bcrypt.hash(pin, 12);
  const existingPin = await queryOne('SELECT id FROM admin_pins WHERE user_id = $1', [user.id]);
  if (existingPin) {
    await query(
      'UPDATE admin_pins SET pin_hash = $1, failed_attempts = 0, locked_until = NULL WHERE user_id = $2',
      [pinHash, user.id]
    );
  } else {
    await query(
      'INSERT INTO admin_pins (id, user_id, pin_hash, failed_attempts) VALUES ($1, $2, $3, 0)',
      [crypto.randomUUID(), user.id, pinHash]
    );
  }

  return { userId: user.id, created, role, adminRole: grantedRole, regionId, pinReset: Boolean(existingPin) };
}

if (require.main === module) {
  (async () => {
    const args = parseArgs(process.argv.slice(2));
    const supplied = process.env.ADMIN_PIN;
    const pin = supplied || generatePin();

    const result = await provisionAdmin({
      phone: args.phone,
      name: args.name,
      role: args.role,
      adminRole: args['admin-role'],
      region: args.region,
      pin,
    });

    console.log(`${result.created ? 'Created' : 'Updated'} ${args.phone} as ${result.role} (admin role: ${result.adminRole}).`);
    console.log(result.pinReset ? 'PIN replaced; failed attempts and any lock cleared.' : 'PIN set.');
    if (!supplied) {
      console.log(`Generated PIN: ${pin}`);
      console.log('It is shown once and stored only as a hash. Pass it to the administrator over a channel you trust.');
    }
    process.exit(0);
  })().catch((err) => {
    console.error(`provision-admin: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { provisionAdmin, pinProblem, generatePin };
