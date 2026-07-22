const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { query, queryOne } = require('../../../config/database');

// ─── UPLOAD DIRECTORY SETUP ──────────────────────────────────────
const UPLOAD_BASE = path.join(__dirname, '../../public/uploads');

const UPLOAD_DIRS = {
  product_image: path.join(UPLOAD_BASE, 'products'),
  shop_photo: path.join(UPLOAD_BASE, 'shops'),
  profile_photo: path.join(UPLOAD_BASE, 'profiles'),
  prescription: path.join(UPLOAD_BASE, 'prescriptions'),
  document: path.join(UPLOAD_BASE, 'documents'),
  review_photo: path.join(UPLOAD_BASE, 'reviews'),
  job_card_photo: path.join(UPLOAD_BASE, 'job-cards'),
  chat_image: path.join(UPLOAD_BASE, 'chat'),
  general: path.join(UPLOAD_BASE, 'general'),
};

// Ensure all directories exist
Object.values(UPLOAD_DIRS).forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// ─── MULTER STORAGE CONFIG ──────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const purpose = req.body.purpose || req.query.purpose || 'general';
    const dir = UPLOAD_DIRS[purpose] || UPLOAD_DIRS.general;
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `${Date.now()}-${uniqueSuffix}${ext}`;
    cb(null, safeName);
  }
});

// ─── FILE FILTER ──────────────────────────────────────────────────
const fileFilter = (req, file, cb) => {
  const allowedTypes = {
    'image/jpeg': true,
    'image/png': true,
    'image/webp': true,
    'image/gif': true,
    'application/pdf': true,
    'application/msword': true,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': true,
  };

  if (allowedTypes[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not supported. Allowed: JPEG, PNG, WebP, GIF, PDF, DOC, DOCX`), false);
  }
};

// ─── MULTER INSTANCES ──────────────────────────────────────────────
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
    files: 10, // Max 10 files per request
  }
});

// ─── UPLOAD SERVICE FUNCTIONS ──────────────────────────────────────

/**
 * Save file upload record to database
 */
async function recordUpload(uploaderId, file, purpose, referenceId) {
  const id = crypto.randomUUID();
  const relativePath = `/uploads/${purpose}/${file.filename}`;
  
  await queryOne(
    `INSERT INTO file_uploads (id, uploader_id, file_name, file_path, file_type, file_size, purpose, reference_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [id, uploaderId, file.originalname, relativePath, file.mimetype, file.size, purpose || 'general', referenceId || null]
  );

  return {
    id,
    url: relativePath,
    originalName: file.originalname,
    size: file.size,
    type: file.mimetype,
  };
}

/**
 * Delete a file from disk and database
 */
async function deleteUpload(fileId) {
  const record = await queryOne('SELECT * FROM file_uploads WHERE id = $1', [fileId]);
  if (!record) return false;

  const fullPath = path.join(__dirname, '../../public', record.file_path);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }

  await query('DELETE FROM file_uploads WHERE id = $1', [fileId]);
  return true;
}

/**
 * Get the public URL for a file path
 */
function getFileUrl(filePath) {
  if (!filePath) return null;
  if (filePath.startsWith('http')) return filePath;
  // Return relative path — frontend prepends API_BASE
  return filePath;
}

module.exports = {
  upload,
  recordUpload,
  deleteUpload,
  getFileUrl,
  UPLOAD_BASE,
  UPLOAD_DIRS,
};
