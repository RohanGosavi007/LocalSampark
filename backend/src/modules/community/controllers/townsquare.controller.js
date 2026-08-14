const { query, queryOne } = require('../../../config/database');
const crypto = require('crypto');

/**
 * Get all active news (published only)
 */
const getNews = async (req, res, next) => {
  try {
    const { location } = req.query;
    
    // We will query posts where post_type = 'news'
    let baseQuery = `
      SELECT p.*, u.full_name as author_name 
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.post_type = 'news'
    `;
    const params = [];
    
    // Location filter based on coordinate field which we can use to store location string for MVP
    if (location && location !== 'Choose Location' && location !== '') {
      params.push(`%${location}%`);
      baseQuery += ` AND LOWER(p.coordinate) LIKE LOWER($${params.length})`;
    }
    
    baseQuery += ` ORDER BY p.created_at DESC`;

    const news = await query(baseQuery, params);
    res.json({ success: true, data: news.rows });
  } catch (error) {
    next(error);
  }
};

/**
 * Submit a News Tip (Resident) or Publish News (Admin)
 */
const submitNewsTip = async (req, res, next) => {
  try {
    const { title, content, pincode, location } = req.body;
    const userId = req.user.id;
    
    // In a real DB, admin settings would dictate if this is allowed for residents.
    // For now, we allow it and default status to 'news_pending' unless admin.
    const isAdmin = req.user.role === 'admin' || req.user.role === 'super_admin' || req.user.role === 'territory_admin';
    const status = isAdmin ? 'news' : 'news_pending';

    const postId = crypto.randomUUID();
    // Bundle title and content into the content field since `posts` schema doesn't have a title field
    const bundledContent = JSON.stringify({ title, text: content, pincode });

    // We store the location in `coordinate` field temporarily since there's no location field.
    const newArticle = await query(`INSERT INTO posts (id, user_id, content, post_type, coordinate) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [postId, userId, bundledContent, status, location || '']
    );

    res.status(201).json({
      success: true,
      message: isAdmin ? 'News published successfully.' : 'News tip submitted for admin review.',
      data: newArticle.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get pending news tips (Admin Only)
 */
const getPendingTips = async (req, res, next) => {
  try {
    const news = await query(`
      SELECT p.*, u.full_name as author_name 
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.post_type = 'news_pending'
      ORDER BY p.created_at ASC
    `);
    res.json({ success: true, data: news.rows });
  } catch (error) {
    next(error);
  }
};

/**
 * Approve a News Tip (Admin Only)
 */
const approveTip = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await query(`UPDATE posts SET post_type = 'news' WHERE id = $1 RETURNING *`, [id]);
    res.json({ success: true, message: 'News tip published.', data: updated.rows[0] });
  } catch (error) {
    next(error);
  }
};

/**
 * Reject and Delete a News Tip (Admin Only)
 */
const rejectTip = async (req, res, next) => {
  try {
    const { id } = req.params;
    await query(`DELETE FROM posts WHERE id = $1`, [id]);
    res.json({ success: true, message: 'News tip rejected and deleted.' });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all active polls
 */
const getPolls = async (req, res, next) => {
  try {
    // Polls table is standard.
    const polls = await query(`
      SELECT p.*, u.full_name as author_name
      FROM polls p
      LEFT JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
    `);
    res.json({ success: true, data: polls.rows });
  } catch (error) {
    next(error);
  }
};

/**
 * Create Admin Poll
 */
const createAdminPoll = async (req, res, next) => {
  try {
    const { question, options } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ error: 'Must provide at least 2 options' });
    }

    const pollId = crypto.randomUUID();
    const newPoll = await query(`INSERT INTO polls (id, user_id, question, options) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [pollId, userId, question, JSON.stringify(options)]
    );

    res.status(201).json({
      success: true,
      message: 'Poll created successfully!',
      data: newPoll.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Vote on a Poll
 */
const votePoll = async (req, res, next) => {
  try {
    const { pollId } = req.params;
    const { optionId } = req.body;
    const userId = req.user.id;

    const existingVote = await queryOne(`SELECT id FROM poll_votes WHERE poll_id = $1 AND user_id = $2`, [pollId, userId]);
    if (existingVote) {
      return res.status(400).json({ error: 'You have already voted on this poll.' });
    }

    const voteId = crypto.randomUUID();
    await query(`INSERT INTO poll_votes (id, poll_id, user_id, selected_option) VALUES ($1, $2, $3, $4)`,
      [voteId, pollId, userId, optionId]
    );

    // Update poll counts
    const poll = await queryOne(`SELECT options FROM polls WHERE id = $1`, [pollId]);
    if (poll) {
      let optionsList = JSON.parse(poll.options || '[]');
      optionsList = optionsList.map(opt => {
        if (opt.id === optionId) {
          return { ...opt, votes: (opt.votes || 0) + 1 };
        }
        return opt;
      });
      await query(`UPDATE polls SET options = $1 WHERE id = $2`, [JSON.stringify(optionsList), pollId]);
    }

    // Since we are not doing wallet rewards, we skip the wallet logic
    res.json({
      success: true,
      message: `Vote recorded successfully.`
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNews,
  submitNewsTip,
  getPendingTips,
  approveTip,
  rejectTip,
  getPolls,
  createAdminPoll,
  votePoll
};
