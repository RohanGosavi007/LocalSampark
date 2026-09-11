const express = require('express');
const router = express.Router();
const { query, queryOne, withTransaction } = require('../../../config/database');
const { authenticate } = require('../../../middleware/auth.middleware');
const crypto = require('crypto');

/**
 * Peer-to-peer equipment rental.
 *
 * apps/mobile/app/modules/equipment/index.js expects /listings,
 * /rentals/me, /rent/:id and /rentals/:id/return. None existed. The two
 * routes that were here (GET / and POST /) queried `equipment_rentals` as
 * though it held the catalogue — but that table did not exist at all, and the
 * catalogue actually lives in `equipment_listings`. Both therefore threw.
 *
 * Migration 088 creates equipment_rentals as what its name implies: the
 * rental transactions themselves.
 */

// owner_name is joined rather than denormalised — the screen renders
// item.owner_name, and equipment_listings only stores owner_id.
const LISTING_SELECT = `
    SELECT l.id,
           l.item_name,
           l.category,
           l.description,
           l.daily_price,
           l.security_deposit,
           l.image_url,
           l.status,
           l.owner_id,
           COALESCE(u.full_name, 'LocalSampark User') AS owner_name
      FROM equipment_listings l
      LEFT JOIN users u ON u.id = CAST(l.owner_id AS TEXT)`;

// ─── Catalogue ──────────────────────────────────────────────────────────────

router.get('/listings', authenticate, async (req, res, next) => {
    try {
        const { category } = req.query;
        const params = ['available'];
        let sql = `${LISTING_SELECT} WHERE l.status = $1`;
        if (category && category !== 'All') {
            params.push(category);
            sql += ' AND l.category = $2';
        }
        sql += ' ORDER BY l.created_at DESC';

        const result = await query(sql, params);
        res.json({ success: true, data: result.rows || result || [] });
    } catch (err) {
        next(err);
    }
});

router.post('/listings', authenticate, async (req, res, next) => {
    try {
        const { itemName, category, description, dailyPrice, securityDeposit, imageUrl } = req.body;

        if (!itemName || !String(itemName).trim()) {
            return res.status(400).json({ success: false, error: 'itemName is required' });
        }

        const price = Number(dailyPrice);
        const deposit = Number(securityDeposit);
        if (!Number.isFinite(price) || price < 0) {
            return res.status(400).json({ success: false, error: 'dailyPrice must be a non-negative number' });
        }
        if (!Number.isFinite(deposit) || deposit < 0) {
            return res.status(400).json({ success: false, error: 'securityDeposit must be a non-negative number' });
        }

        const inserted = await query(
            `INSERT INTO equipment_listings
                 (owner_id, item_name, category, description, daily_price, security_deposit, image_url, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'available')`,
            [req.user.id, itemName, category || 'Tools', description || '',
             price, deposit, imageUrl || null]
        );

        res.status(201).json({
            success: true,
            data: { id: inserted.lastID ?? null },
            message: 'Equipment listed successfully',
        });
    } catch (err) {
        next(err);
    }
});

// ─── Rentals ────────────────────────────────────────────────────────────────

router.get('/rentals/me', authenticate, async (req, res, next) => {
    try {
        const result = await query(
            `SELECT r.id,
                    r.listing_id,
                    r.days,
                    r.total_amount,
                    r.deposit_held,
                    r.status,
                    r.rented_at,
                    r.returned_at,
                    l.item_name,
                    l.category,
                    l.image_url
               FROM equipment_rentals r
               JOIN equipment_listings l ON l.id = r.listing_id
              WHERE r.renter_id = $1
              ORDER BY r.rented_at DESC`,
            [req.user.id]
        );
        res.json({ success: true, data: result.rows || result || [] });
    } catch (err) {
        next(err);
    }
});

