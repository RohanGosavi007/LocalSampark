const express = require('express');
const router = express.Router();
const { query } = require('../../../config/database');
const { authenticate } = require('../../../middleware/auth.middleware');

// GET subscriptions
router.get('/', authenticate, async (req, res, next) => {
    try {
        const subData = await query('SELECT * FROM daily_subscriptions WHERE user_id = $1', [req.user.id]);
        res.json({ success: true, data: subData.rows || subData });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
