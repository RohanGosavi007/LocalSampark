const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticate } = require('../../../middleware/auth.middleware');

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });
    
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    next(error);
  }
});

router.put('/me', authenticate, async (req, res, next) => {
  try {
    // Note: languagePreference and bio were removed in the Postgres migration.
    const { fullName, name, email, avatarUrl, regionId } = req.body;
    
    const user = await prisma.user.update({
        where: { id: req.user.id },
        data: {
            name: name || fullName || undefined,
            email: email || undefined,
            avatarUrl: avatarUrl || undefined,
            regionId: regionId || undefined
        }
    });
    
    res.json(user);
  } catch (error) {
    next(error);
  }
});

const { query } = require('../../../config/database');
const crypto = require('crypto');

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
