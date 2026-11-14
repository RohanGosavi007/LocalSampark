#!/usr/bin/env node
/**
 * Copies uploads from local disk to object storage (P4): the utility for moving
 * a deployment that has been storing files on its own disk onto S3 / Cloudflare R2.
 *
 *   node scripts/storage/migrate_uploads.js              what would be copied (a dry run)
 *   node scripts/storage/migrate_uploads.js --execute    copy it
 *
 * Configuration is the same as the API's: STORAGE_ENDPOINT, STORAGE_BUCKET,
 * STORAGE_ACCESS_KEY, STORAGE_SECRET_KEY (and STORAGE_PUBLIC_URL for public links).
 *
 * What it does:
 *   - public files (backend/public/uploads/**) go to the key `uploads/<path>`,
 *     public-read; private files (backend/private_uploads/**) to `private/<path>`,
 *     private. These are the keys the API already stores in file_uploads.file_path,
 *     so no row needs to change for the API to find them.
 *   - the content type is the file's real type, from its first bytes, never from its name.
 *   - every copy is read back and its SHA-256 compared with the local file.
 *   - it is safe to run again: a file already in the bucket with identical content is skipped.
 *   - it NEVER deletes or changes a local file. Remove them yourself, after you have
 *     switched STORAGE_DRIVER=s3 and checked the app (rule D8: nothing is deleted without you).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..', '..');
const MAX_BYTES = 100 * 1024 * 1024; // larger than any file the API accepts: a stray is reported, not uploaded

const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

/** Every regular file under `dir` as { full, relative } (posix separators). Links and special files are skipped. */
function* walk(dir, base = dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full, base);
    else if (entry.isFile()) yield { full, relative: path.relative(base, full).split(path.sep).join('/') };
  }
}

/**
 * @param {object} options
 * @param {{ putObject: Function, getObject: Function }} options.provider  the destination (S3StorageProvider)
 * @param {string} options.publicDir   local folder of public files
 * @param {string} options.privateDir  local folder of private files
 * @param {boolean} [options.execute]  false (the default) copies nothing
 * @param {(file: Buffer) => string|null} options.sniff  real content type from the bytes
 * @param {(line: string) => void} [options.log]
 * @returns {Promise<{ found: number, uploaded: number, skipped: number, failed: number, unsupported: number, tooLarge: number, bytes: number, failures: string[], plan: { key: string, bytes: number, isPublic: boolean }[] }>}
 */
async function migrateUploads({ provider, publicDir, privateDir, execute = false, sniff, log = () => {} }) {
  const result = { found: 0, uploaded: 0, skipped: 0, failed: 0, unsupported: 0, tooLarge: 0, bytes: 0, failures: [], plan: [] };

  const sets = [
    { dir: publicDir, prefix: 'uploads/', isPublic: true },
    { dir: privateDir, prefix: 'private/', isPublic: false },
  ];

  for (const { dir, prefix, isPublic } of sets) {
    for (const { full, relative } of walk(dir)) {
      result.found += 1;
      const key = `${prefix}${relative}`;
      const size = fs.statSync(full).size;
      if (size > MAX_BYTES) { result.tooLarge += 1; log(`too large, not copied: ${key} (${size} bytes)`); continue; }

      const buffer = fs.readFileSync(full);
      const mimeType = sniff(buffer);
      if (!mimeType) { result.unsupported += 1; log(`not a recognised file type, not copied: ${key}`); continue; }

      result.plan.push({ key, bytes: size, isPublic });
      if (!execute) continue;

      try {
        const digest = sha256(buffer);
        // Already there, and the same? Then there is nothing to do.
        let existing = null;
        try { existing = await provider.getObject(key); } catch { /* not there yet */ }
        if (existing && sha256(existing.buffer) === digest) { result.skipped += 1; continue; }

        await provider.putObject({ key, buffer, mimeType, isPublic });
        const back = await provider.getObject(key);
        if (sha256(back.buffer) !== digest) throw new Error('the copy read back differs from the local file');
        result.uploaded += 1;
        result.bytes += size;
        log(`copied ${key} (${size} bytes)`);
      } catch (error) {
        result.failed += 1;
        result.failures.push(`${key}: ${error.message}`);
        log(`FAILED ${key}: ${error.message}`);
      }
    }
  }
  return result;
}

if (require.main === module) {
  const execute = process.argv.includes('--execute');
  const { S3StorageProvider } = require(path.join(ROOT, 'backend', 'src', 'services', 'storage'));
  const { sniff } = require(path.join(ROOT, 'backend', 'src', 'modules', 'core', 'services', 'upload.service'));
  const provider = new S3StorageProvider();
  if (execute && !provider.isConfigured()) {
    console.error('Object storage is not configured: set STORAGE_ENDPOINT, STORAGE_BUCKET, STORAGE_ACCESS_KEY and STORAGE_SECRET_KEY.');
    process.exit(1);
  }
  migrateUploads({
    provider,
    publicDir: path.join(ROOT, 'backend', 'public', 'uploads'),
    privateDir: path.join(ROOT, 'backend', 'private_uploads'),
    execute,
    sniff,
    log: (line) => console.log(`[migrate-uploads] ${line}`),
  }).then((r) => {
    console.log(`[migrate-uploads] ${execute ? 'DONE' : 'DRY RUN (nothing copied; pass --execute)'}: ${r.found} found, ${r.uploaded} copied, ${r.skipped} already there, ${r.failed} failed, ${r.unsupported} unrecognised, ${r.tooLarge} too large, ${(r.bytes / 1048576).toFixed(1)} MB`);
    for (const f of r.failures) console.error(`  ${f}`);
    process.exit(r.failed ? 1 : 0);
  }).catch((error) => { console.error(`[migrate-uploads] ERROR: ${error.message}`); process.exit(1); });
}

module.exports = { migrateUploads, walk };
