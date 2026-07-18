const { query, queryOne } = require('../config/database');

// Configuration for conversion (Admin can change these via DB later)
const CONFIG = {
  COIN_TO_RUPEE_RATIO: 100 / 10, // 100 Coins = 10 Rupees -> 1 Coin = 0.1 Rupee
};

exports.getLoyaltyBalance = async (req, res, next) => {
  try {
    // In a real database, we would query the loyalty_ledger table
    // For now, mock a response for the frontend
    res.json({
      success: true,
      data: {
        userId: req.user?.id || 1,
        totalCoins: 450,
        equivalentRupees: 450 / CONFIG.COIN_TO_RUPEE_RATIO,
        recentTransactions: [
          { date: new Date().toISOString(), type: 'earned', source: 'Order Placement', amount: 50 },
          { date: new Date().toISOString(), type: 'earned', source: 'Referral Bonus', amount: 400 }
        ]
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.spinFortuneWheel = async (req, res, next) => {
  try {
    // Basic logic for spinning the wheel daily
    const winAmounts = [0, 10, 20, 50, 100, 500];
    const randomIndex = Math.floor(Math.random() * winAmounts.length);
    const wonCoins = winAmounts[randomIndex];

    // Log transaction to DB in real scenario
    // await queryOne('INSERT INTO loyalty_transactions (user_id, amount, source) VALUES ($1, $2, $3)', [req.user.id, wonCoins, 'Fortune Wheel']);

    res.json({
      success: true,
      message: wonCoins > 0 ? `Congratulations! You won ${wonCoins} SamparkCoins!` : 'Better luck next time!',
      wonCoins
    });
  } catch (error) {
    next(error);
  }
};

exports.redeemCoins = async (req, res, next) => {
  try {
    const { amountToRedeem } = req.body;
    
    if (!amountToRedeem || amountToRedeem < 100) {
      return res.status(400).json({ error: 'Minimum redemption is 100 coins' });
    }

    const rupeeValue = amountToRedeem / CONFIG.COIN_TO_RUPEE_RATIO;

    // In a real scenario:
    // 1. Deduct coins from loyalty_ledger
    // 2. Add rupees to wallet_balance
    // await query('BEGIN');
    // ... logic ...
    // await query('COMMIT');

    res.json({
      success: true,
      message: `Successfully redeemed ${amountToRedeem} coins for ₹${rupeeValue} Wallet Balance.`,
      addedWalletBalance: rupeeValue
    });
  } catch (error) {
    next(error);
  }
};
