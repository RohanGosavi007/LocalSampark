const { query, queryOne, withTransaction } = require('../../../config/database');

/**
 * Post a Civic Task / Micro-Volunteer Request
 */
const postTask = async (req, res, next) => {
  try {
    const { title, description, bountyCoins, type } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    let finalBounty = Number(bountyCoins) || 0;

    await withTransaction(async (client) => {
      // If Resident is attaching a bounty, deduct from their wallet (escrow) safely
      if (finalBounty > 0 && userRole !== 'admin') {
        const walletResult = await client.query(`SELECT total_coins FROM loyalty_wallets WHERE user_id = $1 FOR UPDATE`, 
          [userId]
        );
        const wallet = walletResult.rows[0];

        if (!wallet || wallet.total_coins < finalBounty) {
          throw new Error('Not enough SamparkCoins for this bounty.');
        }

        // Escrow deduction
        await client.query(`UPDATE loyalty_wallets SET total_coins = total_coins - $1 WHERE user_id = $2`, [finalBounty, userId]);
        await client.query(`INSERT INTO loyalty_transactions (user_id, amount, type, source) VALUES ($1, $2, 'spent', 'Volunteer Bounty Escrow')`, [userId, finalBounty]);
      }

      const newTask = await client.query(`INSERT INTO volunteer_tasks (poster_id, title, description, bounty_coins, type, status) 
         VALUES ($1, $2, $3, $4, $5, 'open') RETURNING *`,
        [userId, title, description, finalBounty, type]
      );

      res.status(201).json({ success: true, message: 'Volunteer Task Posted!', data: newTask.rows[0] });
    });
  } catch (error) {
    if (error.message === 'Not enough SamparkCoins for this bounty.') {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Get Open Tasks
 */
const getTasks = async (req, res, next) => {
  try {
    const tasks = await query(`
      SELECT v.*, u.full_name as poster_name, u.role as poster_role
      FROM volunteer_tasks v
      JOIN users u ON v.poster_id = u.id
      WHERE v.status = 'open' OR v.status = 'in_progress'
      ORDER BY v.created_at DESC
    `);
    res.json({ success: true, data: tasks.rows });
  } catch (error) {
    next(error);
  }
};

/**
 * Volunteer for a task
 */
const volunteerForTask = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const volunteerId = req.user.id;

    await withTransaction(async (client) => {
      // Lock the task row so two people can't volunteer at the exact same time
      const taskResult = await client.query(`SELECT * FROM volunteer_tasks WHERE id = $1 FOR UPDATE`, 
        [taskId]
      );
      const task = taskResult.rows[0];

      if (!task || task.status !== 'open') {
        throw new Error('Task is no longer available.');
      }
      if (task.poster_id === volunteerId) {
        throw new Error('You cannot volunteer for your own task.');
      }

      await client.query(`UPDATE volunteer_tasks SET status = 'in_progress', volunteer_id = $1 WHERE id = $2`, [volunteerId, taskId]);

      res.json({ success: true, message: 'You are now assigned to this task! Thank you for volunteering.' });
    });
  } catch (error) {
    if (error.message === 'Task is no longer available.' || error.message === 'You cannot volunteer for your own task.') {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Complete task and award bounty & badges
 */
const completeTask = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const posterId = req.user.id; 

    await withTransaction(async (client) => {
      // Lock the task row
      const taskResult = await client.query(`SELECT * FROM volunteer_tasks WHERE id = $1 FOR UPDATE`, 
        [taskId]
      );
      const task = taskResult.rows[0];

      if (!task || task.status !== 'in_progress') {
        throw new Error('Task not in progress.');
      }

      if (task.poster_id !== posterId && req.user.role !== 'admin') {
        throw new Error('Unauthorized to complete this task.');
      }

      const volunteerId = task.volunteer_id;
      const bounty = task.bounty_coins;

      // 1. Award Bounty (Release Escrow)
      if (bounty > 0) {
        await client.query(`UPDATE loyalty_wallets SET total_coins = total_coins + $1 WHERE user_id = $2`, [bounty, volunteerId]);
        await client.query(`INSERT INTO loyalty_transactions (user_id, amount, type, source) VALUES ($1, $2, 'earned', 'Volunteer Bounty Completed')`, [volunteerId, bounty]);
      }

      // 2. Mark complete
      await client.query(`UPDATE volunteer_tasks SET status = 'completed' WHERE id = $1`, [taskId]);

      // 3. Badge Logic (Community Hero)
      const completedCountRes = await client.query(`SELECT COUNT(*) as count FROM volunteer_tasks WHERE volunteer_id = $1 AND status = 'completed'`, [volunteerId]);
      let earnedBadge = false;
      if (completedCountRes.rows[0] && parseInt(completedCountRes.rows[0].count) === 5) {
        // Award badge if not already awarded (lock badge row implicitly by attempting insert)
        const hasBadge = await client.query(`SELECT * FROM user_badges WHERE user_id = $1 AND badge_name = 'Community Hero'`, [volunteerId]);
        if (hasBadge.rows.length === 0) {
          await client.query(`INSERT INTO user_badges (user_id, badge_name) VALUES ($1, 'Community Hero')`, [volunteerId]);
          earnedBadge = true;
        }
      }

      res.json({ 
        success: true, 
        message: `Task Completed! ${bounty} 🪙 awarded to volunteer.`,
        badgeEarned: earnedBadge 
      });
    });
  } catch (error) {
    if (error.message === 'Task not in progress.' || error.message === 'Unauthorized to complete this task.') {
      return res.status(403).json({ error: error.message });
    }
    next(error);
  }
};

module.exports = {
  postTask,
  getTasks,
  volunteerForTask,
  completeTask
};
