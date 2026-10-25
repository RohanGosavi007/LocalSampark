const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const {
  encryptBuffer,
  decryptBuffer,
  getExpiredBackups,
  runBackup
} = require('../../../../scripts/backup/pg_dump_backup');
const { runRestore } = require('../../../../scripts/backup/restore_backup');

describe('Milestone M8 — Automated Disaster Recovery & Backup Integrity (P10)', () => {
  let tempDir;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'localsampark-backup-test-'));
  });

  afterAll(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('[P10.1] AES-256-GCM encryption and decryption round-trip preserves byte fidelity', () => {
    const originalText = 'LocalSampark Core Database Snapshot — PostgreSQL 16 + PostGIS Table Rows';
    const originalBuffer = Buffer.from(originalText, 'utf8');
    const testKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

    const encrypted = encryptBuffer(originalBuffer, testKey);
    expect(encrypted.length).toBeGreaterThan(originalBuffer.length);

    const decrypted = decryptBuffer(encrypted, testKey);
    expect(decrypted.toString('utf8')).toBe(originalText);
  });

  test('[P10.2] Tampered ciphertext or authentication tag triggers immediate decryption failure', () => {
    const originalBuffer = Buffer.from('Sensitive financial ledger rows and payments', 'utf8');
    const testKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

    const encrypted = encryptBuffer(originalBuffer, testKey);
    // Tamper with a byte in the ciphertext
    const tampered = Buffer.from(encrypted);
    tampered[tampered.length - 1] ^= 0xff;

    expect(() => {
      decryptBuffer(tampered, testKey);
    }).toThrow();
  });

  test('[P10.3] runBackup executes simulated dump, encrypts archive, and writes SHA-256 checksum', async () => {
    const testKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const result = await runBackup({
      backupDir: tempDir,
      encryptionKey: testKey,
      allowSimulation: true,
      retentionDays: 7
    });

    expect(result.success).toBe(true);
    expect(fs.existsSync(result.archivePath)).toBe(true);
    expect(fs.existsSync(result.checksumPath)).toBe(true);

    // Verify SHA-256 matches actual file
    const fileBytes = fs.readFileSync(result.archivePath);
    const expectedHash = crypto.createHash('sha256').update(fileBytes).digest('hex');
    expect(result.checksum).toBe(expectedHash);
  });

  test('[P10.4] runRestore validates SHA-256 checksum and successfully dry-runs archive decryption', async () => {
    const testKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const backupRes = await runBackup({
      backupDir: tempDir,
      encryptionKey: testKey,
      allowSimulation: true
    });

    const restoreRes = await runRestore({
      archivePath: backupRes.archivePath,
      encryptionKey: testKey,
      dryRun: true
    });

    expect(restoreRes.success).toBe(true);
    expect(restoreRes.dryRun).toBe(true);
    expect(restoreRes.bytesDecrypted).toBeGreaterThan(0);
  });

  test('[P10.5] getExpiredBackups correctly identifies files exceeding retention threshold', () => {
    const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
    const oldFile = path.join(tempDir, 'backup_old_test.dump.enc');
    fs.writeFileSync(oldFile, Buffer.from('old-data'));
    fs.utimesSync(oldFile, oldDate, oldDate);

    const expired = getExpiredBackups(tempDir, 7);
    expect(expired).toContain(oldFile);
  });
});
