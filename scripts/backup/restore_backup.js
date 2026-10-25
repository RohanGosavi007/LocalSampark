#!/usr/bin/env node
/**
 * LocalSampark — Database Backup Restoration & Dry-Run Validation Utility (P10)
 *
 * Capabilities:
 * 1. Verifies SHA-256 integrity checksum of encrypted archive.
 * 2. Authenticates and decrypts AES-256-GCM payload.
 * 3. Supports --dry-run validation (verifying header & payload without writing to DB).
 * 4. Executes pg_restore with safe schema replacement flags.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const { decryptBuffer } = require('./pg_dump_backup');

async function runRestore(options = {}) {
  const encDumpPath = options.archivePath;
  const isDryRun = options.dryRun ?? true;
  const encryptionKey = options.encryptionKey || process.env.BACKUP_ENCRYPTION_KEY || 'default-localsampark-backup-key-change-in-prod';
  const dbUrl = options.databaseUrl || process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/localsampark';

  if (!encDumpPath || !fs.existsSync(encDumpPath)) {
    throw new Error(`Backup archive file not found: ${encDumpPath}`);
  }

  console.log(`[RESTORE] Inspecting archive: ${path.basename(encDumpPath)}`);

  // 1. Check SHA-256 checksum if companion file exists
  const checksumPath = encDumpPath.replace(/\.dump\.enc$/, '.sha256');
  if (fs.existsSync(checksumPath)) {
    const expectedChecksum = fs.readFileSync(checksumPath, 'utf8').trim().split(/\s+/)[0];
    const actualChecksum = crypto.createHash('sha256').update(fs.readFileSync(encDumpPath)).digest('hex');
    if (expectedChecksum !== actualChecksum) {
      throw new Error(`Checksum verification failed! Expected ${expectedChecksum}, got ${actualChecksum}`);
    }
    console.log(`[RESTORE] SHA-256 checksum verified: ${actualChecksum}`);
  }

  // 2. Read and decrypt AES-256-GCM payload
  const encryptedBytes = fs.readFileSync(encDumpPath);
  console.log(`[RESTORE] Authenticating and decrypting ${encryptedBytes.length} bytes...`);
  const decryptedBytes = decryptBuffer(encryptedBytes, encryptionKey);
  console.log(`[RESTORE] Successfully decrypted archive (${decryptedBytes.length} bytes)`);

  if (isDryRun) {
    console.log(`[RESTORE] Dry-run validation SUCCESSFUL. Decrypted dump is valid and authenticated.`);
    return {
      success: true,
      dryRun: true,
      bytesDecrypted: decryptedBytes.length
    };
  }

  // 3. Perform restoration to PostgreSQL
  const tempRestorePath = path.join(path.dirname(encDumpPath), `temp_restore_${Date.now()}.dump`);
  try {
    fs.writeFileSync(tempRestorePath, decryptedBytes);
    console.log(`[RESTORE] Executing pg_restore against ${dbUrl.replace(/:[^:@]+@/, ':***@')}...`);
    execSync(`pg_restore --clean --if-exists --no-owner --no-privileges -d "${dbUrl}" "${tempRestorePath}"`, { stdio: 'pipe' });
    console.log(`[RESTORE] Restoration completed successfully.`);
  } finally {
    if (fs.existsSync(tempRestorePath)) {
      fs.unlinkSync(tempRestorePath);
    }
  }

  return {
    success: true,
    dryRun: false,
    bytesDecrypted: decryptedBytes.length
  };
}

// Execute when invoked directly from CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  const archivePath = args[0];
  const dryRun = !args.includes('--execute');

  if (!archivePath) {
    console.error(`Usage: node restore_backup.js <path-to-archive.dump.enc> [--execute]`);
    process.exit(1);
  }

  runRestore({ archivePath, dryRun })
    .then(res => {
      console.log(`[RESTORE] Finished with status: ${res.success ? 'SUCCESS' : 'FAILURE'}`);
      process.exit(0);
    })
    .catch(err => {
      console.error(`[RESTORE] ERROR: ${err.message}`);
      process.exit(1);
    });
}

module.exports = {
  runRestore
};
