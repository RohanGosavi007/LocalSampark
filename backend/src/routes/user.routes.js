const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../config/database');
const { authenticate } = require('../middleware/auth.middleware');

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await queryOne('SELECT * FROM users WHERE id = $1', [req.user.id]);
    res.json(user);
  } catch (error) {
    next(error);
  }
});

router.put('/me', authenticate, async (req, res, next) => {
  try {
    const { fullName, email, avatarUrl, bio, languagePreference, regionId } = req.body;
    const user = await queryOne(
      `UPDATE users 
       SET full_name = COALESCE($1, full_name), 
           email = COALESCE($2, email), 
           avatar_url = COALESCE($3, avatar_url), 
           bio = COALESCE($4, bio), 
           language_preference = COALESCE($5, language_preference), 
           region_id = COALESCE($6, region_id),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 
       RETURNING *`,
      [fullName, email, avatarUrl, bio, languagePreference, regionId, req.user.id]
    );
    res.json(user);
  } catch (error) {
    next(error);
  }
});

router.get('/me/wallet', authenticate, async (req, res, next) => {
  try {
    const wallet = await queryOne('SELECT * FROM wallets WHERE user_id = $1', [req.user.id]);
    const transactions = await query(
      'SELECT * FROM wallet_transactions WHERE wallet_id = $1 ORDER BY created_at DESC',
      [wallet.id]
    );
    res.json({ wallet, transactions });
  } catch (error) {
    next(error);
  }
});

router.get('/me/points', authenticate, async (req, res, next) => {
  try {
    const points = await query(
      'SELECT * FROM sampark_points WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    const balanceResult = await queryOne(
      'SELECT COALESCE(SUM(points), 0) as balance FROM sampark_points WHERE user_id = $1',
      [req.user.id]
    );
    res.json({ points, balance: parseInt(balanceResult.balance) });
  } catch (error) {
    next(error);
  }
});

router.get('/me/documents', authenticate, async (req, res, next) => {
  try {
    const docs = await query('SELECT * FROM user_documents WHERE user_id = $1', [req.user.id]);
    res.json(docs);
  } catch (error) {
    next(error);
  }
});

router.post('/me/documents', authenticate, async (req, res, next) => {
  try {
    const { documentType, title, fileUrl, encryptionKey } = req.body;
    const doc = await queryOne(
      `INSERT INTO user_documents (user_id, document_type, title, file_url, encryption_key)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.user.id, documentType, title, fileUrl, encryptionKey]
    );
    res.status(201).json(doc);
  } catch (error) {
    next(error);
  }
});

// GET user recommendations (Gig jobs & property matches)
router.get('/me/recommendations', authenticate, async (req, res, next) => {
  try {
    // Find jobs that match the user's skills
    const matchedJobs = await query(
      `SELECT jv.*, ls.name as shop_name 
       FROM job_vacancies jv
       JOIN local_shops ls ON jv.shop_id = ls.id
       WHERE jv.title DISTINCT FROM 'none' AND jv.is_active = true
       LIMIT 5`
    );

    // Find verified properties in the same region
    const matchedProperties = await query(
      `SELECT * FROM property_listings 
       WHERE region_id = $1 AND is_active = true 
       LIMIT 5`,
      [req.user.regionId]
    );

    res.json({
      jobs: matchedJobs,
      properties: matchedProperties
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
