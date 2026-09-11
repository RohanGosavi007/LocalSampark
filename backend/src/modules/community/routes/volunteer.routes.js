const express = require('express');
const router = express.Router();
const { query, withTransaction } = require('../../../config/database');
const { authenticate } = require('../../../middleware/auth.middleware');
const crypto = require('crypto');

/**
 * "Shramdaan" — micro-volunteering with SamparkCoin bounties.
 *
 * The two routes that were here (GET /events, POST /register) queried a
 * `volunteer_events` table that exists in neither schema, so both threw. The
 * data model the mobile screen actually works against is `volunteer_tasks`:
 * someone posts a task with a coin bounty, someone else claims it, and the
 * bounty transfers on completion.
 */

// poster_name / poster_role are joined; volunteer_tasks stores only poster_id.
const TASK_SELECT = `
    SELECT t.id,
           t.title,
           t.description,
           t.bounty_coins,
           t.type,
           t.status,
           t.poster_id,
           t.volunteer_id,
           t.created_at,
           COALESCE(u.full_name, 'Resident') AS poster_name,
           COALESCE(u.role, 'CUSTOMER') AS poster_role
      FROM volunteer_tasks t
      LEFT JOIN users u ON u.id = CAST(t.poster_id AS TEXT)`;

// Completing this many tasks earns the "Community Hero" badge the screen
// celebrates when data.badgeEarned comes back true.
const HERO_BADGE_THRESHOLD = 5;

router.get('/tasks', authenticate, async (req, res, next) => {
    try {
        const result = await query(
            `${TASK_SELECT} WHERE t.status IN ($1, $2) ORDER BY t.created_at DESC`,
            ['open', 'claimed']
        );
        res.json({ success: true, data: result.rows || result || [] });
    } catch (err) {
        next(err);
    }
});

router.post('/post', authenticate, async (req, res, next) => {
    try {
        const { title, description, bountyCoins, type } = req.body;

        if (!title || !String(title).trim()) {
            return res.status(400).json({ success: false, error: 'title is required' });
        }

        const bounty = Number(bountyCoins) || 0;
        if (bounty < 0) {
            return res.status(400).json({ success: false, error: 'bountyCoins cannot be negative' });
        }

        await query(
            `INSERT INTO volunteer_tasks
                 (poster_id, title, description, bounty_coins, type, status)
             VALUES ($1, $2, $3, $4, $5, 'open')`,
            [req.user.id, title, description || '', bounty, type || 'civic_issue']
        );

        res.status(201).json({ success: true, message: 'Volunteer task posted' });
    } catch (err) {
        next(err);
    }
});

router.post('/:id/volunteer', authenticate, async (req, res, next) => {
    try {
        // Claim-if-open in a single statement so two volunteers tapping at the
        // same moment cannot both be assigned.
        const claimed = await query(
            `UPDATE volunteer_tasks
                SET status = 'claimed', volunteer_id = $1
              WHERE id = $2 AND status = 'open'`,
            [req.user.id, req.params.id]
        );

        if (!claimed.rowCount) {
            return res.status(409).json({
                success: false,
                error: 'This task has already been claimed',
            });
        }

        res.json({ success: true, message: 'You have volunteered for this task!' });
    } catch (err) {
        next(err);
    }
});

router.post('/:id/complete', authenticate, async (req, res, next) => {
    try {
        const outcome = await withTransaction(async (client) => {
            const closed = await client.query(
                `UPDATE volunteer_tasks
                    SET status = 'completed'
                  WHERE id = $1 AND volunteer_id = $2 AND status = 'claimed'`,
                [req.params.id, req.user.id]
            );
            if (!closed.rowCount) return { notClaimed: true };

            const found = await client.query(
                'SELECT bounty_coins FROM volunteer_tasks WHERE id = $1',
                [req.params.id]
            );
            const bounty = Number((found.rows || [])[0]?.bounty_coins) || 0;

            if (bounty > 0) {
                await client.query(
                    `INSERT INTO reward_coins_ledger (id, user_id, amount, transaction_type, description)
                     VALUES ($1, $2, $3, 'credit', 'Shramdaan task bounty')`,
                    [crypto.randomUUID(), req.user.id, bounty]
                );
            }

            const tally = await client.query(
                `SELECT COUNT(*) AS completed
                   FROM volunteer_tasks
                  WHERE volunteer_id = $1 AND status = 'completed'`,
                [req.user.id]
            );
            const completed = Number((tally.rows || [])[0]?.completed) || 0;

            // Award the badge exactly once, on the run that crosses the
            // threshold, rather than on every completion after it.
            let badgeEarned = false;
            if (completed === HERO_BADGE_THRESHOLD) {
                // badge_name is NOT NULL on user_badges, so it has to be
                // supplied explicitly alongside badge_type.
                await client.query(
                    `INSERT INTO user_badges (id, user_id, badge_type, badge_name, badge_icon, description, earned_at)
                     VALUES ($1, $2, 'community_hero', 'Community Hero', '🏅',
                             'Completed ${HERO_BADGE_THRESHOLD} Shramdaan tasks', CURRENT_TIMESTAMP)`,
                    [crypto.randomUUID(), req.user.id]
                );
                badgeEarned = true;
            }

            return { ok: true, bounty, badgeEarned };
        });

        if (outcome.notClaimed) {
            return res.status(409).json({
                success: false,
                error: 'Only the volunteer who claimed this task can complete it',
            });
        }

        res.json({
            success: true,
            badgeEarned: outcome.badgeEarned,
            message: outcome.bounty
                ? `Task completed! ${outcome.bounty} coins credited.`
                : 'Task completed!',
        });
    } catch (err) {
        next(err);
    }
});

// ─── Legacy aliases ─────────────────────────────────────────────────────────
// GET /events and POST /register previously targeted a table that does not
// exist. They now read the same task board, so old clients degrade to a
// working, if differently-named, view instead of a 500.

router.get('/events', authenticate, async (req, res, next) => {
    try {
        const result = await query(`${TASK_SELECT} WHERE t.status = $1`, ['open']);
        res.json({ success: true, data: result.rows || result || [] });
    } catch (err) {
        next(err);
    }
});

router.post('/register', authenticate, async (req, res, next) => {
    try {
        const taskId = req.body.event_id || req.body.task_id;
        if (!taskId) {
            return res.status(400).json({ success: false, error: 'task_id is required' });
        }
        const claimed = await query(
            `UPDATE volunteer_tasks SET status = 'claimed', volunteer_id = $1
              WHERE id = $2 AND status = 'open'`,
            [req.user.id, taskId]
        );
        if (!claimed.rowCount) {
            return res.status(409).json({ success: false, error: 'This task has already been claimed' });
        }
        res.json({ success: true, message: 'Successfully registered!' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
