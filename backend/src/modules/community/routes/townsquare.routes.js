const express = require('express');
const router = express.Router();
const { query } = require('../../../config/database');
const { authenticate } = require('../../../middleware/auth.middleware');

// GET townsquare news
router.get('/news', authenticate, async (req, res, next) => {
    try {
        const newsData = await query('SELECT * FROM townsquare_posts ORDER BY created_at DESC');
        res.json({ success: true, data: newsData.rows || newsData });
    } catch (err) {
        next(err);
    }
});

// GET townsquare polls
router.get('/polls', authenticate, async (req, res, next) => {
    try {
        const pollData = await query('SELECT * FROM townsquare_polls WHERE active = 1 ORDER BY created_at DESC');
        const formatted = (pollData.rows || pollData).map(p => ({
            id: p.id,
            question: p.question,
            options: JSON.parse(p.options_json),
            reward_coins: p.reward_coins,
            active: p.active
        }));
        res.json({ success: true, data: formatted });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
