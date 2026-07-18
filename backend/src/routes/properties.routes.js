const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticate } = require('../middleware/auth.middleware');
const crypto = require('crypto');

// GET properties
router.get('/', authenticate, async (req, res, next) => {
    try {
        const propData = await query('SELECT * FROM properties WHERE status = $1', ['available']);
        res.json(propData.rows || propData);
    } catch (err) {
        next(err);
    }
});

// POST property
router.post('/', authenticate, async (req, res, next) => {
    try {
        const { title, description, price, type, location } = req.body;
        const id = crypto.randomUUID();
        await query('INSERT INTO properties (id, owner_id, title, description, price, type, location) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [id, req.user.id, title, description, price, type, location]);
        res.status(201).json({ success: true, message: 'Property listed successfully' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
