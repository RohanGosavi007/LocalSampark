const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticate } = require('../../../../middleware/auth.middleware');

const API_URL = process.env.API_URL || 'http://localhost:5000';

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Allowed file types
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf',
  'video/mp4', 'video/webm',
];

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

// Multer Config with validation
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(sanitizedName));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed. Accepted: JPEG, PNG, WebP, GIF, PDF, MP4, WebM`));
    }
  }
});

// Single file upload
router.post('/', authenticate, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const fileUrl = `${API_URL}/uploads/${req.file.filename}`;
    res.json({
      success: true,
      fileUrl,
      fileName: req.file.filename,
      size: req.file.size,
      mimeType: req.file.mimetype,
    });
  } catch (err) {
    console.error('Upload Error:', err);
    res.status(500).json({ success: false, message: 'Failed to upload image' });
  }
});

// Multiple file upload (up to 5)
router.post('/multiple', authenticate, upload.array('files', 5), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }
    const files = req.files.map(file => ({
      fileUrl: `${API_URL}/uploads/${file.filename}`,
      fileName: file.filename,
      size: file.size,
      mimeType: file.mimetype,
    }));
    res.json({ success: true, files });
  } catch (err) {
    console.error('Multi Upload Error:', err);
    res.status(500).json({ success: false, message: 'Failed to upload files' });
  }
});

// Error handler for multer errors
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ success: false, message: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB` });
    }
    return res.status(400).json({ success: false, message: err.message });
  }
  if (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next();
});

module.exports = router;
