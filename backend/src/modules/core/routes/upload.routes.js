const express = require('express');
const fs = require('fs');
const router = express.Router();
const { queryOne } = require('../../../config/database');
const { authenticate, optionalAuth } = require('../../../middleware/auth.middleware');
const uploads = require('../services/upload.service');

/**
 * Uploads — mounted at /upload behind the upload rate limiter.
 *
 *   POST   /upload                  store files; multipart, field "files" (up
 *                                   to 5) or "file", with purpose, module and
 *                                   referenceId fields. See upload.service.js
 *                                   for the purposes and the types each takes.
 *   GET    /upload/files/:id        a private file, to someone allowed to see it
 *   GET    /upload/files/:id/link   a link to it that works for ten minutes
 *                                   without a session (for an <img> tag)
 *   DELETE /upload/files/:id        the uploader or platform staff
 *
 * A placeholder POST /upload/upload stood here, answering 501. The real
 * endpoint was in modules/services/routes/advanced.routes.js, accepting any
 * file whose name ended in an allowed extension.
 */

router.post('/', authenticate, uploads.receive, uploads.handleUpload);

async function privateFile(id) {
  const row = await queryOne('SELECT * FROM file_uploads WHERE id = $1', [id]);
  return row && String(row.file_path || '').startsWith('private/') ? row : null;
}

router.get('/files/:id/link', authenticate, async (req, res, next) => {
  try {
    const row = await privateFile(req.params.id);
    if (!row || !(await uploads.canRead(row, req.user))) return res.status(404).json({ success: false, error: 'File not found' });
    res.json({ success: true, ...uploads.signedLink(row.id) });
  } catch (error) {
    next(error);
  }
});

router.get('/files/:id', optionalAuth, async (req, res, next) => {
  try {
    const row = await privateFile(req.params.id);
    // "Not found" whether the file does not exist or is not the caller's to
    // see, so ids cannot be probed.
    const allowed = row && (
      uploads.signatureValid(row.id, req.query.expires, req.query.signature)
      || (req.user && (await uploads.canRead(row, req.user)))
    );
    if (!allowed) return res.status(404).json({ success: false, error: 'File not found' });

    const full = uploads.diskPath(row);
    if (!full || !fs.existsSync(full)) return res.status(404).json({ success: false, error: 'File not found' });

    res.set({
      'Content-Type': row.mime_type || row.file_type || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${String(row.file_name || 'file').replace(/"/g, '')}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    fs.createReadStream(full).on('error', next).pipe(res);
  } catch (error) {
    next(error);
  }
});

router.delete('/files/:id', authenticate, async (req, res, next) => {
  try {
    const deleted = await uploads.deleteUpload(req.params.id, req.user);
    if (!deleted) return res.status(404).json({ success: false, error: 'File not found' });
    res.json({ success: true });
  } catch (error) {
    if (error instanceof uploads.UploadError) return res.status(error.status).json({ success: false, code: error.code, error: error.message });
    next(error);
  }
});

module.exports = router;
