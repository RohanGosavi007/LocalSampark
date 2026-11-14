#!/usr/bin/env node
/**
 * LocalSampark — Automated Nightly Encrypted Database Backup Utility (P10)
 *
 * Capabilities:
 * 1. Runs pg_dump in compressed custom format (-F c).
 * 2. Encrypts archive using AES-256-GCM with authenticated tags.
 * 3. Computes SHA-256 digest for archive verification.
 * 4. Supports local archive storage and optional Cloudflare R2 / S3 upload.
 * 5. Prunes backups older than BACKUP_RETENTION_DAYS (default: 7).
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { findPgTool, connection, redactUrl, runPgTool } = require('./pgTools');

const ROOT = path.resolve(__dirname, '..', '..');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM
const TAG_LENGTH = 16; // 128 bits auth tag

/**
 * Encrypt a buffer with AES-256-GCM.
 * Layout: [IV (12B)] [AuthTag (16B)] [Ciphertext]
 */
function encryptBuffer(plainBuffer, keyHex) {
  if (!keyHex || keyHex.length < 32) {
    throw new Error('BACKUP_ENCRYPTION_KEY must be a valid hex string of at least 32 characters (16+ bytes)');
  }
  const key = crypto.createHash('sha256').update(keyHex).digest(); // Exactly 32 bytes (256 bits)
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const ciphertext = Buffer.concat([cipher.update(plainBuffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, ciphertext]);
}

/**
 * Decrypt a buffer with AES-256-GCM.
 */
function decryptBuffer(encryptedBuffer, keyHex) {
  if (encryptedBuffer.length < IV_LENGTH + TAG_LENGTH) {
    throw new Error('Invalid encrypted buffer: too short');
  }
  const key = crypto.createHash('sha256').update(keyHex).digest();
  const iv = encryptedBuffer.subarray(0, IV_LENGTH);
  const authTag = encryptedBuffer.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = encryptedBuffer.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

/**
 * Identify backup files older than retention days.
 */
function getExpiredBackups(backupDir, retentionDays = 7, now = new Date()) {
  if (!fs.existsSync(backupDir)) return [];
  const cutoff = now.getTime() - retentionDays * 24 * 60 * 60 * 1000;
  const files = fs.readdirSync(backupDir);

  return files
    .filter(f => f.startsWith('backup_') && (f.endsWith('.dump.enc') || f.endsWith('.sha256')))
    .filter(f => {
      const filePath = path.join(backupDir, f);
      const stat = fs.statSync(filePath);
      return stat.mtimeMs < cutoff;
    })
    .map(f => path.join(backupDir, f));
}

/**
 * Main execution routine.
 */
async function runBackup(options = {}) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = options.backupDir || path.join(ROOT, 'backups');
  const retentionDays = parseInt(options.retentionDays || process.env.BACKUP_RETENTION_DAYS || '7', 10);
  // No fallback key. The script used to encrypt with a default key printed in
  // its own source, so anyone who could read the repository could read every
  // "encrypted" backup. Without a key of its own it now refuses to run.
  const encryptionKey = options.encryptionKey || process.env.BACKUP_ENCRYPTION_KEY;
  if (!encryptionKey || String(encryptionKey).length < 32) {
    throw new Error('BACKUP_ENCRYPTION_KEY is not set (or is shorter than 32 characters). Generate one with: openssl rand -hex 32');
  }

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const rawDumpPath = path.join(backupDir, `temp_${timestamp}.dump`);
  const encDumpPath = path.join(backupDir, `backup_${timestamp}.dump.enc`);
  const checksumPath = path.join(backupDir, `backup_${timestamp}.sha256`);

  console.log(`[BACKUP] Starting automated database backup at ${new Date().toISOString()}`);

  // 1. Dump the database.
  const dbUrl = options.databaseUrl || process.env.DATABASE_URL;
  let isSimulated = false;

  if (options.allowSimulation) {
    // Tests only: an explicit request for a stand-in file. This used to happen
    // on its own whenever pg_dump failed outside production, and the run then
    // reported "Backup completed successfully" for a file with no data in it.
    fs.writeFileSync(rawDumpPath, Buffer.from(`-- LocalSampark Simulated Dump [${timestamp}]
-- Parity checkpoint
SELECT 1;`));
    isSimulated = true;
  } else {
    if (!dbUrl) throw new Error('DATABASE_URL is not set: there is no database to back up.');
    console.log(`[BACKUP] Executing pg_dump on ${redactUrl(dbUrl)}...`);
    const conn = connection(dbUrl);
    try {
      runPgTool('pg_dump', [...conn.args, '-F', 'c', '-b', '-f', rawDumpPath, conn.database], { env: conn.env });
    } catch (error) {
      if (fs.existsSync(rawDumpPath)) fs.unlinkSync(rawDumpPath); // a partial dump is not kept
      throw error;
    }
    if (!fs.existsSync(rawDumpPath) || fs.statSync(rawDumpPath).size === 0) {
      throw new Error('pg_dump produced no data.');
    }
  }

  // 2. Encrypt the dump with AES-256-GCM, and 3. remove the unencrypted copy
  // whether or not that worked: a raw dump must never be left on disk.
  let encryptedBytes;
  try {
    const rawBytes = fs.readFileSync(rawDumpPath);
    console.log(`[BACKUP] Encrypting ${rawBytes.length} bytes with AES-256-GCM...`);
    encryptedBytes = encryptBuffer(rawBytes, encryptionKey);
    fs.writeFileSync(encDumpPath, encryptedBytes);
  } finally {
    if (fs.existsSync(rawDumpPath)) fs.unlinkSync(rawDumpPath);
  }

  // 4. Compute SHA-256 digest
  const hash = crypto.createHash('sha256').update(encryptedBytes).digest('hex');
  fs.writeFileSync(checksumPath, `${hash}  backup_${timestamp}.dump.enc\n`);

  console.log(`[BACKUP] Created encrypted backup: ${path.basename(encDumpPath)} (${encryptedBytes.length} bytes)`);
  console.log(`[BACKUP] SHA-256 Checksum: ${hash}`);

  // 5. Prune expired archives
  const expiredFiles = getExpiredBackups(backupDir, retentionDays);
  for (const expired of expiredFiles) {
    console.log(`[BACKUP] Pruning expired backup file: ${path.basename(expired)}`);
    fs.unlinkSync(expired);
  }

  return {
    success: true,
    archivePath: encDumpPath,
    checksumPath,
    checksum: hash,
    sizeBytes: encryptedBytes.length,
    isSimulated
  };
}

// Execute when invoked directly from CLI
if (require.main === module) {
  runBackup()
    .then(res => {
      console.log(`[BACKUP] Backup completed successfully.`);
      process.exit(0);
    })
    .catch(err => {
      console.error(`[BACKUP] ERROR: ${err.message}`);
      process.exit(1);
    });
}

module.exports = {
  ALGORITHM,
  IV_LENGTH,
  TAG_LENGTH,
  encryptBuffer,
  decryptBuffer,
  getExpiredBackups,
  runBackup,
  findPgTool
};
