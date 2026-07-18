const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticate } = require('../middleware/auth.middleware');
const crypto = require('crypto');

// GET pharmacies
router.get('/pharmacies', authenticate, async (req, res, next) => {
    try {
        const phData = await query('SELECT * FROM pharmacies WHERE status = $1', ['active']);
        res.json(phData.rows || phData);
    } catch (err) {
        next(err);
    }
});

// POST order medicine
router.post('/order', authenticate, async (req, res, next) => {
    try {
        const { pharmacy_id, notes } = req.body;
        const id = crypto.randomUUID();
        await query('INSERT INTO medical_orders (id, pharmacy_id, user_id, notes, status) VALUES ($1, $2, $3, $4, $5)',
            [id, pharmacy_id, req.user.id, notes, 'pending']);
        res.status(201).json({ success: true, id, message: 'Medical order submitted successfully' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