router.post('/rent/:id', authenticate, async (req, res, next) => {
    try {
        const listingId = Number(req.params.id);
        const days = Number(req.body.days) || 1;

        if (!Number.isInteger(listingId)) {
            return res.status(400).json({ success: false, error: 'Invalid listing id' });
        }
        if (!Number.isFinite(days) || days < 1) {
            return res.status(400).json({ success: false, error: 'days must be at least 1' });
        }

        const outcome = await withTransaction(async (client) => {
            // Re-read the listing inside the transaction and flip its status in
            // the same statement that checks it, so two people tapping "Rent"
            // on the last item cannot both succeed.
            const found = await client.query(
                'SELECT id, daily_price, security_deposit, status, owner_id FROM equipment_listings WHERE id = $1',
                [listingId]
            );
            const listing = (found.rows || [])[0];
            if (!listing) return { notFound: true };
            if (String(listing.owner_id) === String(req.user.id)) return { ownItem: true };

            const claim = await client.query(
                `UPDATE equipment_listings SET status = 'rented'
                  WHERE id = $1 AND status = 'available'`,
                [listingId]
            );
            if (!claim.rowCount) return { unavailable: true };

            const total = Number(listing.daily_price) * days;
            const deposit = Number(listing.security_deposit) || 0;

            const debit = await client.query(
                'UPDATE wallets SET balance = balance - $1 WHERE user_id = $2 AND balance >= $1',
                [total + deposit, req.user.id]
            );
            if (!debit.rowCount) {
                // Throwing rolls the whole transaction back, including the
                // status flip above — the listing must not stay 'rented' when
                // the payment did not go through.
                const err = new Error('INSUFFICIENT_BALANCE');
                err.code = 'INSUFFICIENT_BALANCE';
                throw err;
            }

            await client.query(
                `INSERT INTO wallet_transactions (id, wallet_id, amount, type, purpose, status)
                 VALUES ($1, (SELECT id FROM wallets WHERE user_id = $2), $3, 'debit', 'equipment_rental', 'completed')`,
                [crypto.randomUUID(), req.user.id, total + deposit]
            );

            const rentalId = crypto.randomUUID();
            await client.query(
                `INSERT INTO equipment_rentals
                     (id, listing_id, renter_id, days, total_amount, deposit_held, status)
                 VALUES ($1, $2, $3, $4, $5, $6, 'active')`,
                [rentalId, listingId, req.user.id, days, total, deposit]
            );

            return { ok: true, rentalId, total, deposit };
        }).catch((err) => {
            if (err.code === 'INSUFFICIENT_BALANCE') return { insufficient: true };
            throw err;
        });

        if (outcome.notFound) return res.status(404).json({ success: false, error: 'Listing not found' });
        if (outcome.ownItem) return res.status(400).json({ success: false, error: 'You cannot rent your own listing' });
        if (outcome.unavailable) return res.status(409).json({ success: false, error: 'This item is already rented out' });
        if (outcome.insufficient) {
            return res.status(402).json({ success: false, error: 'Insufficient wallet balance for rent plus deposit' });
        }

        res.status(201).json({
            success: true,
            data: { rentalId: outcome.rentalId },
            message: `Rented for ${days} day(s). ₹${outcome.deposit} deposit held.`,
        });
    } catch (err) {
        next(err);
    }
});

router.post('/rentals/:id/return', authenticate, async (req, res, next) => {
    try {
        const outcome = await withTransaction(async (client) => {
            // The status predicate makes the return idempotent: a double tap
            // returns rowCount 0 the second time instead of refunding twice.
            const closed = await client.query(
                `UPDATE equipment_rentals
                    SET status = 'returned', returned_at = CURRENT_TIMESTAMP
                  WHERE id = $1 AND renter_id = $2 AND status = 'active'`,
                [req.params.id, req.user.id]
            );
            if (!closed.rowCount) return { notActive: true };

            const found = await client.query(
                'SELECT listing_id, deposit_held FROM equipment_rentals WHERE id = $1',
                [req.params.id]
            );
            const rental = (found.rows || [])[0];
            const deposit = Number(rental.deposit_held) || 0;

            if (deposit > 0) {
                await client.query(
                    'UPDATE wallets SET balance = balance + $1 WHERE user_id = $2',
                    [deposit, req.user.id]
                );
                await client.query(
                    `INSERT INTO wallet_transactions (id, wallet_id, amount, type, purpose, status)
                     VALUES ($1, (SELECT id FROM wallets WHERE user_id = $2), $3, 'credit', 'deposit_refund', 'completed')`,
                    [crypto.randomUUID(), req.user.id, deposit]
                );
            }

            await client.query(
                `UPDATE equipment_listings SET status = 'available' WHERE id = $1`,
                [rental.listing_id]
            );

            return { ok: true, deposit };
        });

        if (outcome.notActive) {
            return res.status(404).json({ success: false, error: 'No active rental found for this id' });
        }

        res.json({
            success: true,
            message: outcome.deposit > 0
                ? `Item returned. ₹${outcome.deposit} deposit refunded to your wallet.`
                : 'Item returned.',
        });
    } catch (err) {
        next(err);
    }
});

// ─── Legacy aliases ─────────────────────────────────────────────────────────
// The original GET / and POST / pointed at a table that never existed. Kept
// working, against the correct one.

router.get('/', authenticate, async (req, res, next) => {
    try {
        const result = await query(`${LISTING_SELECT} WHERE l.status = $1`, ['available']);
        res.json({ success: true, data: result.rows || result || [] });
    } catch (err) {
        next(err);
    }
});

router.post('/', authenticate, async (req, res, next) => {
    try {
        const { item_name, description, daily_rate, category, security_deposit } = req.body;
        if (!item_name) {
            return res.status(400).json({ success: false, error: 'item_name is required' });
        }
        await query(
            `INSERT INTO equipment_listings
                 (owner_id, item_name, category, description, daily_price, security_deposit, status)
             VALUES ($1, $2, $3, $4, $5, $6, 'available')`,
            [req.user.id, item_name, category || 'Tools', description || '',
             Number(daily_rate) || 0, Number(security_deposit) || 0]
        );
        res.status(201).json({ success: true, message: 'Equipment listed successfully' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
