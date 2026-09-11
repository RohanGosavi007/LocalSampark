const express = require('express');
const router = express.Router();
const { query, withTransaction } = require('../../../config/database');
const { authenticate } = require('../../../middleware/auth.middleware');
const crypto = require('crypto');

/**
 * Scrap collection: residents schedule a pickup, dealers claim and complete it.
 *
 * POST /schedule already existed but silently dropped three of the five fields
 * the mobile form sends — scrap_type, payout_preference and pincode had no
 * columns until migration 088, so the dealer-facing screen had no way to know
 * what was being collected or how the resident wanted paying. The dealer side
 * (/pings, /:id/accept, /:id/complete) did not exist at all.
 */

const PING_SELECT = `
    SELECT s.id,
           s.address,
           s.scrap_type,
           s.approx_weight,
           s.payout_preference,
           s.preferred_time,
           s.pincode,
           s.status,
           s.created_at,
           COALESCE(u.full_name, 'Resident') AS resident_name
      FROM scrap_pickups s
      LEFT JOIN users u ON u.id = s.user_id`;

// Coins awarded when a resident donates the proceeds instead of taking cash.
const DONATION_REWARD_COINS = 500;

// ─── Resident ───────────────────────────────────────────────────────────────

router.post('/schedule', authenticate, async (req, res, next) => {
    try {
        const {
            address,
            preferred_time: preferredTime,
            estimated_weight: estimatedWeight,
            scrap_type: scrapType,
            approx_weight: approxWeight,
            payout_preference: payoutPreference,
            pincode,
        } = req.body;

        if (!address || !String(address).trim()) {
            return res.status(400).json({ success: false, error: 'address is required' });
        }

        const weight = approxWeight || estimatedWeight;
        const id = crypto.randomUUID();

        await query(
            `INSERT INTO scrap_pickups
                 (id, user_id, address, preferred_time, estimated_weight,
                  scrap_type, approx_weight, payout_preference, pincode, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')`,
            [id, req.user.id, address, preferredTime || null, weight || null,
             scrapType || null, weight || null,
             payoutPreference || 'cash', pincode || null]
        );

        res.status(201).json({
            success: true,
            data: { id },
            message: 'Scrap pickup scheduled successfully',
        });
    } catch (err) {
        next(err);
    }
});

router.get('/my-pickups', authenticate, async (req, res, next) => {
    try {
        const result = await query(
            `${PING_SELECT} WHERE s.user_id = $1 ORDER BY s.created_at DESC`,
            [req.user.id]
        );
        res.json({ success: true, data: result.rows || result || [] });
    } catch (err) {
        next(err);
    }
});

// ─── Dealer ─────────────────────────────────────────────────────────────────

router.get('/pings', authenticate, async (req, res, next) => {
    try {
        const { pincode } = req.query;
        const params = ['pending'];
        let sql = `${PING_SELECT} WHERE s.status = $1`;
        if (pincode) {
            params.push(pincode);
            sql += ' AND s.pincode = $2';
        }
        sql += ' ORDER BY s.created_at ASC';

        const result = await query(sql, params);
        res.json({ success: true, data: result.rows || result || [] });
    } catch (err) {
        next(err);
    }
});

router.post('/:id/accept', authenticate, async (req, res, next) => {
    try {
        // Claim and check in one statement: two dealers accepting the same
        // ping concurrently must not both win.
        const claimed = await query(
            `UPDATE scrap_pickups
                SET status = 'accepted', dealer_id = $1, updated_at = CURRENT_TIMESTAMP
              WHERE id = $2 AND status = 'pending'`,
            [req.user.id, req.params.id]
        );

        if (!claimed.rowCount) {
            return res.status(409).json({
                success: false,
                error: 'This pickup has already been accepted by another dealer',
            });
        }

        res.json({ success: true, message: 'Pickup accepted. Head to the address to collect.' });
    } catch (err) {
        next(err);
    }
});

router.post('/:id/complete', authenticate, async (req, res, next) => {
    try {
        const outcome = await withTransaction(async (client) => {
            const closed = await client.query(
                `UPDATE scrap_pickups
                    SET status = 'completed', completed_at = CURRENT_TIMESTAMP,
                        updated_at = CURRENT_TIMESTAMP
                  WHERE id = $1 AND dealer_id = $2 AND status = 'accepted'`,
                [req.params.id, req.user.id]
            );
            if (!closed.rowCount) return { notAccepted: true };

            const found = await client.query(
                'SELECT user_id, payout_preference FROM scrap_pickups WHERE id = $1',
                [req.params.id]
            );
            const pickup = (found.rows || [])[0];

            // Residents who donate their proceeds are paid in SamparkCoins
            // instead of cash — the promise the mobile screen makes on submit.
            if (pickup && pickup.payout_preference === 'donate') {
                await client.query(
                    `INSERT INTO reward_coins_ledger (id, user_id, amount, transaction_type, description)
                     VALUES ($1, $2, $3, 'credit', 'Scrap donation to Old Age Fund')`,
                    [crypto.randomUUID(), pickup.user_id, DONATION_REWARD_COINS]
                );
                return { ok: true, coinsAwarded: DONATION_REWARD_COINS };
            }

            return { ok: true, coinsAwarded: 0 };
        });

        if (outcome.notAccepted) {
            return res.status(409).json({
                success: false,
                error: 'Only the dealer who accepted this pickup can complete it',
            });
        }

        res.json({
            success: true,
            message: outcome.coinsAwarded
                ? `Pickup completed. ${outcome.coinsAwarded} coins credited to the resident.`
                : 'Pickup completed.',
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
