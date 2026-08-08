const express = require('express');
const router = express.Router();
const { query } = require('../../../../config/database');
const { authenticate } = require('../../../../middleware/auth.middleware');

// GET volunteer events
router.get('/events', authenticate, async (req, res, next) => {
    try {
        const evntData = await query('SELECT * FROM volunteer_events WHERE status = $1', ['upcoming']);
        res.json(evntData.rows || evntData);
    } catch (err) {
        next(err);
    }
});

// POST register for event
router.post('/register', authenticate, async (req, res, next) => {
    try {
        const { event_id } = req.body;
        await query('UPDATE volunteer_events SET registered_count = registered_count + 1 WHERE id = $1', [event_id]);
        res.status(200).json({ success: true, message: 'Successfully registered for the event!' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
