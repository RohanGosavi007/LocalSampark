const express = require('express');
const { validate } = require('../../../middleware/validate');
const router = express.Router();
const { query, queryOne } = require('../../../config/database');
const { authenticate, optionalAuth } = require('../../../middleware/auth.middleware');

router.get('/posts', optionalAuth, async (req, res, next) => {
  try {
    const { regionId, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let posts;
    if (regionId) {
      posts = await query(`SELECT p.*, u.full_name, u.avatar_url,
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
      posts = await query(`SELECT p.*, u.full_name, u.avatar_url,
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

router.post('/posts', authenticate, validate({
  content: { type: 'string', required: true, maxLength: 5000 },
  // Upload paths as well as links: relative paths are what the apps send.
  mediaUrls: { type: 'array', maxItems: 10, items: { type: 'string', maxLength: 500 } },
  postType: { type: 'string', maxLength: 30 },
  regionId: { type: 'string', maxLength: 64 },
  societyId: { type: 'string', maxLength: 64 },
  latitude: { type: 'number', min: -90, max: 90 },
  longitude: { type: 'number', min: -180, max: 180 },
}), async (req, res, next) => {
  try {
    const { content, mediaUrls, postType, regionId, societyId, latitude, longitude } = req.body;
    
    // The point is spliced into the SQL text below, so only values that are
    // provably numbers may reach it. The raw body values went in verbatim,
    // which made `longitude` an injection point for any signed-in user.
    const lat = Number(latitude);
    const lng = Number(longitude);
    const hasPoint = Boolean(latitude) && Boolean(longitude)
      && Number.isFinite(lat) && Number.isFinite(lng)
      && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
    const geom = hasPoint ? `ST_GeomFromText('POINT(${lng} ${lat})', 4326)` : null;

    // authenticate() sets req.user to the users row, whose column is
    // region_id. `req.user.regionId` was always undefined, so a post made
    // without an explicit regionId was saved with no region at all.
    const post = await queryOne(`INSERT INTO posts (user_id, content, media_urls, post_type, region_id, society_id, coordinate)
       VALUES ($1, $2, $3, $4, $5, $6, ${geom ? geom : 'NULL'})
       RETURNING *`,
      [req.user.id, content, JSON.stringify(mediaUrls || []), postType || 'discussion', regionId || req.user.region_id || null, societyId || null]
    );

    // Award loyalty points
    await query(`INSERT INTO sampark_points (user_id, points, action, reference_id, description)
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
    if (!['up', 'down'].includes(voteType)) return res.status(400).json({ error: "voteType must be 'up' or 'down'" });
    const postId = req.params.id;

    await query(`INSERT INTO votes (post_id, user_id, vote_type)
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
