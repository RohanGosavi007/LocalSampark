const express = require('express');
const router = express.Router();
const { query } = require('../../../config/database');
const { authenticate } = require('../../../middleware/auth.middleware');

// GET contacts
router.get('/contacts', authenticate, async (req, res, next) => {
    try {
        const result = await query(`
            SELECT DISTINCT u.id, u.name, u.role, u.user_type
            FROM users u
            JOIN chat_messages c ON (c.sender_id = u.id OR c.receiver_id = u.id)
            WHERE (c.sender_id = $1 OR c.receiver_id = $1) AND u.id != $1
        `, [req.user.id]);
        res.json({ success: true, data: result.rows || result });
    } catch (err) {
        next(err);
    }
});

// GET messages
router.get('/messages/:userId', authenticate, async (req, res, next) => {
    try {
        const { userId } = req.params;
        const result = await query(`
            SELECT * FROM chat_messages 
            WHERE (sender_id = $1 AND receiver_id = $2) 
               OR (sender_id = $2 AND receiver_id = $1)
            ORDER BY created_at ASC
        `, [req.user.id, userId]);
        res.json({ success: true, data: result.rows || result });
    } catch (err) {
        next(err);
    }
});

// GET search-users
router.get('/search-users', authenticate, async (req, res, next) => {
    try {
        const { q } = req.query;
        if (!q) return res.json({ success: true, data: [] });
        const result = await query(`
            SELECT id, name, role, user_type FROM users 
            WHERE (name LIKE $1 OR id LIKE $1) AND id != $2 
            LIMIT 10
        `, [`%${q}%`, req.user.id]);
        res.json({ success: true, data: result.rows || result });
    } catch (err) {
        next(err);
    }
});

// ─── CONVERSATIONS ───────────────────────────────────────────────────────────
// The chat page has always called this; it was never implemented, so the page
// fell back to demo conversations. Threads are derived from chat_messages:
// one row per counterparty with the latest message and unread count.
router.get('/conversations', authenticate, async (req, res, next) => {
  try {
    const rows = await query(
      `WITH threads AS (
         SELECT
           CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END AS peer_id,
           message,
           created_at,
           is_read,
           receiver_id,
           ROW_NUMBER() OVER (
             PARTITION BY CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END
             ORDER BY created_at DESC
           ) AS rn
         FROM chat_messages
         WHERE sender_id = $1 OR receiver_id = $1
       )
       SELECT t.peer_id                AS user_id,
              u.full_name              AS name,
              u.avatar_url,
              t.message                AS last_message,
              t.created_at             AS last_message_at,
              (SELECT COUNT(*) FROM chat_messages m
                WHERE m.sender_id = t.peer_id
                  AND m.receiver_id = $1
                  AND (m.is_read = false OR m.is_read = 0)) AS unread_count
         FROM threads t
         LEFT JOIN users u ON u.id = t.peer_id
        WHERE t.rn = 1 AND t.peer_id IS NOT NULL
        ORDER BY t.created_at DESC
        LIMIT 50`,
      [req.user.id]
    );

    res.json(rows.rows || rows);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
