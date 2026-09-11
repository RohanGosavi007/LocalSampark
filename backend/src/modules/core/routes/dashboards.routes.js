const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../../../config/database');
const { authenticate } = require('../../../middleware/auth.middleware');
const crypto = require('crypto');

/**
 * Role dashboards for the mobile app.
 *
 * Five screens — CRM, service provider, society, franchise and field agent —
 * each fetch a dashboard endpoint that did not exist. Every one of them falls
 * back to a hard-coded mock object when the call fails, so they looked
 * populated in review while showing nobody's real data. That fallback is why
 * these went unnoticed.
 *
 * Mounted individually in routes/index.js under the prefixes the client
 * already uses (/crm, /services, /society, /territory) rather than as one
 * /dashboards prefix, so no mobile change is needed.
 */

// SQLite has no date_trunc and Postgres has no strftime. Both understand
// substr() over an ISO-8601 string, which is what created_at holds in either
// engine, so grouping by month/day is done that way to keep one query.
const MONTH_KEY = "substr(CAST(created_at AS TEXT), 1, 7)";
const DAY_KEY = "substr(CAST(created_at AS TEXT), 1, 10)";

const asNumber = (v) => Number(v) || 0;
const rowsOf = (result) => result.rows || result || [];
const firstOf = (result) => rowsOf(result)[0] || {};

// ─── CRM (B2B pipeline) ─────────────────────────────────────────────────────

router.get('/crm/dashboard', authenticate, async (req, res, next) => {
    try {
        const totals = firstOf(await query(
            `SELECT COUNT(*) AS total_leads,
                    SUM(CASE WHEN status = 'converted' THEN 1 ELSE 0 END) AS converted
               FROM crm_leads`
        ));

        const recent = rowsOf(await query(
            `SELECT id,
                    COALESCE(first_name, '') || ' ' || COALESCE(last_name, '') AS name,
                    COALESCE(phone, email, '—') AS contact,
                    UPPER(COALESCE(status, 'new')) AS status,
                    COALESCE(lead_score, 0) AS amount,
                    created_at AS updated
               FROM crm_leads
              ORDER BY created_at DESC
              LIMIT 10`
        ));

        const totalLeads = asNumber(totals.total_leads);
        const converted = asNumber(totals.converted);

        res.json({
            success: true,
            dashboard: {
                total_leads: totalLeads,
                converted,
                // lead_score stands in for deal value; crm_leads carries no
                // monetary column, so this is a pipeline weight, not rupees.
                pipeline_value: rowsOf(await query('SELECT COALESCE(SUM(lead_score), 0) AS v FROM crm_leads'))[0]?.v || 0,
                win_rate: totalLeads ? `${Math.round((converted / totalLeads) * 100)}%` : '0%',
                recent_leads: recent,
            },
        });
    } catch (err) {
        next(err);
    }
});

// ─── Service provider ───────────────────────────────────────────────────────

router.get('/services/dashboard', authenticate, async (req, res, next) => {
    try {
        // home_service_bookings is the provider-facing booking table
        // (skilled_bookings covers the separate skilled-worker flow and has
        // no amount column, so earnings cannot come from it).
        const bookings = firstOf(await query(
            `SELECT COUNT(*) AS total,
                    SUM(CASE WHEN ${DAY_KEY} = $2 THEN 1 ELSE 0 END) AS today,
                    SUM(CASE WHEN status = 'completed' AND ${DAY_KEY} = $2 THEN 1 ELSE 0 END) AS completed_today,
                    SUM(CASE WHEN status IN ('pending', 'confirmed') THEN 1 ELSE 0 END) AS upcoming,
                    COALESCE(SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END), 0) AS earnings
               FROM home_service_bookings
              WHERE provider_id = $1`,
            [req.user.id, new Date().toISOString().slice(0, 10)]
        ));

        const trend = rowsOf(await query(
            `SELECT ${DAY_KEY} AS day, COUNT(*) AS value
               FROM home_service_bookings
              WHERE provider_id = $1
              GROUP BY ${DAY_KEY}
              ORDER BY day DESC
              LIMIT 7`,
            [req.user.id]
        ));

        res.json({
            success: true,
            stats: {
                todayBookings: asNumber(bookings.today),
                completedToday: asNumber(bookings.completed_today),
                upcomingBookings: asNumber(bookings.upcoming),
                activeServices: asNumber(bookings.total),
                totalEarnings: asNumber(bookings.earnings),
                avgRating: 0,
            },
            trend: trend.reverse(),
        });
    } catch (err) {
        next(err);
    }
});

// ─── Society ────────────────────────────────────────────────────────────────

