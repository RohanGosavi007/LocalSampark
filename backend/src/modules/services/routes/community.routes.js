const express = require('express');
const router = express.Router();
const { query } = require('../../../../config/database');
const { authenticate } = require('../../../../middleware/auth.middleware');
const { requireFeature } = require('../../../../middleware/feature.middleware');
const crypto = require('crypto');

// Apply GTM Feature Protection
router.use(requireFeature('townsquare'));

// GET /posts - Fetch hyperlocal posts feed
router.get('/posts', async (req, res, next) => {
  try {
    const { category, pincode } = req.query;
    let sql = 'SELECT * FROM community_posts';
    const params = [];

    if (category && category !== 'all') {
      params.push(category);
      sql += ` WHERE category = $${params.length}`;
    }

    if (pincode) {
      params.push(pincode);
      sql += params.length === 1 ? ' WHERE pincode = $1' : ' AND pincode = $2';
    }

    sql += ' ORDER BY created_at DESC LIMIT 50';
    const posts = await query(sql, params);
    res.json({ success: true, posts: posts.rows || posts });
  } catch (err) {
    next(err);
  }
});

// POST /posts - Publish a new community feed post
router.post('/posts', authenticate, async (req, res, next) => {
  try {
    const { content, category = 'general', pincode, mediaUrl } = req.body;
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Post content cannot be empty' });
    }

    const postId = crypto.randomUUID();
    const authorName = req.user.name || 'Anonymous Resident';

    await query(`
      INSERT INTO community_posts (id, author_id, author_name, category, content, media_url, pincode)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [postId, req.user.id, authorName, category, content, mediaUrl || null, pincode || '411015']);

    res.status(201).json({
      success: true,
      message: 'Community post published successfully!',
      post: { id: postId, author_name: authorName, category, content, created_at: new Date() }
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /posts/:id - Moderate/Delete post (Admin or Author)
router.delete('/posts/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (req.user.role === 'admin') {
      await query('DELETE FROM community_posts WHERE id = $1', [id]);
    } else {
      await query('DELETE FROM community_posts WHERE id = $1 AND author_id = $2', [id, req.user.id]);
    }
    res.json({ success: true, message: 'Post deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
