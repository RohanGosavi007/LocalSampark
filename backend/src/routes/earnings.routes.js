const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate } = require('../middleware/auth.middleware');

// Get user earnings ledger
router.get('/user/:userId', authenticate, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const earnings = await db.queryMany(
      `SELECT * FROM user_earnings WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    res.json(earnings);
  } catch (error) {
    next(error);
  }
});

// Get user earnings summary
router.get('/summary/:userId', authenticate, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const result = await db.queryOne(
      `SELECT COALESCE(SUM(amount), 0.00) as total_earned FROM user_earnings WHERE user_id = $1`,
      [userId]
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Request withdrawal
router.post('/withdraw', authenticate, async (req, res, next) => {
  try {
    const { userId, amount, upiId } = req.body;
    
    // Check wallet balance
    const wallet = await db.queryOne(`SELECT balance FROM wallets WHERE user_id = $1`, [userId]);
    if (!wallet || parseFloat(wallet.balance) < parseFloat(amount)) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Deduct from wallet & record transaction
    await db.transaction(async (client) => {
      await client.query(`UPDATE wallets SET balance = balance - $1 WHERE user_id = $2`, [amount, userId]);
      await client.query(
        `INSERT INTO wallet_transactions (wallet_id, amount, type, purpose, status)
         VALUES ((SELECT id FROM wallets WHERE user_id = $1), $2, 'debit', 'withdrawal', 'completed')`,
        [userId, amount]
      );
    });

    res.json({ success: true, message: 'Withdrawal request processed successfully' });
  } catch (error) {
    next(error);
  }
});

// Leaderboard
router.get('/leaderboard', authenticate, async (req, res, next) => {
  try {
    const leaderboardData = await db.queryMany(
      `SELECT u.full_name as name, u.role, COALESCE(SUM(ue.amount), 0) as total_earned
       FROM users u
       JOIN user_earnings ue ON u.id = ue.user_id
       GROUP BY u.id, u.full_name, u.role
       ORDER BY total_earned DESC
       LIMIT 10`
    );
    const leaderboard = leaderboardData.map(l => ({
      name: `${l.name} (${l.role})`,
      points: Math.floor(l.total_earned / 100), // Simple points calculation
      amount: `₹${parseFloat(l.total_earned).toLocaleString('en-IN')}`
    }));
    res.json(leaderboard);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
