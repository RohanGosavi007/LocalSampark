const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../../../../config/database');
const { authenticate, optionalAuth } = require('../../../../middleware/auth.middleware');

router.get('/posts', optionalAuth, async (req, res, next) => {
  try {
    const { regionId, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let posts;
    if (regionId) {
      posts = await query(
        `SELECT p.*, u.full_name, u.avatar_url,
                (SELECT COUNT(*) FROM votes WHERE post_id = p.id AND vote_type = 'up') as upvotes,
                (SELECT COUNT(*) FROM votes WHERE post_id = p.id AND vote_type = 'down') as downvotes
         FROM posts p
         JOIN users u ON p.user_id = u.id
         WHERE p.region_id = $1
         ORDER BY p.created_at DESC
         LIMIT $2 OFFSET $3`,
        [regionId, limit, offset]
      );
    } else {
      posts = await query(
        `SELECT p.*, u.full_name, u.avatar_url,
                (SELECT COUNT(*) FROM votes WHERE post_id = p.id AND vote_type = 'up') as upvotes,
                (SELECT COUNT(*) FROM votes WHERE post_id = p.id AND vote_type = 'down') as downvotes
         FROM posts p
         JOIN users u ON p.user_id = u.id
         ORDER BY p.created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
    }
    res.json(posts);
  } catch (error) {
    next(error);
  }
});

router.post('/posts', authenticate, async (req, res, next) => {
  try {
    const { content, mediaUrls, postType, regionId, societyId, latitude, longitude } = req.body;
    
    let geom = null;
    if (latitude && longitude) {
      geom = `ST_GeomFromText('POINT(${longitude} ${latitude})', 4326)`;
    }

    const post = await queryOne(
      `INSERT INTO posts (user_id, content, media_urls, post_type, region_id, society_id, coordinate)
       VALUES ($1, $2, $3, $4, $5, $6, ${geom ? geom : 'NULL'})
       RETURNING *`,
      [req.user.id, content, JSON.stringify(mediaUrls || []), postType || 'discussion', regionId || req.user.regionId, societyId || null]
    );

    // Award loyalty points
    await query(
      `INSERT INTO sampark_points (user_id, points, action, reference_id, description)
       VALUES ($1, 5, 'post', $2, 'Posted on community feed')`,
      [req.user.id, post.id]
    );

    res.status(201).json(post);
  } catch (error) {
    next(error);
  }
});

router.post('/posts/:id/vote', authenticate, async (req, res, next) => {
  try {
    const { voteType } = req.body; // 'up' or 'down'
    const postId = req.params.id;

    await query(
      `INSERT INTO votes (post_id, user_id, vote_type)
       VALUES ($1, $2, $3)
       ON CONFLICT (post_id, user_id) 
       DO UPDATE SET vote_type = EXCLUDED.vote_type`,
      [postId, req.user.id, voteType]
    );

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
