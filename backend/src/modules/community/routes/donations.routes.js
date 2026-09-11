const express = require('express');
const router = express.Router();
const { query, queryOne, withTransaction } = require('../../../config/database');
const { authenticate, requireAdmin } = require('../../../middleware/auth.middleware');
const crypto = require('crypto');

/**
 * Donations, crowdfunding ("Nidhi") and surplus-goods rescue.
 *
 * apps/mobile/app/modules/donations/index.js drives all of this. Before
 * migration 088 the only routes here were GET /campaigns and POST /donate,
 * and both queried a `donation_campaigns` table that has never existed in
 * either schema — so they threw on every call. The screen's six real
 * endpoints (/ngos, /crowdfund, /crowdfund/:id/donate, /rescue,
 * /admin/config) had no server side at all.
 *
 * Crowdfunds are stored in charity_campaigns, which already carried
 * goal_amount/raised_amount/ngo_name; migration 088 added the description and
 * campaign_type the create form submits.
 */

// Column aliases matching the field names the mobile screen renders
// (cf.goal, cf.raised, cf.type) so the client needs no mapping layer.
const CROWDFUND_SELECT = `
    SELECT id,
           title,
           description,
           ngo_name,
           goal_amount   AS goal,
           raised_amount AS raised,
           campaign_type AS type,
           status,
           verified_ngo,
           created_at
      FROM charity_campaigns`;

// ─── NGO directory ──────────────────────────────────────────────────────────

router.get('/ngos', authenticate, async (req, res, next) => {
    try {
        const { pincode } = req.query;
        const params = ['active'];
        let sql = `SELECT id, name, type, requirements, pincode, phone, address, is_verified
                     FROM ngo_partners
                    WHERE status = $1`;
        if (pincode) {
            params.push(pincode);
            sql += ` AND pincode = $2`;
        }
        sql += ' ORDER BY is_verified DESC, name ASC';

        const result = await query(sql, params);
        res.json({ success: true, data: result.rows || result || [] });
    } catch (err) {
        next(err);
    }
});

// ─── Crowdfunding ───────────────────────────────────────────────────────────

router.get('/crowdfund', authenticate, async (req, res, next) => {
    try {
        const result = await query(
            `${CROWDFUND_SELECT} WHERE status = $1 ORDER BY created_at DESC`,
            ['active']
        );
        res.json({ success: true, data: result.rows || result || [] });
    } catch (err) {
        next(err);
    }
});

router.post('/crowdfund', authenticate, async (req, res, next) => {
    try {
        const { title, description, goal, type } = req.body;

        if (!title || !String(title).trim()) {
            return res.status(400).json({ success: false, error: 'title is required' });
        }
        const goalAmount = Number(goal);
        if (!Number.isFinite(goalAmount) || goalAmount <= 0) {
            return res.status(400).json({ success: false, error: 'goal must be a positive number' });
        }

        const id = crypto.randomUUID();
        await query(
            `INSERT INTO charity_campaigns
                 (id, ngo_name, title, description, goal_amount, raised_amount,
                  campaign_type, status, verified_ngo, created_by)
             VALUES ($1, $2, $3, $4, $5, 0, $6, 'active', 0, $7)`,
            [id, req.user.name || 'Community', title, description || '',
             goalAmount, type || 'Community', req.user.id]
        );

        const created = await queryOne(`${CROWDFUND_SELECT} WHERE id = $1`, [id]);
        res.status(201).json({ success: true, data: created, message: 'Crowdfund created' });
    } catch (err) {
        next(err);
    }
});

/**
 * Move `amount` from the donor's wallet into a campaign.
 *
 * Only `client.query` is used inside the transaction: the PostgreSQL driver
 * hands withTransaction a raw pg client, which exposes query() and nothing
 * else — the queryOne/queryMany helpers exist only on the SQLite client, so
 * relying on them here would work in dev and fail in production.
 */
async function creditCampaign({ campaignId, donorId, amount }) {
    return withTransaction(async (client) => {
        const found = await client.query(
            'SELECT id, status FROM charity_campaigns WHERE id = $1',
            [campaignId]
        );
        const campaign = (found.rows || [])[0];
        if (!campaign) return { notFound: true };
        if (campaign.status !== 'active') return { closed: true };

        // Guarded debit: without `AND balance >= $1` a donation would push the
        // wallet negative, since wallets.balance carries no CHECK constraint.
        const debit = await client.query(
            'UPDATE wallets SET balance = balance - $1 WHERE user_id = $2 AND balance >= $1',
            [amount, donorId]
        );
        if (!debit.rowCount) return { insufficient: true };

        await client.query(
            `INSERT INTO wallet_transactions (id, wallet_id, amount, type, purpose, status)
             VALUES ($1, (SELECT id FROM wallets WHERE user_id = $2), $3, 'debit', 'donation', 'completed')`,
            [crypto.randomUUID(), donorId, amount]
        );

        await client.query(
            'UPDATE charity_campaigns SET raised_amount = raised_amount + $1 WHERE id = $2',
            [amount, campaignId]
        );

        return { ok: true };
    });
}

