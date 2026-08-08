const express = require('express');
const router = express.Router();
const { query } = require('../../../../config/database');
const { authenticate } = require('../../../../middleware/auth.middleware');

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

module.exports = router;
