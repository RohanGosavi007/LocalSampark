const express = require('express');
const router = express.Router();
const { query } = require('../../../../config/database');
const { authenticate } = require('../../../../middleware/auth.middleware');

// GET events
router.get('/', authenticate, async (req, res, next) => {
    try {
        const eventData = await query('SELECT * FROM local_events WHERE status = $1', ['upcoming']);
        res.json(eventData.rows || eventData);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