router.get('/society/dashboard', authenticate, async (req, res, next) => {
    try {
        // The caller's society comes from their membership row; a user with no
        // membership gets an explicit 404 rather than another app's data.
        const membership = await queryOne(
            'SELECT society_id FROM society_members WHERE user_id = $1 AND COALESCE(is_active, 1) = 1',
            [req.user.id]
        );
        if (!membership) {
            return res.status(404).json({ success: false, error: 'You are not a member of any society' });
        }

        const societyId = membership.society_id;
        const society = await queryOne('SELECT id, name FROM societies WHERE id = $1', [societyId]);

        const counts = firstOf(await query(
            `SELECT (SELECT COUNT(*) FROM society_members WHERE society_id = $1 AND COALESCE(is_active, 1) = 1) AS active_residents,
                    (SELECT COUNT(DISTINCT flat_number) FROM society_members WHERE society_id = $1) AS total_flats,
                    (SELECT COUNT(*) FROM society_complaints WHERE society_id = $1 AND status NOT IN ('resolved', 'closed')) AS pending_complaints,
                    (SELECT COUNT(*) FROM society_visitors WHERE society_id = $1 AND ${DAY_KEY} = $2) AS visitors_today`,
            [societyId, new Date().toISOString().slice(0, 10)]
        ));

        const notices = rowsOf(await query(
            `SELECT id, title, created_at AS date,
                    CASE WHEN COALESCE(is_urgent, 0) = 1 THEN 'HIGH' ELSE 'NORMAL' END AS urgency
               FROM society_notices
              WHERE society_id = $1 AND COALESCE(is_active, 1) = 1
              ORDER BY created_at DESC
              LIMIT 5`,
            [societyId]
        ));

        res.json({
            success: true,
            dashboard: {
                name: society?.name || 'Your Society',
                total_flats: asNumber(counts.total_flats),
                active_residents: asNumber(counts.active_residents),
                pending_complaints: asNumber(counts.pending_complaints),
                visitors_today: asNumber(counts.visitors_today),
                notices,
            },
        });
    } catch (err) {
        next(err);
    }
});

router.post('/society/register', authenticate, async (req, res, next) => {
    try {
        const { name, address, regionId, flatNumber } = req.body;

        if (!name || !String(name).trim()) {
            return res.status(400).json({ success: false, error: 'name is required' });
        }

        const societyId = crypto.randomUUID();
        await query(
            `INSERT INTO societies (id, region_id, name, address, is_active)
             VALUES ($1, $2, $3, $4, 1)`,
            [societyId, regionId || req.user.region_id || null, name, address || '']
        );

        // The registrant becomes the society's first admin member, otherwise
        // nobody can administer the society that was just created.
        await query(
            `INSERT INTO society_members (id, society_id, user_id, flat_number, role, is_active)
             VALUES ($1, $2, $3, $4, 'society_admin', 1)`,
            [crypto.randomUUID(), societyId, req.user.id, flatNumber || null]
        );

        res.status(201).json({
            success: true,
            data: { societyId },
            message: 'Society registered. You are its first administrator.',
        });
    } catch (err) {
        next(err);
    }
});

// ─── Franchise / territory ──────────────────────────────────────────────────

router.get('/territory/dashboard', authenticate, async (req, res, next) => {
    try {
        const assignment = await queryOne(
            'SELECT territory_id FROM admin_territory_assignments WHERE user_id = $1 AND COALESCE(is_active, 1) = 1',
            [req.user.id]
        );
        const territoryId = assignment?.territory_id || req.user.region_id || null;

        const shops = firstOf(await query(
            `SELECT COUNT(*) AS total_shops,
                    SUM(CASE WHEN approval_status = 'pending' THEN 1 ELSE 0 END) AS pending_approvals
               FROM local_shops
              WHERE ($1 IS NULL OR region_id = $1)`,
            [territoryId]
        ));

        const orders = firstOf(await query(
            `SELECT COUNT(*) AS total_orders,
                    COALESCE(SUM(o.total_amount), 0) AS revenue
               FROM orders o
               JOIN local_shops s ON s.id = o.shop_id
              WHERE ($1 IS NULL OR s.region_id = $1)`,
            [territoryId]
        ));

        const monthly = rowsOf(await query(
            `SELECT ${MONTH_KEY.replace(/created_at/g, 'o.created_at')} AS month,
                    COALESCE(SUM(o.total_amount), 0) AS value
               FROM orders o
               JOIN local_shops s ON s.id = o.shop_id
              WHERE ($1 IS NULL OR s.region_id = $1)
              GROUP BY month
              ORDER BY month DESC
              LIMIT 6`,
            [territoryId]
        ));

        const revenue = asNumber(orders.revenue);

        res.json({
            success: true,
            stats: {
                totalShops: asNumber(shops.total_shops),
                pendingApprovals: asNumber(shops.pending_approvals),
                totalOrders: asNumber(orders.total_orders),
                monthlyRevenue: revenue,
                // Franchise commission is configured per region; 10% is the
                // platform default used until a region overrides it.
                commissionEarned: Math.round(revenue * 0.10),
                activeAgents: asNumber(firstOf(await query(
                    `SELECT COUNT(*) AS c FROM admin_territory_assignments
                      WHERE COALESCE(is_active, 1) = 1 AND ($1 IS NULL OR territory_id = $1)`,
                    [territoryId]
                )).c),
            },
            trend: monthly.reverse(),
        });
    } catch (err) {
        next(err);
    }
});

