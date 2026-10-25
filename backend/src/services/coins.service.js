/**
 * SamparkCoins: one balance per user, one ledger.
 *
 * There were three, and none of them agreed:
 *
 *   loyalty_accounts.sampark_coins_balance + loyalty_transactions
 *       what the apps show (GET /loyalty/balance), what checkout spends and
 *       what the wheel and redemption use.
 *   reward_coins_ledger
 *       where referral, scrap-donation, volunteering and blood-donor rewards
 *       were written. Nothing added them to the balance above, so a user
 *       earned coins they could never see or spend.
 *   loyalty_wallets.total_coins
 *       what lost-and-found bounties, the garage sale, event tickets, home-chef
 *       meals, equipment deposits and volunteering spent from. Nothing ever
 *       created a row in it, so every one of those purchases failed with "not
 *       enough coins" — and the lost-and-found bounty took any number, so a
 *       negative bounty *added* coins.
 *
 * Everything now goes through this module, on the first pair. Migration 123
 * carries the other two tables' balances across.
 *
 * Amounts are whole coins, more than zero. A debit is a single UPDATE whose
 * WHERE clause checks the balance, so two spends at once cannot both pass a
 * check against the same balance. Pass `client` to make a movement part of a
 * caller's transaction.
 */

const crypto = require('crypto');
const { withTransaction, queryOne } = require('../config/database');

const MAX_AMOUNT = 1000000;

class CoinError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'CoinError';
    this.status = status;
    this.code = code;
  }
}

/** A whole number of coins from 1 to MAX_AMOUNT, or a CoinError. */
function coins(amount) {
  const n = Number(amount);
  if (!Number.isInteger(n) || n < 1 || n > MAX_AMOUNT) {
    throw new CoinError(400, 'INVALID_COINS', `Coins must be a whole number from 1 to ${MAX_AMOUNT}.`);
  }
  return n;
}

const run = (client, work) => (client ? work(client) : withTransaction(work));

async function ensureAccount(c, userId) {
  await c.query(
    'INSERT INTO loyalty_accounts (user_id, sampark_coins_balance) VALUES ($1, 0) ON CONFLICT (user_id) DO NOTHING',
    [String(userId)]
  );
}

async function record(c, userId, amount, type, reason, referenceId) {
  await c.query(
    `INSERT INTO loyalty_transactions (id, user_id, amount, transaction_type, reference_id, description)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [crypto.randomUUID(), String(userId), amount, type, referenceId ? String(referenceId).slice(0, 100) : null, String(reason).slice(0, 200)]
  );
}

/** The user's balance; 0 if they have never had coins. */
async function balance(userId, client = null) {
  if (client) {
    const row = (await client.query('SELECT sampark_coins_balance FROM loyalty_accounts WHERE user_id = $1', [String(userId)])).rows[0];
    return Number(row && row.sampark_coins_balance) || 0;
  }
  const row = await queryOne('SELECT sampark_coins_balance FROM loyalty_accounts WHERE user_id = $1', [String(userId)]);
  return Number(row && row.sampark_coins_balance) || 0;
}

/** Adds coins. Returns the amount credited. */
async function credit({ userId, amount, reason, referenceId = null, client = null }) {
  const n = coins(amount);
  return run(client, async (c) => {
    await ensureAccount(c, userId);
    await c.query(
      'UPDATE loyalty_accounts SET sampark_coins_balance = COALESCE(sampark_coins_balance, 0) + $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
      [n, String(userId)]
    );
    await record(c, userId, n, 'earned', reason, referenceId);
    return n;
  });
}

/** Takes coins, or throws CoinError 402 and takes nothing. Returns the amount debited. */
async function debit({ userId, amount, reason, referenceId = null, client = null }) {
  const n = coins(amount);
  return run(client, async (c) => {
    const taken = await c.query(
      'UPDATE loyalty_accounts SET sampark_coins_balance = sampark_coins_balance - $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 AND sampark_coins_balance >= $1',
      [n, String(userId)]
    );
    if (!taken.rowCount) {
      throw new CoinError(402, 'INSUFFICIENT_COINS', `You need ${n} SamparkCoins for this.`);
    }
    await record(c, userId, n, 'spent', reason, referenceId);
    return n;
  });
}

/** Moves coins from one user to another, both or neither. */
async function transfer({ fromUserId, toUserId, amount, reason, referenceId = null, client = null }) {
  if (String(fromUserId) === String(toUserId)) throw new CoinError(400, 'SAME_ACCOUNT', 'Coins cannot be sent to the same account.');
  const n = coins(amount);
  return run(client, async (c) => {
    await debit({ userId: fromUserId, amount: n, reason, referenceId, client: c });
    await credit({ userId: toUserId, amount: n, reason, referenceId, client: c });
    return n;
  });
}

/** Sends a CoinError as a response; returns false for any other error. */
function sendCoinError(res, error) {
  if (!(error instanceof CoinError)) return false;
  res.status(error.status).json({ success: false, code: error.code, error: error.message });
  return true;
}

module.exports = { CoinError, coins, balance, credit, debit, transfer, sendCoinError, MAX_AMOUNT };
