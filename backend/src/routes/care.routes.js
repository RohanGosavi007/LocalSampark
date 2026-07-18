const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticate } = require('../middleware/auth.middleware');
const crypto = require('crypto');

// GET care providers
router.get('/providers', authenticate, async (req, res, next) => {
    try {
        const cpData = await query('SELECT * FROM care_providers WHERE status = $1', ['active']);
        res.json(cpData.rows || cpData);
    } catch (err) {
        next(err);
    }
});

// POST care request
router.post('/request', authenticate, async (req, res, next) => {
    try {
        const { provider_id, date } = req.body;
        const id = crypto.randomUUID();
        await query('INSERT INTO care_requests (id, provider_id, user_id, date, status) VALUES ($1, $2, $3, $4, $5)',
            [id, provider_id, req.user.id, date, 'pending']);
        res.status(201).json({ success: true, id, message: 'Care request submitted successfully' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
