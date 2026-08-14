const express = require('express');
const router = express.Router();
const { query, queryOne, queryMany, withTransaction } = require('../../../config/database');
const { authenticate } = require('../../../middleware/auth.middleware');
const crypto = require('crypto');

// Middleware to enforce territory bounds
const enforceTerritoryBounds = async (req, res, next) => {
    try {
        if (req.user.role === 'FRANCHISE_OWNER') {
            const franchise = await queryOne('SELECT territory_pincode FROM franchise_partners WHERE user_id = $1 LIMIT 1', [req.user.id]);
            if (!franchise) return res.status(403).json({ error: 'Franchise not found' });
            req.franchise_pincode = franchise.territory_pincode;
        }
        next();
    } catch (err) {
        next(err);
    }
};

// GET Franchise Dashboard Data
router.get('/dashboard', authenticate, enforceTerritoryBounds, async (req, res, next) => {
    try {
        let franchiseQuery = 'SELECT * FROM franchise_partners WHERE user_id = $1 LIMIT 1';
        let franchiseParams = [req.user.id];
        
        // If a superadmin is querying a specific franchise dashboard
        if (req.user.role !== 'FRANCHISE_OWNER' && req.query.franchiseId) {
            franchiseQuery = 'SELECT * FROM franchise_partners WHERE id = $1 LIMIT 1';
            franchiseParams = [req.query.franchiseId];
        }

        const franchise = await queryOne(franchiseQuery, franchiseParams);
        if (!franchise) return res.status(404).json({ error: 'No franchise found for this user.' });

        // Get Earnings (Only completed or pending payouts)
        const earningsData = await query('SELECT * FROM franchise_payouts WHERE franchise_partner_id = $1 ORDER BY created_at DESC', [franchise.id]);
        const earnings = earningsData.rows || earningsData;

        const totalRevenue = earnings.reduce((acc, curr) => acc + (parseFloat(curr.commission_earned) || 0), 0);

        // Active Shops in Territory Fencing
        const shopsData = await query('SELECT COUNT(*) as count FROM local_shops WHERE pincode = $1', [franchise.territory_pincode]);
        const activeShops = shopsData.rows ? parseInt(shopsData.rows[0].count) : parseInt(shopsData[0]?.count || 0);

        // Wallet Balance
        const walletData = await queryOne('SELECT COALESCE(SUM(amount), 0) as balance FROM wallet_transactions WHERE wallet_id = (SELECT id FROM wallets WHERE franchise_id = $1 LIMIT 1)', [franchise.id]);
        const walletBalance = walletData ? parseFloat(walletData.balance) : 0;

        res.json({
            franchise,
            totalRevenue,
            activeShops,
            earnings,
            walletBalance
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
        await query('INSERT INTO franchise_partners (id, user_id, region_id, territory_name, territory_pincode, status) VALUES ($1, $2, $3, $4, $5, $6)',
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
        // Enforce Admin only
        if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        const { status } = req.body;
        if (!status) return res.status(400).json({ error: 'status is required' });
        
        await queryOne('UPDATE franchise_partners SET status = $1 WHERE id = $2', [status, req.params.id]);
        res.json({ success: true, message: 'Status updated' });
    } catch (err) {
        next(err);
    }
});

// POST /payouts/claim - Automated Payout Engine
router.post('/payouts/claim', authenticate, async (req, res, next) => {
    try {
        const franchise = await queryOne('SELECT id FROM franchise_partners WHERE user_id = $1 LIMIT 1', [req.user.id]);
        if (!franchise) return res.status(404).json({ error: 'Franchise not found' });

        const amountToClaim = parseFloat(req.body.amount || 0);
        if (amountToClaim <= 0) return res.status(400).json({ error: 'Invalid amount' });

        await withTransaction(async (dbClient) => {
            const walletData = await dbClient.query('SELECT id, COALESCE(SUM(amount), 0) as balance FROM wallet_transactions WHERE wallet_id = (SELECT id FROM wallets WHERE franchise_id = $1 LIMIT 1)', [franchise.id]);
            const walletBalance = (walletData.rows || walletData)[0]?.balance || 0;
            const walletId = (walletData.rows || walletData)[0]?.id;
            
            if (walletBalance < amountToClaim) {
                throw new Error('Insufficient balance');
            }

            // Append-only withdrawal debit
            await dbClient.query('INSERT INTO wallet_transactions (id, wallet_id, amount, transaction_type, purpose, status) VALUES ($1, $2, $3, $4, $5, $6)',
                [crypto.randomUUID(), walletId, -amountToClaim, 'debit', 'withdrawal', 'pending']
            );
            
            // Record payout request
            await dbClient.query('INSERT INTO franchise_payouts (id, franchise_partner_id, commission_earned, status) VALUES ($1, $2, $3, $4)',
                [crypto.randomUUID(), franchise.id, amountToClaim, 'payout_requested']
            );
        });

        res.json({ success: true, message: 'Payout claim requested successfully' });
    } catch (err) {
        res.status(400).json({ error: err.message || 'Failed to claim payout' });
    }
});

// ─── LEADS ───────────────────────────────────────────────────────────────────
// The admin Leads CRM tab has always called GET /franchise/leads; it was never
// implemented, so the tab fell back to hardcoded sample rows. Leads live in
// crm_leads, so this reads that table rather than introducing a parallel one.
router.get('/leads', authenticate, async (req, res, next) => {
  try {
    const { status, limit } = req.query;

    const clauses = [];
    const params = [];
    if (status) {
      params.push(status);
      clauses.push(`status = $${params.length}`);
    }

    params.push(Math.min(parseInt(limit, 10) || 100, 500));

    const leads = await queryMany(
      `SELECT id, first_name, last_name, email, phone, lead_source,
              lead_score, status, assigned_to, notes, created_at
         FROM crm_leads
        ${clauses.length ? 'WHERE ' + clauses.join(' AND ') : ''}
        ORDER BY created_at DESC
        LIMIT $${params.length}`,
      params
    );

    // The tab renders business_name and category, so expose those names
    // alongside the stored columns rather than making the client remap.
    const data = leads.map((l) => ({
      ...l,
      business_name: [l.first_name, l.last_name].filter(Boolean).join(' ') || l.email || 'Unknown',
      category: l.lead_source || 'Uncategorised',
    }));

    res.json({ success: true, leads: data, data });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
