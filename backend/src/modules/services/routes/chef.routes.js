const express = require('express');
const router = express.Router();
const { query } = require('../../../../config/database');
const { authenticate } = require('../../../../middleware/auth.middleware');

// GET meals
router.get('/meals', authenticate, async (req, res, next) => {
    try {
        const mealData = await query('SELECT * FROM chef_meals WHERE status = $1', ['available']);
        res.json(mealData.rows || mealData);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