router.get('/territory/field-dashboard', authenticate, async (req, res, next) => {
    try {
        const onboarded = rowsOf(await query(
            `SELECT id, name AS "shopName", COALESCE(phone, '—') AS owner,
                    approval_status AS status, created_at AS date
               FROM local_shops
              WHERE owner_id = $1 OR registration_metadata LIKE $2
              ORDER BY created_at DESC
              LIMIT 20`,
            [req.user.id, `%${req.user.id}%`]
        ));

        const leads = firstOf(await query(
            `SELECT COUNT(*) AS pending
               FROM crm_leads
              WHERE assigned_to = $1 AND status NOT IN ('converted', 'lost')`,
            [req.user.id]
        ));

        const approved = onboarded.filter((s) => s.status === 'approved').length;

        res.json({
            success: true,
            stats: {
                shopsOnboarded: onboarded.length,
                pendingLeads: asNumber(leads.pending),
                conversionRate: onboarded.length
                    ? `${Math.round((approved / onboarded.length) * 100)}%`
                    : '0%',
                // Field-agent payouts are settled through the commissions
                // module; surfaced as 0 here rather than inventing a figure.
                earnings: 0,
                monthlyTarget: 0,
            },
            recent: onboarded,
        });
    } catch (err) {
        next(err);
    }
});

/**
 * The franchise partner's team roster.
 *
 * The mobile "My Team (Agents)" screen listed three invented people — Ramesh
 * Singh with 42 shops and ₹14,500 earned, Suresh Patil with 12 shops, Kiran
 * Kumar with 156 deliveries — against no endpoint at all. This returns the
 * users actually assigned to the territory.
 *
 * Per-agent earnings are deliberately absent: field-agent payouts are settled
 * through the commissions module and there is no per-agent ledger to read, so
 * the client shows a dash rather than a number nobody owes.
 */
router.get('/territory/agents', authenticate, async (req, res, next) => {
    try {
        const assignment = await queryOne(
            'SELECT territory_id FROM admin_territory_assignments WHERE user_id = $1 AND COALESCE(is_active, 1) = 1',
            [req.user.id]
        );
        const territoryId = assignment?.territory_id || req.user.region_id || null;

        const agents = rowsOf(await query(
            `SELECT u.id, u.full_name, u.phone_number, u.role, u.is_active, a.created_at AS assigned_at
               FROM admin_territory_assignments a
               JOIN users u ON u.id = a.user_id
              WHERE COALESCE(a.is_active, 1) = 1
                AND ($1 IS NULL OR a.territory_id = $1)
                AND u.id <> $2
              ORDER BY u.full_name ASC
              LIMIT 100`,
            [territoryId, req.user.id]
        ));

        // Counted per agent rather than in one grouped query: a shop records the
        // agent who registered it inside registration_metadata, which is free
        // text, so there is no column to GROUP BY.
        const enriched = [];
        for (const agent of agents) {
            const shops = firstOf(await query(
                `SELECT COUNT(*) AS c FROM local_shops
                  WHERE owner_id = $1 OR registration_metadata LIKE $2`,
                [agent.id, `%${agent.id}%`]
            ));
            const deliveries = firstOf(await query(
                `SELECT COUNT(*) AS c FROM orders
                  WHERE assigned_agent_id = $1 AND LOWER(order_status) = 'delivered'`,
                [agent.id]
            ));

            enriched.push({
                id: String(agent.id),
                name: agent.full_name,
                phone: agent.phone_number,
                role: agent.role,
                active: agent.is_active == null ? true : Boolean(Number(agent.is_active)),
                shopsOnboarded: asNumber(shops.c),
                deliveries: asNumber(deliveries.c),
                assignedAt: agent.assigned_at,
            });
        }

        res.json({ success: true, agents: enriched });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
