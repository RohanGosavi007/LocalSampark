const express = require('express');
const router = express.Router();
const { query } = require('../../../config/database');
const { authenticate } = require('../../../middleware/auth.middleware');
const crypto = require('crypto');

// POST schedule scrap pickup
router.post('/schedule', authenticate, async (req, res, next) => {
    try {
        const { address, preferred_time, estimated_weight } = req.body;
        const id = crypto.randomUUID();
        await query('INSERT INTO scrap_pickups (id, user_id, address, preferred_time, estimated_weight) VALUES ($1, $2, $3, $4, $5)',
            [id, req.user.id, address, preferred_time, estimated_weight]);
        res.status(201).json({ success: true, message: 'Scrap pickup scheduled successfully' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
