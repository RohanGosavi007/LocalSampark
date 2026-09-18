const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../../../config/database');
const crypto = require('crypto');
const { authenticate } = require('../../../middleware/auth.middleware');

/**
 * GET and PUT /me read the users table directly.
 *
 * They used to go through Prisma while `authenticate` — and every other route
 * in this file — went through config/database. Those are two different
 * datasources: config/prisma.js builds a real PrismaClient even when
 * USE_SQLITE=true, so with the local SQLite configuration the middleware
 * authenticated against SQLite and this handler then queried Supabase. The
 * observed result was a 500 on every call:
 *
 *     FATAL: (ENOIDENTIFIER) no tenant identifier provided
 *
 * /users/me is the first call every client makes after login, so this single
 * split broke the opening screen of both apps. The rest of this file already
 * used `query`; these two now match it.
 */

/** The users table is snake_case; Prisma's model was camelCase. Serve both so
 *  no existing client breaks on the change. */
function presentUser(row) {
  if (!row) return null;
  return {
    ...row,
    id: row.id,
    name: row.full_name ?? row.name ?? null,
    fullName: row.full_name ?? row.name ?? null,
    phone: row.phone_number ?? row.phone ?? null,
    avatarUrl: row.avatar_url ?? null,
    regionId: row.region_id ?? null,
    isActive: row.is_active === 1 || row.is_active === true,
    isVerified: row.is_verified === 1 || row.is_verified === true,
  };
}

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await queryOne('SELECT * FROM users WHERE id = $1', [req.user.id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    // Never ship the hash, whatever else the row carries.
    delete user.password_hash;
    res.json(presentUser(user));
  } catch (error) {
    next(error);
  }
});

router.put('/me', authenticate, async (req, res, next) => {
  try {
    const { fullName, name, email, avatarUrl, regionId } = req.body;

    // Only the fields actually supplied are written, so a partial update does
    // not blank the rest of the profile.
    const updates = [];
    const params = [];
    const set = (column, value) => {
      if (value === undefined || value === null || value === '') return;
      params.push(value);
      updates.push(`${column} = $${params.length}`);
    };

    set('full_name', name || fullName);
    set('email', email);
    set('avatar_url', avatarUrl);
    set('region_id', regionId);

    if (!updates.length) {
      const current = await queryOne('SELECT * FROM users WHERE id = $1', [req.user.id]);
      if (current) delete current.password_hash;
      return res.json(presentUser(current));
    }

    params.push(req.user.id);
    await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${params.length}`,
      params
    );

    const user = await queryOne('SELECT * FROM users WHERE id = $1', [req.user.id]);
    if (user) delete user.password_hash;
    res.json(presentUser(user));
  } catch (error) {
    next(error);
  }
});

router.get('/me/wallet', authenticate, async (req, res, next) => {
  try {
    const txData = await query('SELECT * FROM wallet_transactions WHERE wallet_id = (SELECT id FROM wallets WHERE user_id = $1) ORDER BY created_at DESC', [req.user.id]);
    const transactions = txData.rows || txData || [];
    const balance = transactions.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
    res.json({ wallet: { balance }, transactions });
  } catch (error) {
    next(error);
  }
});

router.get('/me/points', authenticate, async (req, res, next) => {
  try {
    let txData;
    try {
      txData = await query('SELECT * FROM loyalty_transactions WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    } catch (e) {
      txData = { rows: [] };
    }
    const points = txData.rows || txData || [];
    const balance = points.reduce((acc, curr) => acc + (parseInt(curr.amount, 10) || 0), 0);
    res.json({ points, balance: balance || 100 });
  } catch (error) {
    next(error);
  }
});

router.get('/me/documents', authenticate, async (req, res, next) => {
  try {
    let docs;
    try {
      docs = await query('SELECT * FROM user_documents WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    } catch (e) {
      docs = { rows: [] };
    }
    res.json(docs.rows || docs || []);
  } catch (error) {
    next(error);
  }
});

router.post('/me/documents', authenticate, async (req, res, next) => {
  try {
    const { documentType, documentNumber, documentUrl, fileUrl } = req.body;
    if (!documentType || (!documentUrl && !fileUrl)) {
      return res.status(400).json({ error: 'Document type and file URL are required' });
    }

    const docId = crypto.randomUUID();
    const docUrl = documentUrl || fileUrl;

    // No inner try/catch here. This used to create user_documents on the fly
    // if it was missing, using a `document_url` column that the real table
    // does not have. The table is declared by migration 082 and the URL lives
    // in file_url, so the fallback was both unnecessary and wrong. Once the
    // fallback went, the catch did nothing but rethrow — the outer handler
    // below already forwards to next().
    await query(
      `INSERT INTO user_documents (id, user_id, document_type, document_number, file_url, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [docId, req.user.id, documentType, documentNumber || '', docUrl, 'PENDING_VERIFICATION']
    );

    res.status(201).json({
      success: true,
      message: 'Document submitted for verification successfully',
      document: { id: docId, documentType, documentNumber, status: 'PENDING_VERIFICATION' }
    });
  } catch (error) {
    next(error);
  }
});

// GET user recommendations (Gig jobs & property matches)
router.get('/me/recommendations', authenticate, async (req, res, next) => {
  try {
    let jobs = [];
    let properties = [];

    try {
      const jobsRes = await query('SELECT * FROM local_job_postings WHERE status = $1 ORDER BY created_at DESC LIMIT 5', ['active']);
      jobs = jobsRes.rows || jobsRes || [];
    } catch (e) {}

    try {
      const propRes = await query('SELECT * FROM local_property_listings WHERE status = $1 ORDER BY created_at DESC LIMIT 5', ['available']);
      properties = propRes.rows || propRes || [];
    } catch (e) {}

    res.json({
      success: true,
      jobs,
      properties
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
