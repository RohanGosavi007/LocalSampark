const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../config/database');
const { authenticate } = require('../middleware/auth.middleware');
const crypto = require('crypto');

// GET Franchise Dashboard Data
router.get('/dashboard', authenticate, async (req, res, next) => {
    try {
        const franchise = await queryOne('SELECT * FROM franchise_partners WHERE user_id = $1 LIMIT 1', [req.user.id]);
        if (!franchise) return res.status(404).json({ error: 'No franchise found for this user.' });

        // Get Earnings
        const earningsData = await query('SELECT * FROM franchise_payouts WHERE franchise_partner_id = $1', [franchise.id]);
        const earnings = earningsData.rows || earningsData;

        const totalRevenue = earnings.reduce((acc, curr) => acc + (parseFloat(curr.commission_earned) || 0), 0);

        // Map region
        const regionData = await queryOne('SELECT id FROM regions WHERE pincode = $1 LIMIT 1', [franchise.territory_pincode]);
        const regionId = regionData ? regionData.id : null;

        const shopsData = await query('SELECT COUNT(*) as count FROM local_shops WHERE region_id = $1', [regionId]);
        const activeShops = shopsData.rows ? parseInt(shopsData.rows[0].count) : parseInt(shopsData[0]?.count || 0);

        res.json({
            franchise,
            totalRevenue,
            activeShops,
            earnings
        });
    } catch (err) {
        next(err);
    }
});

// POST Register Franchise
router.post('/register', authenticate, async (req, res, next) => {
    try {
        const { region_pincode } = req.body;
        
        // Prevent multiple franchise registrations for one user
        const existing = await queryOne('SELECT id FROM franchise_partners WHERE user_id = $1', [req.user.id]);
        if (existing) return res.status(400).json({ error: 'User already has a registered franchise.' });

        // Link region
        const region = await queryOne('SELECT id, name FROM regions WHERE pincode = $1 LIMIT 1', [region_pincode]);
        const territory_name = region ? region.name : `Region ${region_pincode}`;
        const region_id = region ? region.id : null;

        const id = crypto.randomUUID();
        await query(
          'INSERT INTO franchise_partners (id, user_id, region_id, territory_name, territory_pincode, status) VALUES ($1, $2, $3, $4, $5, $6)',
          [id, req.user.id, region_id, territory_name, region_pincode, 'pending']
        );
        res.status(201).json({ success: true, id, message: 'Franchise registered successfully' });
    } catch (err) {
        next(err);
    }
});

// GET /all - List all franchise partners (admin-only)
router.get('/all', authenticate, async (req, res, next) => {
    try {
        const franchises = await query(`
            SELECT fp.*, u.full_name as partner_name, u.phone_number as partner_phone, u.email as partner_email
            FROM franchise_partners fp
            LEFT JOIN users u ON fp.user_id = u.id
        `);
        res.json({ success: true, data: franchises.rows || franchises });
    } catch (err) {
        next(err);
    }
});

// PUT /:id/status - Update franchise status
router.put('/:id/status', authenticate, async (req, res, next) => {
    try {
        const { status } = req.body;
        if (!status) return res.status(400).json({ error: 'status is required' });
        
        await queryOne('UPDATE franchise_partners SET status = $1 WHERE id = $2', [status, req.params.id]);
        res.json({ success: true, message: 'Status updated' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
