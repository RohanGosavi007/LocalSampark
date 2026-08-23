const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { query } = require('../../../config/database');
const { authenticate } = require('../../../middleware/auth.middleware');

const POST_TYPE = 'townsquare_news';

function isModerator(user) {
    return ['admin', 'super_admin', 'territory_admin', 'society_admin'].includes(user?.role);
}

function parsePost(row) {
    let title = 'Notice';
    let contentText = row.content;
    try {
        const parsed = JSON.parse(row.content);
        title = parsed.title;
        contentText = parsed.text;
    } catch (e) {
        // Plain-text legacy content, keep as-is.
    }
    return { ...row, title, contentText };
}

// GET townsquare news (approved only)
router.get('/news', authenticate, async (req, res, next) => {
    try {
        const newsData = await query(
            "SELECT p.*, u.full_name AS author_name FROM posts p LEFT JOIN users u ON u.id = p.user_id WHERE p.post_type = $1 AND p.status = 'approved' ORDER BY p.created_at DESC",
            [POST_TYPE]
        );
        res.json({ success: true, data: (newsData.rows || newsData).map(parsePost) });
    } catch (err) {
        next(err);
    }
});

// GET pending news awaiting moderation (moderator/admin only)
router.get('/news/pending', authenticate, async (req, res, next) => {
    try {
        if (!isModerator(req.user)) {
            return res.status(403).json({ success: false, error: 'Moderator access required.' });
        }
        const pending = await query(
            "SELECT p.*, u.full_name AS author_name FROM posts p LEFT JOIN users u ON u.id = p.user_id WHERE p.post_type = $1 AND p.status = 'pending' ORDER BY p.created_at DESC",
            [POST_TYPE]
        );
        res.json({ success: true, data: (pending.rows || pending).map(parsePost) });
    } catch (err) {
        next(err);
    }
});

// POST a new news tip/notice — starts pending, needs moderator approval
router.post('/news', authenticate, async (req, res, next) => {
    try {
        const { title, content } = req.body;
        if (!title || !content) {
            return res.status(400).json({ success: false, error: 'title and content are required.' });
        }
        const id = crypto.randomUUID();
        await query(
            "INSERT INTO posts (id, user_id, region_id, content, post_type, status) VALUES ($1, $2, $3, $4, $5, 'pending')",
            [id, req.user.id, req.user.region_id || null, JSON.stringify({ title, text: content }), POST_TYPE]
        );
        res.json({ success: true, message: 'Submitted for review.', id });
    } catch (err) {
        next(err);
    }
});

// POST approve/reject a pending news item (moderator/admin only)
router.post('/news/:id/:action', authenticate, async (req, res, next) => {
    try {
        if (!isModerator(req.user)) {
            return res.status(403).json({ success: false, error: 'Moderator access required.' });
        }
        const { id, action } = req.params;
        if (!['approve', 'reject'].includes(action)) {
            return res.status(400).json({ success: false, error: 'action must be approve or reject.' });
        }
        const status = action === 'approve' ? 'approved' : 'rejected';
        await query("UPDATE posts SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND post_type = $3", [status, id, POST_TYPE]);
        res.json({ success: true, message: `News item ${status}.` });
    } catch (err) {
        next(err);
    }
});

// GET townsquare polls, with live vote counts per option
router.get('/polls', authenticate, async (req, res, next) => {
    try {
        const pollData = await query("SELECT * FROM polls WHERE active = 1 ORDER BY created_at DESC");
        const polls = pollData.rows || pollData;

        const formatted = await Promise.all(polls.map(async (p) => {
            const options = JSON.parse(p.options);
            const voteCounts = await query(
                "SELECT selected_option, COUNT(*) as c FROM poll_votes WHERE poll_id = $1 GROUP BY selected_option",
                [p.id]
            );
            const counts = {};
            for (const row of (voteCounts.rows || voteCounts)) counts[row.selected_option] = Number(row.c);

            return {
                id: p.id,
                question: p.question,
                options: options.map((opt) => ({ ...opt, votes: counts[opt.id] || 0 })),
                reward_coins: p.reward_coins || 0,
                active: p.active,
            };
        }));

        res.json({ success: true, data: formatted });
    } catch (err) {
        next(err);
    }
});

// POST create a new poll (moderator/admin only)
router.post('/polls', authenticate, async (req, res, next) => {
    try {
        if (!isModerator(req.user)) {
            return res.status(403).json({ success: false, error: 'Moderator access required.' });
        }
        const { question, options, rewardCoins } = req.body;
        if (!question || !Array.isArray(options) || options.length < 2) {
            return res.status(400).json({ success: false, error: 'question and at least 2 options are required.' });
        }
        const id = crypto.randomUUID();
        const optionObjs = options.map((text, i) => ({ id: i, text }));
        await query(
            "INSERT INTO polls (id, user_id, region_id, question, options, reward_coins, active) VALUES ($1, $2, $3, $4, $5, $6, 1)",
            [id, req.user.id, req.user.region_id || null, question, JSON.stringify(optionObjs), rewardCoins || 0]
        );
        res.json({ success: true, message: 'Poll published.', id });
    } catch (err) {
        next(err);
    }
});

// POST vote on a poll option
router.post('/polls/:pollId/vote', authenticate, async (req, res, next) => {
    try {
        const { pollId } = req.params;
        const { optionId } = req.body;
        if (optionId === undefined || optionId === null) {
            return res.status(400).json({ success: false, error: 'optionId is required.' });
        }
        const voteId = crypto.randomUUID();
        try {
            await query(
                "INSERT INTO poll_votes (id, poll_id, user_id, selected_option) VALUES ($1, $2, $3, $4)",
                [voteId, pollId, req.user.id, optionId]
            );
        } catch (err) {
            // UNIQUE(poll_id, user_id) — voting twice is a client bug, not a
            // server error; surface it as a normal failure response.
            if (String(err.message || '').includes('UNIQUE')) {
                return res.status(409).json({ success: false, error: 'You already voted on this poll.' });
            }
            throw err;
        }
        res.json({ success: true, message: 'Vote recorded.' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
