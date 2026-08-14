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
    const txData = await query('SELECT * FROM wallet_transactions WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
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

    try {
      await query(
        `INSERT INTO user_documents (id, user_id, document_type, document_number, document_url, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [docId, req.user.id, documentType, documentNumber || '', docUrl, 'PENDING_VERIFICATION']
      );
    } catch (dbErr) {
      if (dbErr.message.includes('relation "user_documents" does not exist') || dbErr.message.includes('no such table')) {
        await query(`
          CREATE TABLE IF NOT EXISTS user_documents (
            id VARCHAR(255) PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            document_type VARCHAR(100),
            document_number VARCHAR(100),
            document_url TEXT,
            status VARCHAR(50) DEFAULT 'PENDING_VERIFICATION',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        await query(
          `INSERT INTO user_documents (id, user_id, document_type, document_number, document_url, status)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [docId, req.user.id, documentType, documentNumber || '', docUrl, 'PENDING_VERIFICATION']
        );
      } else {
        throw dbErr;
      }
    }

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
