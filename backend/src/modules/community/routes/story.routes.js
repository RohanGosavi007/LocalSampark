const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../../../../config/database');
const { authenticate } = require('../../../../middleware/auth.middleware');

// GET nearby stories
router.get('/', authenticate, async (req, res, next) => {
  try {
    // Select stories that have not expired
    const stories = await query(
      `SELECT s.*, u.full_name, u.avatar_url 
       FROM stories s
       JOIN users u ON s.user_id = u.id
       WHERE s.expires_at > CURRENT_TIMESTAMP
       ORDER BY s.created_at DESC`
    );
    res.json(stories);
  } catch (error) {
    next(error);
  }
});

// POST create story
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { mediaUrl, mediaType, caption } = req.body;
    if (!mediaUrl) {
      return res.status(400).json({ error: 'Media URL is required' });
    }

    // Set expiry to 24 hours from now
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const story = await queryOne(
      `INSERT INTO stories (user_id, media_url, media_type, caption, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.user.id, mediaUrl, mediaType || 'video', caption || '', expiresAt]
    );

    res.status(201).json(story);
  } catch (error) {
    next(error);
  }
});

// DELETE delete story
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const storyId = req.params.id;
    // Check ownership
    const story = await queryOne('SELECT * FROM stories WHERE id = $1', [storyId]);
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    if (story.user_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Unauthorized to delete this story' });
    }

    await query('DELETE FROM stories WHERE id = $1', [storyId]);
    res.json({ success: true, message: 'Story deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
