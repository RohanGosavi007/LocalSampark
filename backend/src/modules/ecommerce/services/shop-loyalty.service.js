const { queryOne, queryMany, withTransaction } = require('../../../config/database');

// Falls back to these when a shop has not configured a programme of its own.
const DEFAULT_PROGRAM = {
  is_enabled: true,
  points_per_hundred: 5,
  point_value: 1.0,
  min_order_amount: 0,
  min_redeem_points: 100,
  welcome_bonus: 0,
  points_expire_days: null,
};

async function getProgram(shopId) {
  const row = await queryOne('SELECT * FROM shop_loyalty_programs WHERE shop_id = $1', [shopId]);
  return row || { shop_id: shopId, ...DEFAULT_PROGRAM };
}

async function getAccount(shopId, userId) {
  return queryOne(
    'SELECT * FROM shop_loyalty_accounts WHERE shop_id = $1 AND user_id = $2',
    [shopId, userId]
  );
}

/**
 * A customer's standing at one shop, plus their recent ledger entries.
 * Returns a zeroed summary rather than null when the customer has never
 * earned here, so the shop page can render without special-casing.
 */
async function getSummary(shopId, userId) {
  const [program, account] = await Promise.all([getProgram(shopId), getAccount(shopId, userId)]);

  if (!account) {
    return {
      points: 0,
      streak: 0,
      longestStreak: 0,
      lifetimePoints: 0,
      redeemableValue: 0,
      program: publicProgram(program),
      history: [],
    };
  }

  const history = await queryMany(
    `SELECT id, points, kind, order_id, description, created_at
       FROM shop_loyalty_transactions
      WHERE account_id = $1
      ORDER BY created_at DESC
      LIMIT 20`,
    [account.id]
  );

  return {
    // The shop page reads `points` and `streak`; the rest is additive.
    points: account.points_balance,
    streak: account.current_streak,
    longestStreak: account.longest_streak,
    lifetimePoints: account.lifetime_points,
    redeemableValue: Number((account.points_balance * Number(program.point_value)).toFixed(2)),
    program: publicProgram(program),
    history,
  };
}

function publicProgram(program) {
  return {
    enabled: program.is_enabled !== false,
    pointsPerHundred: program.points_per_hundred,
    pointValue: Number(program.point_value),
    minOrderAmount: Number(program.min_order_amount),
    minRedeemPoints: program.min_redeem_points,
  };
}

/**
 * Post a ledger entry and move the account balance in the same transaction, so
 * the ledger and the balance cannot drift apart.
 */
async function post({ shopId, userId, points, kind, orderId = null, description = null, expiresAt = null }) {
  if (!Number.isInteger(points) || points === 0) {
    throw Object.assign(new Error('points must be a non-zero integer'), { status: 400 });
  }

  return withTransaction(async (client) => {
    const existing = await client.query(
      `SELECT id, points_balance FROM shop_loyalty_accounts
        WHERE shop_id = $1 AND user_id = $2
        FOR UPDATE`,
      [shopId, userId]
    );

    let accountId;
    let balance;

    if (existing.rows.length === 0) {
      const created = await client.query(
        `INSERT INTO shop_loyalty_accounts (shop_id, user_id, points_balance, lifetime_points)
         VALUES ($1, $2, 0, 0)
         RETURNING id, points_balance`,
        [shopId, userId]
      );
      accountId = created.rows[0].id;
      balance = 0;
    } else {
      accountId = existing.rows[0].id;
      balance = existing.rows[0].points_balance;
    }

    if (balance + points < 0) {
      throw Object.assign(new Error('Insufficient loyalty points'), { status: 400 });
    }

    await client.query(
      `INSERT INTO shop_loyalty_transactions
         (account_id, shop_id, user_id, points, kind, order_id, description, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [accountId, shopId, userId, points, kind, orderId, description, expiresAt]
    );

    await client.query(
      `UPDATE shop_loyalty_accounts
          SET points_balance  = points_balance + $1,
              lifetime_points = lifetime_points + GREATEST($1, 0),
              updated_at      = CURRENT_TIMESTAMP
        WHERE id = $2`,
      [points, accountId]
    );

    return { accountId, balance: balance + points };
  });
}

/**
 * Award points for a completed order and advance the visit streak.
 * Safe to call more than once for the same order: the unique index on
 * (order_id) for earn rows makes a repeat a no-op.
 */
async function awardForOrder({ shopId, userId, orderTotal, orderId }) {
  const program = await getProgram(shopId);
  if (program.is_enabled === false) return null;
  if (Number(orderTotal) < Number(program.min_order_amount)) return null;

  const points = Math.floor((Number(orderTotal) / 100) * program.points_per_hundred);
  if (points <= 0) return null;

  const expiresAt = program.points_expire_days
    ? new Date(Date.now() + program.points_expire_days * 86400000)
    : null;

  try {
    const result = await post({
      shopId,
      userId,
      points,
      kind: 'earn',
      orderId,
      description: `Earned on order ${orderId}`,
      expiresAt,
    });
    await advanceStreak(shopId, userId);
    return result;
  } catch (err) {
    // Unique violation means this order was already credited.
    if (err.code === '23505') return null;
    throw err;
  }
}

async function advanceStreak(shopId, userId) {
  await withTransaction(async (client) => {
    const res = await client.query(
      `SELECT id, current_streak, longest_streak, last_order_date
         FROM shop_loyalty_accounts
        WHERE shop_id = $1 AND user_id = $2
        FOR UPDATE`,
      [shopId, userId]
    );
    if (res.rows.length === 0) return;

    const acc = res.rows[0];
    const today = new Date();
    const last = acc.last_order_date ? new Date(acc.last_order_date) : null;

    let streak = 1;
    if (last) {
      const days = Math.floor((today - last) / 86400000);
      if (days === 0) return;          // already counted today
      if (days === 1) streak = acc.current_streak + 1;
    }

    await client.query(
      `UPDATE shop_loyalty_accounts
          SET current_streak  = $1,
              longest_streak  = GREATEST(longest_streak, $1),
              last_order_date = CURRENT_DATE,
              updated_at      = CURRENT_TIMESTAMP
        WHERE id = $2`,
      [streak, acc.id]
    );
  });
}

async function redeem({ shopId, userId, points }) {
  const program = await getProgram(shopId);
  if (program.is_enabled === false) {
    throw Object.assign(new Error('This shop is not running a loyalty programme'), { status: 400 });
  }
  if (points < program.min_redeem_points) {
    throw Object.assign(
      new Error(`Minimum redemption is ${program.min_redeem_points} points`),
      { status: 400 }
    );
  }

  const result = await post({
    shopId,
    userId,
    points: -Math.abs(points),
    kind: 'redeem',
    description: `Redeemed ${points} points`,
  });

  return {
    ...result,
    value: Number((points * Number(program.point_value)).toFixed(2)),
  };
}

module.exports = {
  getProgram,
  getAccount,
  getSummary,
  post,
  awardForOrder,
  redeem,
  DEFAULT_PROGRAM,
};
