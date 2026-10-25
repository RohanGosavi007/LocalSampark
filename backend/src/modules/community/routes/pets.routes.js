const express = require('express');
const router = express.Router();
const { query } = require('../../../config/database');
const { authenticate } = require('../../../middleware/auth.middleware');

// GET pet services
router.get('/services', authenticate, async (req, res, next) => {
    try {
        const petData = await query('SELECT * FROM pet_services');
        res.json(petData.rows || petData);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
