const express = require('express');
const router = express.Router();
const { query, withTransaction } = require('../../../config/database');
const { authenticate } = require('../../../middleware/auth.middleware');
const crypto = require('crypto');
const coins = require('../../../services/coins.service');

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
      LEFT JOIN users u ON CAST(u.id AS TEXT) = CAST(t.poster_id AS TEXT)`;

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

/**
 * The bounty economy, as the screen describes it ("attach a coin bounty from
 * your wallet"; "Mark Completed (Owner/Admin)"):
 *
 *   post      the bounty is taken from the poster's coins and held
 *   claim     anyone but the poster
 *   complete  the poster (or an administrator) confirms the work was done,
 *             and the held bounty goes to the volunteer
 *   cancel    the poster calls off an unclaimed task and gets the bounty back
 *
 * The bounty used to be any number the poster typed, taken from nobody, and
 * paid out when the *volunteer* said the task was done — so posting a task,
 * claiming it yourself and completing it created coins from nothing.
 */
router.post('/post', authenticate, async (req, res, next) => {
    try {
        const { title, description, bountyCoins, type } = req.body || {};

        if (!title || !String(title).trim()) {
            return res.status(400).json({ success: false, error: 'title is required' });
        }

        const bounty = bountyCoins === undefined || bountyCoins === null || bountyCoins === '' ? 0 : Number(bountyCoins);
        if (!Number.isInteger(bounty) || bounty < 0 || bounty > coins.MAX_AMOUNT) {
            return res.status(400).json({ success: false, error: 'bountyCoins must be a whole number of coins, 0 or more' });
        }

        await withTransaction(async (client) => {
            const created = await client.query(
                `INSERT INTO volunteer_tasks
                     (poster_id, title, description, bounty_coins, type, status)
                 VALUES ($1, $2, $3, $4, $5, 'open')
                 RETURNING id`,
                [req.user.id, String(title).trim().slice(0, 200), String(description || '').slice(0, 2000), bounty, type === 'micro_task' ? 'micro_task' : 'civic_issue']
            );
            if (bounty > 0) {
                await coins.debit({ userId: req.user.id, amount: bounty, reason: 'Shramdaan bounty held', referenceId: `volunteer:${created.rows[0].id}`, client });
            }
        });

        res.status(201).json({ success: true, message: 'Volunteer task posted' });
    } catch (err) {
        if (!coins.sendCoinError(res, err)) next(err);
    }
});

router.post('/:id/volunteer', authenticate, async (req, res, next) => {
    try {
        // Claim-if-open in a single statement so two volunteers tapping at the
        // same moment cannot both be assigned. Not the poster's own task.
        const claimed = await query(
            `UPDATE volunteer_tasks
                SET status = 'claimed', volunteer_id = $1
              WHERE id = $2 AND status = 'open' AND CAST(poster_id AS TEXT) <> CAST($3 AS TEXT)`,
            // $3 repeats the volunteer: PostgreSQL deduces one type per
            // placeholder, and volunteer_id (uuid) cannot share one with a cast.
            [req.user.id, req.params.id, String(req.user.id)]
        );

        if (!claimed.rowCount) {
            return res.status(409).json({
                success: false,
                error: 'This task is not open to you: it has been claimed, or it is your own',
            });
        }

        res.json({ success: true, message: 'You have volunteered for this task!' });
    } catch (err) {
        next(err);
    }
});

const STAFF = new Set(['admin', 'super_admin', 'moderator']);

router.post('/:id/complete', authenticate, async (req, res, next) => {
    try {
        const isStaff = STAFF.has(String(req.user.role || '').toLowerCase());
        const outcome = await withTransaction(async (client) => {
            const task = (await client.query('SELECT * FROM volunteer_tasks WHERE id = $1', [req.params.id])).rows[0];
            if (!task) return { missing: true };
            if (!isStaff && String(task.poster_id) !== String(req.user.id)) return { forbidden: true };

            const closed = await client.query(
                `UPDATE volunteer_tasks SET status = 'completed' WHERE id = $1 AND status = 'claimed'`,
                [req.params.id]
            );
            if (!closed.rowCount) return { notClaimed: true };

            const volunteerId = task.volunteer_id;
            const bounty = Number(task.bounty_coins) || 0;
            if (bounty > 0) {
                await coins.credit({ userId: volunteerId, amount: bounty, reason: 'Shramdaan task bounty', referenceId: `volunteer:${task.id}`, client });
            }

            const tally = await client.query(
                `SELECT COUNT(*) AS completed
                   FROM volunteer_tasks
                  WHERE volunteer_id = $1 AND status = 'completed'`,
                [volunteerId]
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
                    [crypto.randomUUID(), volunteerId]
                );
                badgeEarned = true;
            }

            return { ok: true, bounty, badgeEarned };
        });

        if (outcome.missing) return res.status(404).json({ success: false, error: 'Task not found' });
        if (outcome.forbidden) {
            return res.status(403).json({ success: false, error: 'Only the person who posted this task can mark it completed' });
        }
        if (outcome.notClaimed) {
            return res.status(409).json({ success: false, error: 'Only a task someone has volunteered for can be completed' });
        }

        res.json({
            success: true,
            badgeEarned: outcome.badgeEarned,
            message: outcome.bounty
                ? `Task completed! ${outcome.bounty} coins paid to the volunteer.`
                : 'Task completed!',
        });
    } catch (err) {
        if (!coins.sendCoinError(res, err)) next(err);
    }
});

router.post('/:id/cancel', authenticate, async (req, res, next) => {
    try {
        const outcome = await withTransaction(async (client) => {
            const task = (await client.query('SELECT * FROM volunteer_tasks WHERE id = $1', [req.params.id])).rows[0];
            if (!task || String(task.poster_id) !== String(req.user.id)) return { missing: true };
            const closed = await client.query(
                `UPDATE volunteer_tasks SET status = 'cancelled' WHERE id = $1 AND status = 'open'`,
                [req.params.id]
            );
            if (!closed.rowCount) return { notOpen: true };
            const bounty = Number(task.bounty_coins) || 0;
            if (bounty > 0) {
                await coins.credit({ userId: req.user.id, amount: bounty, reason: 'Shramdaan bounty returned', referenceId: `volunteer:${task.id}`, client });
            }
            return { refunded: bounty };
        });
        if (outcome.missing) return res.status(404).json({ success: false, error: 'Task not found' });
        if (outcome.notOpen) return res.status(409).json({ success: false, error: 'Only a task nobody has taken yet can be cancelled' });
        res.json({ success: true, refundedCoins: outcome.refunded });
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
              WHERE id = $2 AND status = 'open' AND CAST(poster_id AS TEXT) <> CAST($3 AS TEXT)`,
            [req.user.id, taskId, String(req.user.id)]
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
