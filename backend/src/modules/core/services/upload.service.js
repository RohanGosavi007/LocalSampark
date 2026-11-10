/**
 * File uploads: one implementation for every upload route.
 *
 * There were two multer set-ups and three upload endpoints, and between them:
 *
 *   - a file's type was whatever the client said it was. The browser's
 *     Content-Type label was checked in one place and the file-name extension
 *     in the other, and the extension was kept — so a page saved as
 *     "photo.html" with the label image/png was served back from /uploads as
 *     HTML, from the API's own origin;
 *   - the URL recorded for a file named the directory after the purpose
 *     ("/uploads/product_image/…") while the file was written to a directory
 *     with a different name ("…/uploads/products/"), so every link recorded
 *     for a product photo, shop photo or profile photo pointed nowhere;
 *   - prescriptions and KYC documents (driving licence, vehicle RC) were
 *     written under public/uploads, readable by anyone who had the link.
 *
 * Now:
 *
 *   - the type is read from the file's first bytes. A JPEG has to start like
 *     a JPEG. The stored name's extension comes from that type, never from
 *     the name the file arrived with;
 *   - each purpose accepts a fixed set of types;
 *   - private purposes (prescriptions, documents) are stored outside the
 *     public directory and served only through GET /upload/files/:id, to the
 *     uploader, platform staff, and the people the file was shared with by
 *     the flow that uses it (see canRead below).
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { query, queryOne } = require('../../../config/database');
const { getJwtSecret } = require('../../../config/secrets');
const { getStorageProvider } = require('../../../services/storage');

const PUBLIC_BASE = path.join(__dirname, '../../../../public/uploads');
const PRIVATE_BASE = path.join(__dirname, '../../../../private_uploads');

// Kept for callers that import them.
const UPLOAD_BASE = PUBLIC_BASE;

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_FILES = 5;
const LINK_LIFETIME_SECONDS = 10 * 60;

const TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/heic': '.heic',
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'audio/webm': '.webm',
  'audio/mpeg': '.mp3',
  'audio/mp4': '.m4a',
  'audio/ogg': '.ogg',
  'audio/wav': '.wav',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
};

const IMAGES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic'];
const DOCUMENTS = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const AUDIO = ['audio/webm', 'audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/wav'];
const VIDEOS = ['video/mp4', 'video/webm', 'video/quicktime'];

/**
 * What each purpose stores, where, and who can see it. The keys are the
 * values file_uploads.purpose accepts.
 */
const PURPOSES = {
  general: { dir: 'general', private: false, types: [...IMAGES, ...VIDEOS] },
  product_image: { dir: 'products', private: false, types: IMAGES },
  shop_photo: { dir: 'shops', private: false, types: IMAGES },
  profile_photo: { dir: 'profiles', private: false, types: IMAGES },
  review_photo: { dir: 'reviews', private: false, types: IMAGES },
  job_card_photo: { dir: 'job-cards', private: false, types: IMAGES },
  chat_image: { dir: 'chat', private: false, types: IMAGES },
  prescription: { dir: 'prescriptions', private: true, types: [...IMAGES, 'application/pdf'] },
  document: { dir: 'documents', private: true, types: [...IMAGES, ...DOCUMENTS] },
  voice_intro: { dir: 'audio', private: false, types: AUDIO },
  video: { dir: 'videos', private: false, types: VIDEOS },
  story: { dir: 'stories', private: false, types: [...IMAGES, ...VIDEOS] },
};

// Legacy name for the directory map.
const UPLOAD_DIRS = Object.fromEntries(Object.entries(PURPOSES).map(([key, p]) => [key, path.join(p.private ? PRIVATE_BASE : PUBLIC_BASE, p.dir)]));

class UploadError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'UploadError';
    this.status = status;
    this.code = code;
  }
}

