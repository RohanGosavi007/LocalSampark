const crypto = require('crypto');
const { query, queryOne } = require('../../../config/database');

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

async function recordTransaction(userId, amount, type, description, referenceId = null) {
  await query(
    `INSERT INTO loyalty_transactions (id, user_id, amount, transaction_type, reference_id, description)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [crypto.randomUUID(), userId, amount, type, referenceId, description]
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

    // One spin per day. Without this the prize is unbounded: the old handler had
    // no limit at all, and once the award is actually persisted an unlimited
    // spin is an unlimited mint.
    const lastSpin = await queryOne(
      `SELECT created_at FROM loyalty_transactions
        WHERE user_id = $1 AND description = 'Fortune Wheel'
        ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    if (lastSpin?.created_at) {
      const last = new Date(lastSpin.created_at);
      const now = new Date();
      const sameDay =
        last.getUTCFullYear() === now.getUTCFullYear() &&
        last.getUTCMonth() === now.getUTCMonth() &&
        last.getUTCDate() === now.getUTCDate();
      if (sameDay) {
        return res.status(429).json({
          success: false,
          error: 'You have already spun today. Come back tomorrow.',
        });
      }
    }

    const wonCoins = CONFIG.SPIN_PRIZES[Math.floor(Math.random() * CONFIG.SPIN_PRIZES.length)];

    // A zero prize is still recorded, so the once-a-day check above sees it.
    await recordTransaction(userId, wonCoins, 'earned', 'Fortune Wheel');
    if (wonCoins > 0) {
      await query(
        `UPDATE loyalty_accounts
            SET sampark_coins_balance = sampark_coins_balance + $1, updated_at = ${NOW}
          WHERE user_id = $2`,
        [wonCoins, userId]
      );
    }

    res.json({
      success: true,
      message: wonCoins > 0
        ? `Congratulations! You won ${wonCoins} SamparkCoins!`
        : 'Better luck next time!',
      wonCoins,
      balance: await getBalance(userId),
    });
  } catch (error) {
    next(error);
  }
};

exports.redeemCoins = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const amountToRedeem = Math.floor(Number(req.body.amountToRedeem));

    if (!Number.isFinite(amountToRedeem) || amountToRedeem < CONFIG.MIN_REDEEM_COINS) {
      return res.status(400).json({ error: `Minimum redemption is ${CONFIG.MIN_REDEEM_COINS} coins` });
    }

    await ensureAccount(userId);

    // Deduct conditionally in a single statement so two concurrent redemptions
    // cannot both pass a read-then-write balance check.
    const deducted = await query(
      `UPDATE loyalty_accounts
          SET sampark_coins_balance = sampark_coins_balance - $1, updated_at = ${NOW}
        WHERE user_id = $2 AND sampark_coins_balance >= $1`,
      [amountToRedeem, userId]
    );

    const affected = deducted?.rowCount ?? deducted?.changes ?? 0;
    if (!affected) {
      return res.status(400).json({
        error: 'Not enough coins to redeem that amount',
        balance: await getBalance(userId),
      });
    }

    const rupeeValue = amountToRedeem / CONFIG.COIN_TO_RUPEE_RATIO;

    await recordTransaction(
      userId,
      amountToRedeem,
      'burned',
      `Redeemed for ₹${rupeeValue} wallet balance`
    );

    // Credit the wallet the redemption promised. The old handler returned
    // `addedWalletBalance` without ever touching a wallet.
    //
    // wallets.balance is a maintained column throughout this codebase (worker.js,
    // donations, events, commissions all move it directly) rather than being
    // derived from wallet_transactions, so both have to be written or the
    // spendable balance and the ledger disagree.
    let wallet = await queryOne('SELECT id FROM wallets WHERE user_id = $1 LIMIT 1', [userId]);
    if (!wallet) {
      const walletId = crypto.randomUUID();
      await query(
        'INSERT INTO wallets (id, user_id, balance) VALUES ($1, $2, 0)',
        [walletId, userId]
      );
      wallet = { id: walletId };
    }

    await query(
      `UPDATE wallets SET balance = balance + $1, updated_at = ${NOW} WHERE id = $2`,
      [rupeeValue, wallet.id]
    );

    await query(
      `INSERT INTO wallet_transactions (id, wallet_id, amount, transaction_type, purpose, status)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [crypto.randomUUID(), wallet.id, rupeeValue, 'credit', 'loyalty_redemption', 'completed']
    );

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
