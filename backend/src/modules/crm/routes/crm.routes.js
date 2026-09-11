const express = require('express');
const router = express.Router();
const { query } = require('../../../config/database');
const { authenticate } = require('../../../middleware/auth.middleware');
const crypto = require('crypto');

// GET all leads for user
router.get('/leads', authenticate, async (req, res, next) => {
    try {
        // crm_leads records ownership in assigned_to; there is no owner_id.
        const leadsData = await query('SELECT * FROM crm_leads WHERE assigned_to = $1 ORDER BY created_at DESC', [req.user.id]);
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
        // assigned_to, not owner_id; first_name, not customer_name.
        await query('INSERT INTO crm_leads (id, assigned_to, first_name, phone, status) VALUES ($1, $2, $3, $4, $5)', [id, req.user.id, customer_name, phone, 'new']);
        res.status(201).json({ success: true, id });
    } catch (err) {
        next(err);
    }
});

/**
 * Move a lead through the pipeline.
 *
 * The field agent's Sales Pipeline screen had a tick button beside every lead
 * that did nothing — there was no endpoint to call. An agent marking a lead
 * contacted after a site visit lost the record of it.
 *
 * The status vocabulary is the one crm_leads already uses everywhere else.
 */
const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'converted', 'lost'];

router.put('/leads/:leadId/status', authenticate, async (req, res, next) => {
    try {
        const status = String(req.body?.status || '').toLowerCase();
        if (!LEAD_STATUSES.includes(status)) {
            return res.status(400).json({ error: `status must be one of: ${LEAD_STATUSES.join(', ')}` });
        }

        // Scoped to the agent the lead is assigned to, so one agent cannot
        // rewrite another's pipeline.
        const result = await query(
            'UPDATE crm_leads SET status = $1 WHERE id = $2 AND assigned_to = $3',
            [status, req.params.leadId, req.user.id]
        );

        const changed = result?.rowCount ?? result?.changes ?? 0;
        if (!changed) return res.status(404).json({ error: 'Lead not found for this account.' });

        res.json({ success: true, status });
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