/** The file's real type from its first bytes, or null if it is none we accept. */
function sniff(buffer) {
  if (!buffer || buffer.length < 4) return null;
  const ascii = (start, end) => buffer.subarray(start, end).toString('latin1');

  // Video & Audio formats
  if (buffer.length >= 12 && ascii(4, 8) === 'ftyp') {
    const brand = ascii(8, 12);
    if (brand === 'qt  ') return 'video/quicktime';
    if (['mp41', 'mp42', 'isom', 'MSNV'].includes(brand)) return 'video/mp4';
    if (['M4A ', 'm4a '].includes(brand)) return 'audio/mp4';
    return 'video/mp4';
  }
  if (buffer.length >= 4 && buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) return 'video/webm';
  if (buffer.length >= 12 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WAVE') return 'audio/wav';
  if (buffer.length >= 4 && ascii(0, 4) === 'OggS') return 'audio/ogg';
  if (buffer.length >= 3 && ascii(0, 3) === 'ID3') return 'audio/mpeg';
  if (buffer.length >= 2 && buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) return 'audio/mpeg';

  if (buffer.length < 12) return null;

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
  if (ascii(0, 6) === 'GIF87a' || ascii(0, 6) === 'GIF89a') return 'image/gif';
  if (ascii(4, 8) === 'ftyp' && ['heic', 'heix', 'mif1', 'msf1', 'hevc'].includes(ascii(8, 12))) return 'image/heic';
  if (ascii(0, 5) === '%PDF-') return 'application/pdf';
  if (buffer.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))) return 'application/msword';
  // A .docx is a zip whose entries include word/document.xml.
  if (buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])) && buffer.includes('word/')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  return null;
}

// In memory, so the bytes can be checked before anything is written to disk.
// At most MAX_FILES × MAX_FILE_BYTES per request; the upload rate limiter
// bounds how often.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: MAX_FILES, fields: 20, fieldSize: 2048 },
});

/**
 * Middleware: read the multipart body, taking files under `files` (several)
 * or `file` (one). Multer's own errors become 400/413 answers instead of 500s.
 */
function receive(req, res, next) {
  upload.fields([{ name: 'files', maxCount: MAX_FILES }, { name: 'file', maxCount: 1 }])(req, res, (error) => {
    if (!error) {
      const groups = req.files || {};
      req.uploadedFiles = [...(groups.files || []), ...(groups.file || [])];
      return next();
    }
    if (error instanceof multer.MulterError) {
      const tooBig = error.code === 'LIMIT_FILE_SIZE';
      return res.status(tooBig ? 413 : 400).json({
        success: false,
        code: error.code,
        error: tooBig
          ? `Files can be at most ${MAX_FILE_BYTES / (1024 * 1024)} MB.`
          : error.code === 'LIMIT_FILE_COUNT' || error.code === 'LIMIT_UNEXPECTED_FILE'
            ? `Send up to ${MAX_FILES} files in the field "files" (or one in "file").`
            : error.message,
      });
    }
    return next(error);
  });
}

const cleanName = (name) => String(name || 'file').replace(/[^\w.\- ]+/g, '_').slice(0, 200);
const cleanTag = (value, max) => (value === undefined || value === null || value === '' ? null : String(value).slice(0, max));

/** The address a stored file is fetched from. */
function urlFor(row) {
  return isPrivateRow(row) ? `/api/v1/upload/files/${row.id}` : `/${String(row.file_path).replace(/^\/+/, '')}`;
}

const isPrivateRow = (row) => String(row.file_path || '').startsWith('private/');

/**
 * Checks and stores the files on a request (from receive()).
 *
 *   purpose      one of PURPOSES; decides the types accepted and whether the
 *                file is private
 *   module       free label for the flow that uploaded it, e.g. 'kyc', 'resume'
 *   referenceId  what the file belongs to (an order id for a prescription)
 *
 * All the files are checked before any is written: one file of the wrong type
 * and nothing is stored. Returns [{ id, url, name, size, type, private }].
 */
