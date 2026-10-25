const crypto = require('crypto');
const { query, queryOne, withTransaction } = require('../../../config/database');
const coins = require('../../../services/coins.service');
const payments = require('../../../services/payments.service');

/**
 * SamparkCoins.
 *
 * Every handler in this file used to be a stub that returned invented numbers,
 * each admitting as much in its own comments ("For now, mock a response for the
 * frontend", "Log transaction to DB in real scenario"):
 *
 *  - getLoyaltyBalance returned a flat 450 coins and two fabricated entries —
 *    "Order Placement +50" and "Referral Bonus +400" — to every user who asked,
 *    regardless of what they had actually earned.
 *  - spinFortuneWheel picked a random prize, told the user "Congratulations!
 *    You won 500 SamparkCoins!", and wrote nothing. The coins never existed.
 *  - redeemCoins reported a successful redemption, deducted nothing, and
 *    credited nothing to the wallet. A user could "redeem" the same balance
 *    forever and never receive a rupee.
 *
 * loyalty_accounts and loyalty_transactions have existed since migration 010,
 * and the batch-checkout handler already reads and writes them. These now use
 * the same tables, so a balance shown here is a balance the ledger backs.
 */

const CONFIG = {
  // 100 coins = ₹10, so one coin is ₹0.10.
  COIN_TO_RUPEE_RATIO: 100 / 10,
  MIN_REDEEM_COINS: 100,
  // One spin per calendar day per user.
  SPIN_PRIZES: [0, 10, 20, 50, 100, 500],
};

const useSqlite = process.env.USE_SQLITE === 'true';
const NOW = useSqlite ? 'CURRENT_TIMESTAMP' : 'NOW()';

async function getBalance(userId) {
  const row = await queryOne(
    'SELECT sampark_coins_balance FROM loyalty_accounts WHERE user_id = $1',
    [userId]
  );
  return Number(row?.sampark_coins_balance ?? 0);
}

/** Create the account row on first touch so callers never handle a missing row. */
async function ensureAccount(userId) {
  await query(
    `INSERT INTO loyalty_accounts (user_id, sampark_coins_balance)
     VALUES ($1, 0)
     ON CONFLICT (user_id) DO NOTHING`,
    [userId]
  );
}

exports.getLoyaltyBalance = async (req, res, next) => {
  try {
    const userId = req.user.id;
    await ensureAccount(userId);

    const totalCoins = await getBalance(userId);

    const history = await query(
      `SELECT id, amount, transaction_type, description, created_at
         FROM loyalty_transactions
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 20`,
      [userId]
    );

    const rows = history.rows || history || [];

    res.json({
      success: true,
      data: {
        userId,
        totalCoins,
        equivalentRupees: totalCoins / CONFIG.COIN_TO_RUPEE_RATIO,
        // An empty history is returned as an empty array. It used to be
        // backfilled with two invented entries, so a brand-new account looked
        // like it had already been earning.
        recentTransactions: rows.map((t) => ({
          id: t.id,
          date: t.created_at,
          type: t.transaction_type,
          source: t.description || t.transaction_type,
          amount: Number(t.amount) || 0,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.spinFortuneWheel = async (req, res, next) => {
  try {
    const userId = req.user.id;
    await ensureAccount(userId);

    // One spin per user per UTC day, enforced by the database: the spin row
    // carries reference_id 'spin:<date>' and a unique index (migration 123)
    // admits one per user. The check here used to be a read followed by a
    // write, so a burst of requests could all pass it and all win.
    const day = new Date().toISOString().slice(0, 10);
    const wonCoins = CONFIG.SPIN_PRIZES[crypto.randomInt(CONFIG.SPIN_PRIZES.length)];

    const won = await withTransaction(async (client) => {
      const spun = await client.query(
        `INSERT INTO loyalty_transactions (id, user_id, amount, transaction_type, reference_id, description)
         VALUES ($1, $2, $3, 'earned', $4, 'Fortune Wheel')
         ON CONFLICT DO NOTHING`,
        [crypto.randomUUID(), String(userId), wonCoins, `spin:${day}`]
      );
      if (!spun.rowCount) return null;
      if (wonCoins > 0) {
        await client.query(
          `UPDATE loyalty_accounts
              SET sampark_coins_balance = sampark_coins_balance + $1, updated_at = ${NOW}
            WHERE user_id = $2`,
          [wonCoins, String(userId)]
        );
      }
      return wonCoins;
    });

    if (won === null) {
      return res.status(429).json({
        success: false,
        error: 'You have already spun today. Come back tomorrow.',
      });
    }

    res.json({
      success: true,
      message: won > 0
        ? `Congratulations! You won ${won} SamparkCoins!`
        : 'Better luck next time!',
      wonCoins: won,
      balance: await getBalance(userId),
    });
  } catch (error) {
    next(error);
  }
};

exports.redeemCoins = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const amountToRedeem = Math.floor(Number((req.body || {}).amountToRedeem));

    if (!Number.isFinite(amountToRedeem) || amountToRedeem < CONFIG.MIN_REDEEM_COINS) {
      return res.status(400).json({ error: `Minimum redemption is ${CONFIG.MIN_REDEEM_COINS} coins` });
    }

    const rupeeValue = amountToRedeem / CONFIG.COIN_TO_RUPEE_RATIO;

    // The coins and the wallet credit move together or not at all. They were
    // separate statements: a failure after the deduction lost the coins.
    try {
      await withTransaction(async (client) => {
        await coins.debit({ userId, amount: amountToRedeem, reason: `Redeemed for ₹${rupeeValue} wallet balance`, client });
        await payments.creditWallet({ userId, amount: rupeeValue, purpose: 'loyalty_redemption', client });
      });
    } catch (error) {
      if (error instanceof coins.CoinError && error.code === 'INSUFFICIENT_COINS') {
        return res.status(400).json({
          error: 'Not enough coins to redeem that amount',
          balance: await getBalance(userId),
        });
      }
      throw error;
    }

    res.json({
      success: true,
      message: `Successfully redeemed ${amountToRedeem} coins for ₹${rupeeValue} wallet balance.`,
      addedWalletBalance: rupeeValue,
      balance: await getBalance(userId),
    });
  } catch (error) {
    next(error);
  }
};
