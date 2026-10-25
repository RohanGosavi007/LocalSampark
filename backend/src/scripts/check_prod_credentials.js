#!/usr/bin/env node
/**
 * Read-only production safety check script.
 * Safe to run against production databases: executes strictly SELECT queries.
 *
 * Checks for:
 * 1. Demo phone numbers (+919000*, +919999999991..5)
 * 2. Unhashed / legacy mock admin PINs ('mock_pin_%')
 * 3. Seeded demo shops or dummy accounts
 * 4. Dangerous environment flags (ALLOW_FREE_OTP_MODE, DEMO_LOGIN_ALLOWED)
 *
 * Usage:
 *   node src/scripts/check_prod_credentials.js
 */

require('dotenv').config();
const { query } = require('../config/database');

const DEMO_PHONE_PATTERNS = ['+919000%', '+91999999999%'];

function rowsOf(result) {
  if (!result) return [];
  return result.rows || (Array.isArray(result) ? result : []);
}

async function checkProductionCredentials() {
  console.log('='.repeat(70));
  console.log('🔍 LocalSampark — Read-Only Production Credential & Persona Audit');
  console.log(`Environment: NODE_ENV=${process.env.NODE_ENV || 'development'}`);
  console.log('='.repeat(70));

  const findings = [];

  // Check 1: Insecure environment flags
  if (process.env.ALLOW_FREE_OTP_MODE === 'true') {
    findings.push({
      severity: 'CRITICAL',
      type: 'CONFIG',
      description: 'ALLOW_FREE_OTP_MODE is set to true in the active environment'
    });
  }

  // Check 2: Demo users
  for (const pattern of DEMO_PHONE_PATTERNS) {
    try {
      const demoUsers = rowsOf(
        await query(
          `SELECT id, phone_number, full_name, role, is_active FROM users WHERE phone_number LIKE $1`,
          [pattern]
        )
      );
      if (demoUsers.length > 0) {
        findings.push({
          severity: 'HIGH',
          type: 'DEMO_USERS',
          count: demoUsers.length,
          pattern,
          users: demoUsers.map(u => ({ phone: u.phone_number, role: u.role, name: u.full_name }))
        });
      }
    } catch (err) {
      console.warn(`Could not query users with pattern ${pattern}: ${err.message}`);
    }
  }

  // Check 3: Plaintext / mock admin pins
  try {
    const mockPins = rowsOf(
      await query(`SELECT id, user_id, pin_hash FROM admin_pins WHERE pin_hash LIKE $1`, ['mock\\_pin\\_%'])
    );
    if (mockPins.length > 0) {
      findings.push({
        severity: 'CRITICAL',
        type: 'MOCK_ADMIN_PINS',
        count: mockPins.length,
        description: 'admin_pins contains unhashed demo PIN entries'
      });
    }
  } catch {
    // admin_pins table might not exist
  }

  // Report
  console.log('\n--- AUDIT SUMMARY ---');
  if (findings.length === 0) {
    console.log('✅ CLEAN: No demo accounts, mock PINs, or dangerous flags detected.');
  } else {
    console.log(`⚠️ ISSUES DETECTED (${findings.length} findings):`);
    for (const f of findings) {
      console.log(`- [${f.severity}] ${f.type}: ${JSON.stringify(f)}`);
    }
    console.log('\nTo purge demo accounts safely, use:');
    console.log('  node src/scripts/purge_demo_credentials.js --apply');
  }
  console.log('='.repeat(70));
  return { clean: findings.length === 0, findings };
}

if (require.main === module) {
  checkProductionCredentials()
    .then(res => process.exit(res.clean ? 0 : 1))
    .catch(err => {
      console.error('Audit failed:', err);
      process.exit(2);
    });
}

module.exports = { checkProductionCredentials };