async function storeFiles(files, { userId, purpose = 'general', module = null, referenceId = null }) {
  const kind = PURPOSES[purpose];
  if (!kind) throw new UploadError(400, 'UNKNOWN_PURPOSE', `purpose must be one of: ${Object.keys(PURPOSES).join(', ')}`);
  if (!files || files.length === 0) throw new UploadError(400, 'NO_FILE', 'No file was uploaded.');

  const checked = files.map((file) => {
    const type = sniff(file.buffer);
    if (!type || !kind.types.includes(type)) {
      throw new UploadError(415, 'UNSUPPORTED_TYPE', `"${cleanName(file.originalname)}" is not an accepted file type for ${purpose}. Accepted: ${kind.types.map((t) => TYPES[t]).join(', ')}.`);
    }
    return { file, type };
  });

  const storage = getStorageProvider();
  const stored = [];
  for (const { file, type } of checked) {
    const id = crypto.randomUUID();
    const name = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${TYPES[type]}`;
    const relative = kind.private ? `private/${kind.dir}/${name}` : `uploads/${kind.dir}/${name}`;

    // Write through pluggable storage provider (local disk in dev, S3/R2 in production)
    const storageRes = await storage.putObject({
      key: relative,
      buffer: file.buffer,
      mimeType: type,
      isPublic: !kind.private,
    }).catch(async (err) => {
      if (process.env.NODE_ENV !== 'production') {
        const dir = path.join(kind.private ? PRIVATE_BASE : PUBLIC_BASE, kind.dir);
        await fs.promises.mkdir(dir, { recursive: true });
        await fs.promises.writeFile(path.join(dir, name), file.buffer, { flag: 'wx' });
        return { key: relative, url: urlFor({ id, file_path: relative }) };
      }
      throw err;
    });

    await query(
      `INSERT INTO file_uploads
         (id, uploader_id, user_id, file_name, file_path, file_type, mime_type, file_size, purpose, reference_id, module, is_public)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      // One placeholder per column. uploader_id is UUID on PostgreSQL and
      // user_id is not, so a shared $2 failed every upload there with
      // "inconsistent types deduced for parameter $2" (found when the upload
      // suites were ported off their SQLite pin, F-127).
      [id, userId || null, userId || null, cleanName(file.originalname), relative, type, type, file.size, purpose,
        cleanTag(referenceId, 100), cleanTag(module, 40), kind.private ? '0' : '1']
    );

    stored.push({
      id,
      url: kind.private ? urlFor({ id, file_path: relative }) : (storageRes.url || urlFor({ id, file_path: relative })),
      name: cleanName(file.originalname),
      size: file.size,
      type,
      private: kind.private,
    });
  }
  return stored;
}

const STAFF = new Set(['admin', 'super_admin', 'territory_admin', 'moderator']);

/**
 * May `user` read this private file?
 *
 *   the uploader, and platform staff — always
 *   a prescription named against an order: the shop that order is from
 *   a résumé (module 'resume'): an employer the uploader has applied to
 */
async function canRead(row, user) {
  if (!user || !user.id) return false;
  if (String(row.uploader_id || row.user_id) === String(user.id)) return true;
  if (STAFF.has(String(user.role || '').toLowerCase())) return true;

  if (row.purpose === 'prescription' && row.reference_id) {
    const shop = await queryOne(
      `SELECT s.owner_id FROM orders o JOIN local_shops s ON s.id = o.shop_id
        WHERE CAST(o.id AS TEXT) = $1 AND CAST(o.user_id AS TEXT) = $2`,
      [String(row.reference_id), String(row.uploader_id)]
    );
    if (shop && String(shop.owner_id) === String(user.id)) return true;
  }

  if (row.module === 'resume') {
    const applied = await queryOne(
      `SELECT 1 AS ok FROM job_applications a JOIN local_job_postings p ON CAST(p.id AS TEXT) = CAST(a.job_id AS TEXT)
        WHERE COALESCE(CAST(a.applicant_id AS TEXT), a.user_id) = $1 AND CAST(p.employer_id AS TEXT) = $2
        LIMIT 1`,
      [String(row.uploader_id), String(user.id)]
    );
    if (applied) return true;
  }
  return false;
}

