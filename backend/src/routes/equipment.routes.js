const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticate } = require('../middleware/auth.middleware');
const crypto = require('crypto');

// GET equipment
router.get('/', authenticate, async (req, res, next) => {
    try {
        const equipData = await query('SELECT * FROM equipment_rentals WHERE status = $1', ['available']);
        res.json(equipData.rows || equipData);
    } catch (err) {
        next(err);
    }
});

// POST equipment
router.post('/', authenticate, async (req, res, next) => {
    try {
        const { item_name, description, daily_rate } = req.body;
        const id = crypto.randomUUID();
        await query('INSERT INTO equipment_rentals (id, owner_id, item_name, description, daily_rate) VALUES ($1, $2, $3, $4, $5)',
            [id, req.user.id, item_name, description, daily_rate]);
        res.status(201).json({ success: true, message: 'Equipment listed successfully' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
