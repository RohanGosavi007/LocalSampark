const express = require('express');
const router = express.Router();
const { query, queryOne, queryMany, withTransaction } = require('../../../config/database');
const { authenticate, requireAdmin } = require('../../../middleware/auth.middleware');
const {
    attachFranchiseScope,
    requireFranchise,
    scopeClause,
} = require('../../../middleware/franchiseScope.middleware');
const territoryService = require('../../../services/territoryResolution.service');
const pincodeUtil = require('../../../utils/pincode');
const crypto = require('crypto');

/**
 * Roles are stored lower case ('super_admin', 'admin'); every comparison in this
 * file was written against upper case, so none of them ever matched. That made
 * enforceTerritoryBounds a no-op and, more seriously, made the ?franchiseId
 * override on /dashboard available to every authenticated user rather than to
 * admins — any signed-in customer could read any partner's earnings by guessing
 * an id.
 */
const isAdmin = (req) =>
    ['super_admin', 'admin', 'territory_admin'].includes(String(req.user?.role || '').toLowerCase()) ||
    ['SUPER_ADMIN', 'ADMIN', 'TERRITORY_ADMIN'].includes(String(req.adminRole?.role || ''));

// Middleware to enforce territory bounds
const enforceTerritoryBounds = async (req, res, next) => {
    try {
        if (String(req.user.role || '').toLowerCase() === 'franchise_owner') {
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
        
        // If an admin is querying a specific franchise dashboard. This branch
        // used to be reachable by any authenticated caller.
        if (req.query.franchiseId) {
            if (!isAdmin(req)) {
                return res.status(403).json({ error: 'Only an administrator can view another partner\'s dashboard.' });
            }
            franchiseQuery = 'SELECT * FROM franchise_partners WHERE id = $1 LIMIT 1';
            franchiseParams = [req.query.franchiseId];
        }

        const franchise = await queryOne(franchiseQuery, franchiseParams);
        if (!franchise) return res.status(404).json({ error: 'No franchise found for this user.' });

        // Get Earnings (Only completed or pending payouts)
        const earningsData = await query('SELECT * FROM franchise_payouts WHERE franchise_partner_id = $1 ORDER BY created_at DESC', [franchise.id]);
        const earnings = earningsData.rows || earningsData;

        const totalRevenue = earnings.reduce((acc, curr) => acc + (parseFloat(curr.commission_earned) || 0), 0);

        // Active shops across every pincode this partner holds.
        //
        // This counted `pincode = franchise.territory_pincode` — the single
        // registration pincode on franchise_partners. Since migration 101 a
        // partner can hold many territories, so a partner with six pincodes saw
        // the shop count for one of them and read it as their whole business.
        // franchise_territories is the assignment of record; territory_pincode
        // is only where they originally applied.
        const territoryPincodes = await territoryService.pincodesForFranchise(franchise.id);
        const countedPincodes = territoryPincodes.length
            ? territoryPincodes
            : [pincodeUtil.normalize(franchise.territory_pincode)].filter(Boolean);

        let activeShops = 0;
        if (countedPincodes.length) {
            const placeholders = countedPincodes.map((_, i) => `$${i + 1}`).join(', ');
            const shopsData = await query(
                `SELECT COUNT(*) as count FROM local_shops WHERE pincode IN (${placeholders})`,
                countedPincodes
            );
            const shopRow = (shopsData.rows || shopsData)[0] || {};
            activeShops = parseInt(shopRow.count, 10) || 0;
        }

        // Wallet balance.
        //
        // These queries looked up the wallet by `wallets.franchise_id`, a column
        // that has never existed — wallets are keyed by user_id. Every call to
        // this endpoint therefore raised "no such column" and returned a 500, so
        // the franchise dashboard did not load at all for any partner.
        const walletData = await queryOne(
            `SELECT COALESCE(SUM(amount), 0) as balance
               FROM wallet_transactions
              WHERE wallet_id = (SELECT id FROM wallets WHERE user_id = $1 LIMIT 1)`,
            [franchise.user_id]
        );
        const walletBalance = walletData ? parseFloat(walletData.balance) || 0 : 0;

        res.json({
            franchise,
            totalRevenue,
            activeShops,
            earnings,
            walletBalance,
            // The pincodes the counts above were actually taken over, so the
            // dashboard can show what it is summarising rather than leaving the
            // partner to assume it covers everything they hold.
            territoryPincodes: countedPincodes,
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
router.get('/all', authenticate, requireAdmin, async (req, res, next) => {
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
        // Was compared against upper-case role names that are never stored, so
        // this rejected every caller including real administrators.
        if (!isAdmin(req)) return res.status(403).json({ error: 'Unauthorized' });

        const { status } = req.body;
        if (!status) return res.status(400).json({ error: 'status is required' });

        await query('UPDATE franchise_partners SET status = $1 WHERE id = $2', [status, req.params.id]);
        res.json({ success: true, message: 'Status updated' });
    } catch (err) {
        next(err);
    }
});

/**
 * Set a partner's revenue split.
 *
 * The admin app had an "Edit Revenue Split" dialog that called nothing: it
 * changed a number in React state and then told the operator "Franchise revenue
 * split updated successfully." Reopening the screen showed the old rate, and
 * the partner was still paid at it — the operator had been told a commission
 * change had been applied to money when it had not.
 */
router.put('/:id/commission', authenticate, async (req, res, next) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ error: 'Unauthorized' });

        const rate = Number(req.body?.commissionRate);
        if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
            return res.status(400).json({ error: 'commissionRate must be a number between 0 and 100.' });
        }

        const existing = await queryOne('SELECT id FROM franchise_partners WHERE id = $1', [req.params.id]);
        if (!existing) return res.status(404).json({ error: 'Franchise partner not found.' });

        await query('UPDATE franchise_partners SET commission_rate = $1 WHERE id = $2', [rate, req.params.id]);
        res.json({ success: true, commissionRate: rate });
    } catch (err) {
        next(err);
    }
});

