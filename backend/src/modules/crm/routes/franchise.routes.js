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
                // The wallet's own id (the debit below is written against it) and
                // the sum of its transactions. This selected wallet_transactions.id
                // beside an aggregate, which PostgreSQL rejects outright.
                `SELECT w.id, COALESCE((SELECT SUM(t.amount) FROM wallet_transactions t WHERE t.wallet_id = w.id), 0) AS balance
                   FROM wallets w
                  WHERE w.user_id = $1
                  LIMIT 1`,
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

// ─── FRANCHISE DASHBOARD DATA (users, zones, reports, marketing, settings) ───
//
// /franchise-dashboard/{users,zones,reports,marketing,settings} were static
// "No Data Available" pages because none of these existed. Every read below is
// limited to the caller's territory pincodes through scopeClause(); an
// administrator (unscoped) sees the whole platform, a partner with no
// territories is refused by requireFranchise.

const scoped = [authenticate, attachFranchiseScope, requireFranchise];

/** "+919876543210" -> "+91******3210": a partner sees who their customers are, not how to reach them. */
const maskPhone = (p) => {
    const s = String(p || '');
    return s.length > 4 ? `${s.slice(0, Math.min(3, s.length - 4))}${'*'.repeat(Math.max(s.length - 7, 0))}${s.slice(-4)}` : s ? '****' : null;
};

const DELIVERED = "LOWER(COALESCE(o.order_status, o.status, '')) IN ('delivered', 'completed')";

// GET /franchise/territory-customers — customers who have ordered from shops in the territory.
router.get('/territory-customers', ...scoped, async (req, res, next) => {
    try {
        const params = [];
        const scope = scopeClause(req, 's.pincode', 0);
        params.push(...scope.params);
        const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 60) : '';
        let searchSql = '';
        if (search) {
            params.push(`%${search.toLowerCase().replace(/[%_\\]/g, (c) => `\\${c}`)}%`);
            searchSql = ` AND LOWER(COALESCE(u.full_name, '')) LIKE $${params.length} ESCAPE '\\'`;
        }
        params.push(Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 200));

        const rows = await queryMany(
            `SELECT u.id, u.full_name, u.phone_number,
                    COUNT(o.id) AS orders,
                    COALESCE(SUM(CASE WHEN ${DELIVERED} THEN o.total_amount ELSE 0 END), 0) AS delivered_value,
                    MAX(o.created_at) AS last_order_at
               FROM orders o
               JOIN local_shops s ON s.id = o.shop_id
               JOIN users u ON u.id = o.user_id
              WHERE ${scope.sql}${searchSql}
              GROUP BY u.id, u.full_name, u.phone_number
              ORDER BY MAX(o.created_at) DESC
              LIMIT $${params.length}`,
            params
        );

        res.json({
            success: true,
            customers: rows.map((r) => ({
                id: r.id,
                name: r.full_name || 'Customer',
                phone: maskPhone(r.phone_number),
                orders: Number(r.orders) || 0,
                deliveredValue: Number(r.delivered_value) || 0,
                lastOrderAt: r.last_order_at,
            })),
        });
    } catch (err) {
        next(err);
    }
});

// GET /franchise/shops — shops registered in the partner's pincodes.
router.get('/shops', ...scoped, async (req, res, next) => {
    try {
        const scope = scopeClause(req, 'pincode', 0);
        const params = [...scope.params];
        let searchSql = '';
        const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 60) : '';
        if (search) {
            params.push(`%${search.toLowerCase().replace(/[%_\\]/g, (c) => `\\${c}`)}%`);
            searchSql = ` AND LOWER(COALESCE(name, '')) LIKE $${params.length} ESCAPE '\\'`;
        }
        params.push(Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 200));
        const rows = await queryMany(
            `SELECT id, name, category, address, pincode, approval_status, is_active, created_at
               FROM local_shops
              WHERE ${scope.sql}${searchSql}
              ORDER BY created_at DESC
              LIMIT $${params.length}`,
            params
        );
        res.json({
            success: true,
            shops: rows.map((r) => ({
                id: r.id,
                name: r.name,
                category: r.category,
                address: r.address,
                pincode: r.pincode,
                approvalStatus: r.approval_status || 'pending',
                active: r.is_active === true || r.is_active === 1 || r.is_active === '1',
                createdAt: r.created_at,
            })),
        });
    } catch (err) {
        next(err);
    }
});

// GET /franchise/zones — the territories (pincodes) this partner holds, with live counts.
router.get('/zones', ...scoped, async (req, res, next) => {
    try {
        const params = [];
        let where = "UPPER(COALESCE(ft.status, 'ACTIVE')) = 'ACTIVE'";
        if (req.franchiseScope.scoped) {
            params.push(req.franchiseScope.franchisePartnerId);
            where += ` AND ft.franchise_partner_id = $${params.length}`;
        }
        const territories = await queryMany(
            `SELECT ft.id, ft.pincode, ft.status, ft.commission_rate, ft.assigned_at, t.name AS territory_name
               FROM franchise_territories ft
               LEFT JOIN territories t ON t.id = ft.territory_id
              WHERE ${where}
              ORDER BY ft.pincode
              LIMIT 500`,
            params
        );

        const pincodes = [...new Set(territories.map((t) => t.pincode).filter(Boolean))];
        const shopCounts = {};
        const waitlistCounts = {};
        if (pincodes.length) {
            const ph = pincodes.map((_, i) => `$${i + 1}`).join(', ');
            for (const r of await queryMany(`SELECT pincode, COUNT(*) AS n FROM local_shops WHERE pincode IN (${ph}) GROUP BY pincode`, pincodes)) {
                shopCounts[r.pincode] = Number(r.n) || 0;
            }
            for (const r of await queryMany(`SELECT pincode, COUNT(*) AS n FROM feature_interest_leads WHERE pincode IN (${ph}) GROUP BY pincode`, pincodes)) {
                waitlistCounts[r.pincode] = Number(r.n) || 0;
            }
        }

        res.json({
            success: true,
            zones: territories.map((t) => ({
                id: t.id,
                pincode: t.pincode,
                name: t.territory_name || `PIN ${t.pincode}`,
                status: t.status,
                commissionRate: t.commission_rate === null || t.commission_rate === undefined ? null : Number(t.commission_rate),
                assignedAt: t.assigned_at,
                shops: shopCounts[t.pincode] || 0,
                waitlist: waitlistCounts[t.pincode] || 0,
            })),
        });
    } catch (err) {
        next(err);
    }
});

