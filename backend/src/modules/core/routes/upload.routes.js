const express = require('express');
const router = express.Router();

/**
 * Placeholder upload endpoint.
 *
 * This router is mounted at /upload in routes/index.js and declares the path
 * '/upload', so it answers POST /upload/upload — NOT POST /upload, which is
 * handled by the real multer-backed endpoint in
 * modules/services/routes/advanced.routes.js. The mobile ImageUploader and
 * every other client call that real one, so nothing reaches this today.
 *
 * It used to respond:
 *
 *     { success: true, url: '/uploads/mock_image_<timestamp>.png' }
 *
 * without reading the request body or writing anything to disk. A caller that
 * found it would get a success response and a URL pointing at a file that does
 * not exist — and, for the KYC document flows this would most plausibly be used
 * for, would persist that dead URL against a rider's record and never know the
 * document was lost.
 *
 * Multer is installed and the working implementation already exists, so rather
 * than duplicate it here this fails loudly and points at the real route.
 */
router.post('/upload', (req, res) => {
  res.status(501).json({
    success: false,
    error: 'Not implemented. Use POST /api/v1/upload, which stores the file.',
  });
});

module.exports = router;