/** A signature that lets a link to a private file be opened without a session, until `expires`. */
function signature(id, expires) {
  return crypto.createHmac('sha256', getJwtSecret()).update(`upload:${id}:${expires}`).digest('hex');
}

/** A link to a private file that works for LINK_LIFETIME_SECONDS — for an <img> tag, which cannot send a token. */
function signedLink(id, now = Date.now()) {
  const expires = Math.floor(now / 1000) + LINK_LIFETIME_SECONDS;
  return { url: `/api/v1/upload/files/${id}?expires=${expires}&signature=${signature(id, expires)}`, expiresAt: new Date(expires * 1000).toISOString() };
}

function signatureValid(id, expires, supplied, now = Date.now()) {
  const exp = Number(expires);
  if (!Number.isInteger(exp) || exp < Math.floor(now / 1000) || typeof supplied !== 'string') return false;
  const expected = Buffer.from(signature(id, exp));
  const given = Buffer.from(supplied);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

/** Where a stored file is on disk. */
function diskPath(row) {
  const relative = String(row.file_path).replace(/^\/+/, '');
  const base = relative.startsWith('private/') ? PRIVATE_BASE : PUBLIC_BASE;
  const inside = relative.replace(/^(private|uploads)\//, '');
  const full = path.resolve(base, inside);
  // Rows are written by storeFiles, but a path is never followed out of its base.
  if (!full.startsWith(path.resolve(base) + path.sep)) return null;
  return full;
}

/** Deletes a file and its record. Only its uploader or platform staff. Returns false if there is no such file. */
async function deleteUpload(fileId, user) {
  const record = await queryOne('SELECT * FROM file_uploads WHERE id = $1', [fileId]);
  if (!record) return false;
  if (user && String(record.uploader_id || record.user_id) !== String(user.id) && !STAFF.has(String(user.role || '').toLowerCase())) {
    throw new UploadError(403, 'FORBIDDEN', 'You cannot delete this file.');
  }
  const full = diskPath(record);
  if (full) await fs.promises.rm(full, { force: true });
  await query('DELETE FROM file_uploads WHERE id = $1', [fileId]);
  return true;
}

/** Kept for callers: one received file stored as `purpose`. */
async function recordUpload(uploaderId, file, purpose, referenceId) {
  const [stored] = await storeFiles([file], { userId: uploaderId, purpose: purpose || 'general', referenceId });
  return { id: stored.id, url: stored.url, originalName: stored.name, size: stored.size, type: stored.type };
}

/**
 * Express handler for an upload endpoint: receive() must run first.
 * Answers 201 { success, files, url, fileUrl } — url and fileUrl are the
 * first file's, for clients that send one.
 */
async function handleUpload(req, res, next) {
  try {
    const body = req.body || {};
    const files = await storeFiles(req.uploadedFiles, {
      userId: req.user.id,
      purpose: body.purpose || 'general',
      module: body.module,
      referenceId: body.referenceId ?? body.reference_id ?? body.entity_id,
    });
    res.status(201).json({ success: true, files, count: files.length, url: files[0].url, fileUrl: files[0].url });
  } catch (error) {
    if (error instanceof UploadError) return res.status(error.status).json({ success: false, code: error.code, error: error.message });
    next(error);
  }
}

function getFileUrl(filePath) {
  if (!filePath) return null;
  if (String(filePath).startsWith('http')) return filePath;
  return filePath;
}

module.exports = {
  upload,
  receive,
  handleUpload,
  storeFiles,
  recordUpload,
  deleteUpload,
  canRead,
  signedLink,
  signatureValid,
  diskPath,
  urlFor,
  sniff,
  getFileUrl,
  UploadError,
  PURPOSES,
  UPLOAD_BASE,
  UPLOAD_DIRS,
  PRIVATE_BASE,
  MAX_FILE_BYTES,
};