// GET /franchise/reports?months=6 — month-by-month orders, delivered value and new shops.
router.get('/reports', ...scoped, async (req, res, next) => {
    try {
        const months = Math.min(Math.max(parseInt(req.query.months, 10) || 6, 1), 12);
        const now = new Date();
        const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));
        const keyOf = (d) => {
            const dt = d instanceof Date ? d : new Date(String(d).replace(' ', 'T'));
            return Number.isNaN(dt.getTime()) ? null : `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}`;
        };
        const buckets = [];
        for (let i = 0; i < months; i += 1) {
            const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
            buckets.push({ month: keyOf(d), orders: 0, deliveredOrders: 0, deliveredValue: 0, newShops: 0 });
        }
        const byMonth = Object.fromEntries(buckets.map((b) => [b.month, b]));
        // 'YYYY-MM-DD HH:MM:SS': SQLite compares timestamps as text (see utils/sqlTime).
        const cutoff = start.toISOString().slice(0, 19).replace('T', ' ');

        // Bucketed here rather than with a date function in SQL, so the same
        // query runs on SQLite and PostgreSQL.
        const orderScope = scopeClause(req, 's.pincode', 1);
        const orders = await queryMany(
            `SELECT o.created_at, o.total_amount, ${DELIVERED} AS delivered
               FROM orders o JOIN local_shops s ON s.id = o.shop_id
              WHERE o.created_at >= $1 AND ${orderScope.sql}
              LIMIT 50000`,
            [cutoff, ...orderScope.params]
        );
        for (const o of orders) {
            const b = byMonth[keyOf(o.created_at)];
            if (!b) continue;
            b.orders += 1;
            if (o.delivered === true || o.delivered === 1 || o.delivered === '1' || o.delivered === 't') {
                b.deliveredOrders += 1;
                b.deliveredValue += Number(o.total_amount) || 0;
            }
        }

        const shopScope = scopeClause(req, 'pincode', 1);
        const shops = await queryMany(
            `SELECT created_at FROM local_shops WHERE created_at >= $1 AND ${shopScope.sql} LIMIT 50000`,
            [cutoff, ...shopScope.params]
        );
        for (const s of shops) {
            const b = byMonth[keyOf(s.created_at)];
            if (b) b.newShops += 1;
        }

        for (const b of buckets) b.deliveredValue = Math.round(b.deliveredValue * 100) / 100;
        res.json({ success: true, months: buckets });
    } catch (err) {
        next(err);
    }
});

// GET /franchise/waitlist — "notify me" sign-ups in the territory, by module.
router.get('/waitlist', ...scoped, async (req, res, next) => {
    try {
        const scope = scopeClause(req, 'pincode', 0);
        const rows = await queryMany(
            `SELECT feature_key, pincode, COUNT(*) AS n, MAX(created_at) AS latest
               FROM feature_interest_leads
              WHERE ${scope.sql}
              GROUP BY feature_key, pincode
              ORDER BY COUNT(*) DESC
              LIMIT 200`,
            scope.params
        );
        res.json({
            success: true,
            waitlist: rows.map((r) => ({ feature: r.feature_key, pincode: r.pincode, count: Number(r.n) || 0, latest: r.latest })),
        });
    } catch (err) {
        next(err);
    }
});

// GET /franchise/profile — the partner's agreement as recorded (read-only).
router.get('/profile', authenticate, async (req, res, next) => {
    try {
        const partner = await queryOne(
            `SELECT fp.id, fp.territory_name, fp.territory_pincode, fp.status, fp.commission_rate,
                    fp.agreement_signed_at, fp.created_at,
                    u.full_name, u.email, u.phone_number
               FROM franchise_partners fp
               LEFT JOIN users u ON u.id = fp.user_id
              WHERE fp.user_id = $1
              LIMIT 1`,
            [req.user.id]
        );
        if (!partner) return res.status(404).json({ success: false, error: 'No franchise found for this user.' });
        const pincodes = await territoryService.pincodesForFranchise(partner.id);
        res.json({
            success: true,
            profile: {
                id: partner.id,
                territoryName: partner.territory_name,
                registeredPincode: partner.territory_pincode,
                status: partner.status,
                commissionRate: partner.commission_rate === null ? null : Number(partner.commission_rate),
                agreementSignedAt: partner.agreement_signed_at,
                partnerSince: partner.created_at,
                contact: { name: partner.full_name, email: partner.email, phone: partner.phone_number },
                territoryPincodes: pincodes,
            },
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
