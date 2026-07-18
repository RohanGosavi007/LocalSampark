const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticate } = require('../middleware/auth.middleware');
const crypto = require('crypto');

// GET all leads for user
router.get('/leads', authenticate, async (req, res, next) => {
    try {
        const leadsData = await query('SELECT * FROM crm_leads WHERE owner_id = $1 ORDER BY created_at DESC', [req.user.id]);
        res.json(leadsData.rows || leadsData);
    } catch (err) {
        next(err);
    }
});

// POST add lead
router.post('/leads', authenticate, async (req, res, next) => {
    try {
        const { customer_name, phone } = req.body;
        const id = crypto.randomUUID();
        await query('INSERT INTO crm_leads (id, owner_id, customer_name, phone, status) VALUES ($1, $2, $3, $4, $5)', [id, req.user.id, customer_name, phone, 'new']);
        res.status(201).json({ success: true, id });
    } catch (err) {
        next(err);
    }
});

// GET all campaigns
router.get('/campaigns', authenticate, async (req, res, next) => {
    try {
        const campData = await query('SELECT * FROM crm_campaigns WHERE owner_id = $1 ORDER BY created_at DESC', [req.user.id]);
        res.json(campData.rows || campData);
    } catch (err) {
        next(err);
    }
});

// POST create campaign
router.post('/campaigns', authenticate, async (req, res, next) => {
    try {
        const { campaign_type, target_audience } = req.body;
        const id = crypto.randomUUID();
        await query('INSERT INTO crm_campaigns (id, owner_id, campaign_type, target_audience, status) VALUES ($1, $2, $3, $4, $5)', [id, req.user.id, campaign_type, target_audience, 'active']);
        res.status(201).json({ success: true, id });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
