#!/usr/bin/env node
/**
 * Remove demo credentials from a production database.
 *
 * Two separate things are cleaned up here, both of which are safe in
 * development and dangerous in production:
 *
 *   1. The +919000000001..012 demo accounts. /auth/verify-otp used to map those
 *      numbers straight onto the twelve platform roles — +919000000012 being
 *      super_admin — and /auth/send-otp issued them the fixed OTP 123456. Both
 *      paths are now gated on NODE_ENV, so this is defence in depth: if the
 *      environment variable is ever wrong, there should be nothing behind the
 *      gate to log into.
 *
 *   2. admin_pins rows whose pin_hash is a legacy 'mock_pin_<pin>' value from
 *      seed data. admin-auth.routes.js still accepts those (it compares the
 *      literal and then upgrades the row to bcrypt), so a seeded
 *      'mock_pin_123456' in production means the admin PIN is 123456.
 *
 * Usage:
 *   node src/scripts/purge_demo_credentials.js            # report only
 *   node src/scripts/purge_demo_credentials.js --apply    # actually delete
 *
 * Dry-run by default, because deleting user rows is not reversible and the
 * shape of the data differs between deployments.
 */

require('dotenv').config();
const { query, queryOne } = require('../config/database');

const DEMO_PHONE_PREFIX = '+919000';
const APPLY = process.argv.includes('--apply');

function rowsOf(result) {
  if (!result) return [];
  return result.rows || (Array.isArray(result) ? result : []);
}

async function main() {
  console.log('─'.repeat(70));
  console.log(`Demo-credential purge — ${APPLY ? 'APPLY (destructive)' : 'DRY RUN (no changes)'}`);
  console.log(`NODE_ENV=${process.env.NODE_ENV || '(unset)'}`);
  console.log('─'.repeat(70));

  // ── 1. Demo accounts ──────────────────────────────────────────────────
  const demoUsers = rowsOf(
    await query(
      `SELECT id, phone_number, full_name, role FROM users WHERE phone_number LIKE $1`,
      [`${DEMO_PHONE_PREFIX}%`]
    )
  );

  console.log(`\n[1] Demo accounts matching ${DEMO_PHONE_PREFIX}*: ${demoUsers.length}`);
  for (const u of demoUsers) {
    console.log(`      ${u.phone_number}  role=${u.role}  id=${u.id}  ${u.full_name || ''}`);
  }

  // ── 2. Legacy plaintext admin PINs ────────────────────────────────────
  let mockPins = [];
  try {
    mockPins = rowsOf(
      await query(`SELECT id, user_id, pin_hash FROM admin_pins WHERE pin_hash LIKE $1`, ['mock\\_pin\\_%'])
    );
  } catch (e) {
    // Some deployments predate the admin_pins table.
    console.log(`\n[2] admin_pins not queryable (${e.message}) — skipping.`);
  }

  if (mockPins.length) {
    console.log(`\n[2] admin_pins rows with a legacy mock_pin_ hash: ${mockPins.length}`);
    for (const p of mockPins) {
      // The PIN itself is printed because the whole point is that it is not secret.
      console.log(`      user_id=${p.user_id}  effective PIN = ${String(p.pin_hash).replace('mock_pin_', '')}`);
    }
  } else {
    console.log('\n[2] admin_pins rows with a legacy mock_pin_ hash: 0');
  }

  if (!demoUsers.length && !mockPins.length) {
    console.log('\nNothing to do — this database is already clean.\n');
    return;
  }

  if (!APPLY) {
    console.log('\nDry run. Re-run with --apply to delete the rows listed above.');
    console.log('Take a database backup first; user deletion cascades.\n');
    return;
  }

  // ── Apply ─────────────────────────────────────────────────────────────
  // Deleted rather than deactivated: a demo account has no legitimate history
  // worth preserving, and is_active=false would still leave the row for a
  // future code path to find. Foreign keys are ON DELETE CASCADE.
  let deletedUsers = 0;
  for (const u of demoUsers) {
    try {
      await query('DELETE FROM users WHERE id = $1', [u.id]);
      deletedUsers++;
      console.log(`  deleted user ${u.phone_number}`);
    } catch (e) {
      console.error(`  FAILED to delete ${u.phone_number}: ${e.message}`);
    }
  }

  let deletedPins = 0;
  for (const p of mockPins) {
    try {
      // Delete rather than rewrite: admin-auth.routes.js treats a missing
      // admin_pins row as "no PIN set" and requires the dev default, which is
      // itself refused outside development. Leaving no row is the closed state.
      await query('DELETE FROM admin_pins WHERE id = $1', [p.id]);
      deletedPins++;
    } catch (e) {
      console.error(`  FAILED to delete admin_pin ${p.id}: ${e.message}`);
    }
  }

  console.log(`\nDone. Removed ${deletedUsers} demo user(s) and ${deletedPins} legacy PIN row(s).`);
  console.log('Affected admins must have a new PIN issued before they can sign in.\n');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\nPurge failed:', err);
    process.exit(1);
  });
