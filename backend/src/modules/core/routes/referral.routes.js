const express = require('express');
const router = express.Router();
const { query } = require('../../../../config/database');
const { authenticate } = require('../../../../middleware/auth.middleware');
const crypto = require('crypto');

// GET code and stats
router.get('/code', authenticate, async (req, res, next) => {
    try {
        const code = `SAMPARK-${req.user.id.substring(0, 5).toUpperCase()}`;
        const refData = await query('SELECT * FROM referrals WHERE referrer_id = $1', [req.user.id]);
        res.json({ code, history: refData.rows || refData });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