function respondToDonation(res, result, amount) {
    if (result.notFound) {
        return res.status(404).json({ success: false, error: 'Campaign not found' });
    }
    if (result.closed) {
        return res.status(409).json({ success: false, error: 'Campaign is no longer accepting donations' });
    }
    if (result.insufficient) {
        return res.status(402).json({ success: false, error: 'Insufficient wallet balance' });
    }
    return res.json({ success: true, message: `Thank you for donating ₹${amount}!` });
}

router.post('/crowdfund/:id/donate', authenticate, async (req, res, next) => {
    try {
        const amount = Number(req.body.amount);
        if (!Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({ success: false, error: 'amount must be a positive number' });
        }

        const result = await creditCampaign({
            campaignId: req.params.id,
            donorId: req.user.id,
            amount,
        });
        return respondToDonation(res, result, amount);
    } catch (err) {
        next(err);
    }
});

// ─── Surplus goods rescue ───────────────────────────────────────────────────

router.get('/rescue', authenticate, async (req, res, next) => {
    try {
        const result = await query(
            `SELECT id, item_name AS "itemName", quantity, address, type, status, created_at
               FROM donation_rescue_posts
              WHERE status = $1
              ORDER BY created_at DESC`,
            ['open']
        );
        res.json({ success: true, data: result.rows || result || [] });
    } catch (err) {
        next(err);
    }
});

router.post('/rescue', authenticate, async (req, res, next) => {
    try {
        const { itemName, quantity, address, type, pincode } = req.body;

        if (!itemName || !String(itemName).trim()) {
            return res.status(400).json({ success: false, error: 'itemName is required' });
        }

        const id = crypto.randomUUID();
        await query(
            `INSERT INTO donation_rescue_posts
                 (id, poster_id, item_name, quantity, address, type, pincode, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'open')`,
            [id, req.user.id, itemName, quantity || '', address || '',
             type || 'Food', pincode || null]
        );

        res.status(201).json({
            success: true,
            data: { id },
            message: 'Broadcast sent to nearby collectors',
        });
    } catch (err) {
        next(err);
    }
});

// ─── Admin configuration ────────────────────────────────────────────────────
//
// Stored in admin_config as two keys rather than a bespoke table, matching how
// the rest of the platform holds tunable settings.

const DONATION_CONFIG_KEYS = {
    subsidized: 'donations.delivery_subsidized',
    bonus: 'donations.surprise_bonus_amount',
};

async function readDonationConfig() {
    const result = await query(
        'SELECT config_key, config_value FROM admin_config WHERE config_key IN ($1, $2)',
        [DONATION_CONFIG_KEYS.subsidized, DONATION_CONFIG_KEYS.bonus]
    );
    const rows = result.rows || result || [];
    const byKey = Object.fromEntries(rows.map((r) => [r.config_key, r.config_value]));
    return {
        deliverySubsidized: byKey[DONATION_CONFIG_KEYS.subsidized] === 'true',
        surpriseBonusAmount: Number(byKey[DONATION_CONFIG_KEYS.bonus] || 0),
    };
}

router.get('/admin/config', authenticate, requireAdmin, async (req, res, next) => {
    try {
        res.json({ success: true, data: await readDonationConfig() });
    } catch (err) {
        next(err);
    }
});

router.post('/admin/config', authenticate, requireAdmin, async (req, res, next) => {
    try {
        const { subsidized, bonus } = req.body;

        const upsert = async (key, value) => {
            const existing = await queryOne(
                'SELECT id FROM admin_config WHERE config_key = $1',
                [key]
            );
            if (existing) {
                await query(
                    'UPDATE admin_config SET config_value = $1, updated_by = $2 WHERE config_key = $3',
                    [String(value), req.user.id, key]
                );
            } else {
                await query(
                    `INSERT INTO admin_config
                         (id, config_key, config_value, config_category, is_active, updated_by)
                     VALUES ($1, $2, $3, 'donations', 1, $4)`,
                    [crypto.randomUUID(), key, String(value), req.user.id]
                );
            }
        };

        if (subsidized !== undefined) {
            await upsert(DONATION_CONFIG_KEYS.subsidized, Boolean(subsidized));
        }
        if (bonus !== undefined) {
            await upsert(DONATION_CONFIG_KEYS.bonus, Number(bonus) || 0);
        }

        res.json({
            success: true,
            data: await readDonationConfig(),
            message: 'Donation settings updated',
        });
    } catch (err) {
        next(err);
    }
});

// ─── Legacy aliases ─────────────────────────────────────────────────────────
// Kept so any existing client of the old shape keeps working, but pointed at
// charity_campaigns instead of the non-existent donation_campaigns.

router.get('/campaigns', authenticate, async (req, res, next) => {
    try {
        const result = await query(
            `${CROWDFUND_SELECT} WHERE status = $1 ORDER BY created_at DESC`,
            ['active']
        );
        res.json({ success: true, data: result.rows || result || [] });
    } catch (err) {
        next(err);
    }
});

router.post('/donate', authenticate, async (req, res, next) => {
    try {
        const { campaign_id: campaignId } = req.body;
        const amount = Number(req.body.amount);

        if (!campaignId) {
            return res.status(400).json({ success: false, error: 'campaign_id is required' });
        }
        if (!Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({ success: false, error: 'amount must be a positive number' });
        }

        const result = await creditCampaign({ campaignId, donorId: req.user.id, amount });
        return respondToDonation(res, result, amount);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