// POST /payouts/claim - Automated Payout Engine
router.post('/payouts/claim', authenticate, async (req, res, next) => {
    try {
        const franchise = await queryOne('SELECT id, user_id FROM franchise_partners WHERE user_id = $1 LIMIT 1', [req.user.id]);
        if (!franchise) return res.status(404).json({ error: 'Franchise not found' });

        const amountToClaim = parseFloat(req.body.amount || 0);
        if (amountToClaim <= 0) return res.status(400).json({ error: 'Invalid amount' });

        await withTransaction(async (dbClient) => {
            // Same wallets.franchise_id defect as the dashboard above: this
            // threw before it could check the balance, so a payout claim always
            // failed with "Insufficient balance" regardless of what was owed.
            const walletData = await dbClient.query(
                `SELECT id, COALESCE(SUM(amount), 0) as balance
                   FROM wallet_transactions
                  WHERE wallet_id = (SELECT id FROM wallets WHERE user_id = $1 LIMIT 1)`,
                [franchise.user_id]
            );
            const walletBalance = (walletData.rows || walletData)[0]?.balance || 0;
            const walletId = (walletData.rows || walletData)[0]?.id;
            
            if (walletBalance < amountToClaim) {
                throw new Error('Insufficient balance');
            }

            // Append-only withdrawal debit
            await dbClient.query('INSERT INTO wallet_transactions (id, wallet_id, amount, type, purpose, status) VALUES ($1, $2, $3, $4, $5, $6)',
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
router.get('/leads', authenticate, attachFranchiseScope, requireFranchise, async (req, res, next) => {
  try {
    const { status, limit } = req.query;

    const clauses = [];
    const params = [];
    if (status) {
      params.push(status);
      clauses.push(`status = $${params.length}`);
    }

    // Territory scoping.
    //
    // This endpoint had no location filter of any kind, so every authenticated
    // franchise partner received every lead on the platform — names, phone
    // numbers and email addresses for areas they do not serve. That is the
    // exact cross-franchise leak the scoping middleware exists to close.
    //
    // An administrator gets `1 = 1` and sees everything, as before. A partner
    // gets their own pincodes, and a partner with none gets `1 = 0` rather
    // than an unfiltered query.
    const scope = scopeClause(req, 'pincode', params.length);
    params.push(...scope.params);
    clauses.push(scope.sql);

    params.push(Math.min(parseInt(limit, 10) || 100, 500));

    const leads = await queryMany(
      `SELECT id, first_name, last_name, email, phone, lead_source,
              lead_score, status, assigned_to, notes, created_at,
              pincode, territory_id, franchise_partner_id
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
