/**
 * P10 backups: the rules the backup and restore scripts keep.
 *
 * The scripts used to encrypt with a default key printed in their own source,
 * to report a successful backup after writing a stand-in file when pg_dump
 * failed, to put the database password on a command line, and to restore into
 * whatever DATABASE_URL pointed at. The real restore (a populated database,
 * dumped, encrypted, restored into a fresh one and compared table by table) is
 * run by scripts/backup/restore_rehearsal.js, which writes its evidence to
 * docs/audit/evidence/restore-rehearsal-*.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { runBackup } = require('../../../../scripts/backup/pg_dump_backup');
const { runRestore } = require('../../../../scripts/backup/restore_backup');
const { findPgTool, parseDatabaseUrl, redactUrl, runPgTool } = require('../../../../scripts/backup/pgTools');
const { compareSnapshots, rehearse } = require('../../../../scripts/backup/restore_rehearsal');

const KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
let dir;
let archive;

beforeAll(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ls-p10-'));
  archive = (await runBackup({ backupDir: dir, encryptionKey: KEY, allowSimulation: true })).archivePath;
});
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

describe('[P10.6] a backup is encrypted with a key of its own, and is real', () => {
  test('[P10.6] without BACKUP_ENCRYPTION_KEY the backup refuses to run; there is no built-in key', async () => {
    const saved = process.env.BACKUP_ENCRYPTION_KEY;
    delete process.env.BACKUP_ENCRYPTION_KEY;
    try {
      await expect(runBackup({ backupDir: dir, allowSimulation: true })).rejects.toThrow(/BACKUP_ENCRYPTION_KEY is not set/);
      await expect(runBackup({ backupDir: dir, encryptionKey: 'too-short', allowSimulation: true })).rejects.toThrow(/shorter than 32/);
    } finally {
      if (saved !== undefined) process.env.BACKUP_ENCRYPTION_KEY = saved;
    }
    const source = fs.readFileSync(path.join(__dirname, '../../../../scripts/backup/pg_dump_backup.js'), 'utf8');
    expect(source).not.toMatch(/default-localsampark-backup-key/);
  });

  test('[P10.6] a failing pg_dump is an error, never a stand-in file reported as a backup', async () => {
    const source = fs.readFileSync(path.join(__dirname, '../../../../scripts/backup/pg_dump_backup.js'), 'utf8');
    // A stand-in is made only when the caller asks (options.allowSimulation), never on a pg_dump failure.
    expect(source).not.toMatch(/NODE_ENV\s*!==\s*'production'/);
    const before = fs.readdirSync(dir).length;
    await expect(runBackup({ backupDir: dir, encryptionKey: KEY, databaseUrl: 'postgresql://nobody:x@127.0.0.1:1/none' }))
      .rejects.toThrow(/pg_dump (failed|was not found)|produced no data/);
    // Nothing was left behind: no raw dump, no half-written archive.
    expect(fs.readdirSync(dir).filter((f) => f.startsWith('temp_'))).toEqual([]);
    expect(fs.readdirSync(dir).length).toBe(before);
  });

  test('[P10.6] the raw, unencrypted dump is removed even when encryption fails', () => {
    const source = fs.readFileSync(path.join(__dirname, '../../../../scripts/backup/pg_dump_backup.js'), 'utf8');
    expect(source).toMatch(/finally \{\s*if \(fs\.existsSync\(rawDumpPath\)\) fs\.unlinkSync\(rawDumpPath\);/);
  });
});

describe('[P10.7] a restore cannot overwrite the live database by accident', () => {
  const saved = process.env.DATABASE_URL;
  afterEach(() => { if (saved === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = saved; });

  test('[P10.7] a dry run needs no target; executing needs one, named on purpose (DATABASE_URL is never used)', async () => {
    process.env.DATABASE_URL = 'postgresql://u:p@127.0.0.1:5432/the_live_app_db';
    expect((await runRestore({ archivePath: archive, encryptionKey: KEY, dryRun: true })).dryRun).toBe(true);
    await expect(runRestore({ archivePath: archive, encryptionKey: KEY, dryRun: false })).rejects.toThrow(/explicit target database/);
  });

  test('[P10.7] the application’s own database is refused as a target', async () => {
    process.env.DATABASE_URL = 'postgresql://u:p@127.0.0.1:5432/the_live_app_db';
    await expect(runRestore({
      archivePath: archive, encryptionKey: KEY, dryRun: false,
      databaseUrl: 'postgresql://u:p@127.0.0.1:5432/the_live_app_db', confirmDatabase: 'the_live_app_db',
    })).rejects.toThrow(/application's own database/);
  });

  test('[P10.7] the target’s name must be typed back to confirm', async () => {
    delete process.env.DATABASE_URL;
    await expect(runRestore({ archivePath: archive, encryptionKey: KEY, dryRun: false, databaseUrl: 'postgresql://u:p@127.0.0.1:5432/scratch' }))
      .rejects.toThrow(/confirm it: pass --confirm-database scratch/);
    await expect(runRestore({ archivePath: archive, encryptionKey: KEY, dryRun: false, databaseUrl: 'postgresql://u:p@127.0.0.1:5432/scratch', confirmDatabase: 'other' }))
      .rejects.toThrow(/confirm it/);
  });

  test('[P10.7] a wrong key fails the authentication check, and without a key it does not even try', async () => {
    await expect(runRestore({ archivePath: archive, encryptionKey: 'f'.repeat(64), dryRun: true })).rejects.toThrow();
    const had = process.env.BACKUP_ENCRYPTION_KEY;
    delete process.env.BACKUP_ENCRYPTION_KEY;
    try { await expect(runRestore({ archivePath: archive, dryRun: true })).rejects.toThrow(/BACKUP_ENCRYPTION_KEY is not set/); } finally { if (had !== undefined) process.env.BACKUP_ENCRYPTION_KEY = had; }
  });
});

describe('[P10.8] the database password stays out of command lines and messages', () => {
  test('[P10.8] a URL is read apart, odd characters in the password included, and printed without it', () => {
    const url = 'postgresql://app:p%40ss%22w%27rd@db.internal:6543/prod';
    expect(parseDatabaseUrl(url)).toEqual({ host: 'db.internal', port: '6543', user: 'app', password: 'p@ss"w\'rd', database: 'prod' });
    expect(redactUrl(url)).toBe('postgresql://app:***@db.internal:6543/prod');
    expect(redactUrl(url)).not.toMatch(/ss/);
  });

  test('[P10.8] PG_BIN_DIR is looked at first when finding a tool', () => {
    const fakeBin = fs.mkdtempSync(path.join(dir, 'bin-'));
    const file = path.join(fakeBin, `pg_dump${process.platform === 'win32' ? '.exe' : ''}`);
    fs.writeFileSync(file, '');
    expect(findPgTool('pg_dump', { PG_BIN_DIR: fakeBin, PATH: '' })).toBe(file);
    expect(findPgTool('no_such_pg_tool_xyz', { PG_BIN_DIR: fakeBin, PATH: '' })).toBeNull();
  });

  test('[P10.8] a tool that is not installed says so, and the scripts call tools without a shell', () => {
    expect(() => runPgTool('no_such_pg_tool_xyz', [])).toThrow(/was not found/);
    for (const name of ['pg_dump_backup.js', 'restore_backup.js']) {
      const source = fs.readFileSync(path.join(__dirname, '../../../../scripts/backup', name), 'utf8');
      expect(source).not.toMatch(/execSync\(/);
    }
  });
});

describe('[P10.9] the rehearsal compares a restored database with its source', () => {
  const tables = (extra = {}) => ({ tables: { users: { rows: 5, md5: 'a' }, orders: { rows: 2, md5: 'b' }, ...extra }, triggers: 7 });

  test('[P10.9] identical databases give no differences', () => {
    expect(compareSnapshots(tables(), tables())).toEqual([]);
  });

  test('[P10.9] a missing table, a different row count, different content and a lost trigger are each reported', () => {
    const restored = { tables: { users: { rows: 4, md5: 'a' }, orders: { rows: 2, md5: 'changed' } }, triggers: 6 };
    const source = tables({ coupons: { rows: 1, md5: 'c' } });
    const problems = compareSnapshots(source, restored);
    expect(problems).toEqual(expect.arrayContaining([
      expect.stringMatching(/table coupons is missing/),
      expect.stringMatching(/table users: 5 rows in the source, 4 restored/),
      expect.stringMatching(/table orders: same row count \(2\) but the content differs/),
      expect.stringMatching(/triggers: 7 in the source, 6 restored/),
    ]));
  });

  test('[P10.9] a table that appears only after the restore is reported too', () => {
    expect(compareSnapshots(tables(), tables({ extra: { rows: 1, md5: 'z' } }))).toEqual([expect.stringMatching(/table extra exists only in the restored database/)]);
  });

  test('[P10.9] the rehearsal only ever runs against a database on this machine', async () => {
    await expect(rehearse({ source: 'postgresql://u:p@db.example.com:5432/prod', evidenceRoot: dir })).rejects.toThrow(/only runs against a database on this machine/);
  });
});
