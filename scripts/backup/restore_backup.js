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
const { connection, parseDatabaseUrl, redactUrl, runPgTool } = require('./pgTools');
const { decryptBuffer } = require('./pg_dump_backup');

async function runRestore(options = {}) {
  const encDumpPath = options.archivePath;
  const isDryRun = options.dryRun ?? true;
  // No fallback key (see pg_dump_backup.js): a wrong key fails the GCM check;
  // a built-in one would make the backups readable by anyone with the source.
  const encryptionKey = options.encryptionKey || process.env.BACKUP_ENCRYPTION_KEY;
  if (!encryptionKey) throw new Error('BACKUP_ENCRYPTION_KEY is not set: the archive cannot be decrypted.');
  // The database to restore INTO. Never read from DATABASE_URL: that is the
  // application's own database, and `pg_restore --clean` drops what is there.
  const dbUrl = options.databaseUrl;

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

  // 3. Perform restoration to PostgreSQL. A restore replaces the target's
  // tables, so it needs a target named on purpose, which is not the
  // application's own database, and the target's name typed back to confirm.
  if (!dbUrl) throw new Error('A restore needs an explicit target database: pass --target <postgres-url>.');
  const target = parseDatabaseUrl(dbUrl);
  if (process.env.DATABASE_URL && parseDatabaseUrl(process.env.DATABASE_URL).database === target.database
      && parseDatabaseUrl(process.env.DATABASE_URL).host === target.host && !options.allowLiveTarget) {
    throw new Error(`Refusing to restore into ${target.database}: that is the application's own database (DATABASE_URL). Restore into a new database, check it, then switch over.`);
  }
  if (options.confirmDatabase !== target.database) {
    throw new Error(`To restore into "${target.database}", confirm it: pass --confirm-database ${target.database}.`);
  }
  const tempRestorePath = path.join(path.dirname(encDumpPath), `temp_restore_${Date.now()}.dump`);
  try {
    fs.writeFileSync(tempRestorePath, decryptedBytes);
    console.log(`[RESTORE] Executing pg_restore against ${redactUrl(dbUrl)}...`);
    const conn = connection(dbUrl);
    runPgTool('pg_restore', [...conn.args, '--clean', '--if-exists', '--no-owner', '--no-privileges', '-d', conn.database, tempRestorePath], { env: conn.env });
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
  const flag = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };

  if (!archivePath) {
    console.error(`Usage: node restore_backup.js <path-to-archive.dump.enc> [--execute --target <postgres-url> --confirm-database <name>]`);
    process.exit(1);
  }

  runRestore({ archivePath, dryRun, databaseUrl: flag('--target'), confirmDatabase: flag('--confirm-database') })
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
