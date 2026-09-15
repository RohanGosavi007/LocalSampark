/**
 * Contextual multi-armed bandit (LinUCB, disjoint) for home-feed layout.
 *
 * Each home-screen module is an arm. For every arm a the policy maintains a
 * d×d matrix A_a and a d-vector b_a, and for a context x:
 *
 *   theta_a = A_a^-1 · b_a                        ridge-regression coefficients
 *   p_a     = theta_a'x + alpha·sqrt(x' A_a^-1 x) upper confidence bound
 *
 * The second term is the width of the confidence interval around the predicted
 * reward: large when this arm has seen little data resembling x, small once it
 * has. So exploration is not a fixed epsilon sprayed at random — the policy
 * explores precisely where it is uncertain, and stops exploring an arm once it
 * knows the answer for that kind of user. That is the property that makes this
 * worth the matrix arithmetic over a simpler A/B split.
 *
 * "Disjoint" means each arm has its own parameters with no shared features.
 * With six arms and a ten-dimensional context that is the right call: hybrid
 * LinUCB shares strength across arms, which helps when arms are many and data
 * is thin per arm, but it also couples them — one arm's updates move another's
 * predictions, and debugging that is considerably harder than it is worth here.
 *
 * Linear algebra is implemented in this file rather than pulled from a library.
 * d is 10, so A is 10×10; Gauss-Jordan inversion on that is microseconds, and a
 * matrix package would be a dependency, a bundle cost and a supply-chain
 * surface for thirty lines of arithmetic.
 */

const crypto = require('crypto');
const { query } = require('../../../config/database');
const logger = require('../../../config/logger');

/** Home-screen modules the policy can order. */
const ARMS = Object.freeze([
  'NearbyShops',
  'EmergencyServices',
  'CarpoolCommute',
  'FreshMarketplace',
  'LocalJobs',
  'SocietyAlerts',
]);

const POLICY = 'home_layout';

/**
 * Context feature layout. The order is the contract between the encoder and
 * every stored matrix — changing it invalidates them, which is why `dimension`
 * is recorded on each row and a mismatch resets the arm rather than silently
 * multiplying matrices that mean different things.
 *
 *   0  bias
 *   1  morning      (05:00–11:00)
 *   2  midday       (11:00–16:00)
 *   3  evening      (16:00–21:00)
 *   4  night        (21:00–05:00)
 *   5  weekend
 *   6  tenure       log-scaled account age
 *   7  pincode hash stable scalar in [0,1]
 *   8  affinity     recent affinity for this arm's category
 *   9  session depth
 */
const DIMENSION = 10;

// ─── Linear algebra ──────────────────────────────────────────────────────────

function identity(d, scale = 1) {
  const m = [];
  for (let i = 0; i < d; i += 1) {
    m.push(new Array(d).fill(0));
    m[i][i] = scale;
  }
  return m;
}

/**
 * Gauss-Jordan inversion with partial pivoting.
 *
 * Partial pivoting is not optional here: without it a zero on the diagonal —
 * which happens whenever an arm has seen no variation in some feature — divides
 * by zero and fills the matrix with NaN, and a NaN score sorts unpredictably
 * rather than failing. Returns null if the matrix is singular, and the caller
 * falls back.
 */
function invert(matrix) {
  const d = matrix.length;
  const a = matrix.map((row) => row.slice());
  const inv = identity(d);

  for (let col = 0; col < d; col += 1) {
    let pivot = col;
    for (let r = col + 1; r < d; r += 1) {
      if (Math.abs(a[r][col]) > Math.abs(a[pivot][col])) pivot = r;
    }
    if (Math.abs(a[pivot][col]) < 1e-12) return null; // singular

    if (pivot !== col) {
      [a[col], a[pivot]] = [a[pivot], a[col]];
      [inv[col], inv[pivot]] = [inv[pivot], inv[col]];
    }

    const p = a[col][col];
    for (let j = 0; j < d; j += 1) {
      a[col][j] /= p;
      inv[col][j] /= p;
    }

    for (let r = 0; r < d; r += 1) {
      if (r === col) continue;
      const factor = a[r][col];
      if (factor === 0) continue;
      for (let j = 0; j < d; j += 1) {
        a[r][j] -= factor * a[col][j];
        inv[r][j] -= factor * inv[col][j];
      }
    }
  }
  return inv;
}

/** matrix · vector */
function matVec(m, v) {
  return m.map((row) => row.reduce((sum, x, j) => sum + x * v[j], 0));
}

/** a · b */
function dot(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) sum += a[i] * b[i];
  return sum;
}

/** x' M x — the quadratic form behind the confidence width. */
function quadratic(m, v) {
  return dot(v, matVec(m, v));
}

/** Rank-one update A += x x' */
function addOuterProduct(m, v) {
  for (let i = 0; i < v.length; i += 1) {
    for (let j = 0; j < v.length; j += 1) m[i][j] += v[i] * v[j];
  }
  return m;
}

// ─── Context encoding ────────────────────────────────────────────────────────

/** Stable scalar in [0,1] from a string, so a pincode is a usable feature. */
function hashUnit(value) {
  if (!value) return 0;
  const h = crypto.createHash('sha256').update(String(value)).digest();
  return h.readUInt32BE(0) / 0xffffffff;
}

/**
 * Builds the context vector.
 *
 * Every component is bounded in [0,1]. Unbounded features would let one of them
 * dominate the quadratic form and make the confidence width meaningless — the
 * usual symptom being that the policy stops exploring entirely because one
 * feature's scale swamps the rest.
 */
function encodeContext({
  localHour = null,
  dayOfWeek = null,
  tenureDays = 0,
  pincode = null,
  categoryAffinity = {},
  sessionDepth = 0,
  arm = null,
} = {}) {
  const x = new Array(DIMENSION).fill(0);

  x[0] = 1; // bias

  const hour = Number.isInteger(localHour) ? localHour : new Date().getHours();
  if (hour >= 5 && hour < 11) x[1] = 1;
  else if (hour >= 11 && hour < 16) x[2] = 1;
  else if (hour >= 16 && hour < 21) x[3] = 1;
  else x[4] = 1;

  const dow = Number.isInteger(dayOfWeek) ? dayOfWeek : new Date().getDay();
  x[5] = dow === 0 || dow === 6 ? 1 : 0;

  // Log-scaled and saturating: the difference between day 1 and day 30 matters,
  // between day 400 and day 430 does not.
  const tenure = Math.max(Number(tenureDays) || 0, 0);
  x[6] = Math.min(Math.log1p(tenure) / Math.log1p(365), 1);

  x[7] = hashUnit(pincode);

  // Affinity for the category this arm surfaces, already normalised 0..1 by the
  // caller. Absent means no signal, which is 0 — not 0.5, which would assert
  // average interest the data does not support.
  x[8] = arm && categoryAffinity ? Math.min(Math.max(Number(categoryAffinity[arm]) || 0, 0), 1) : 0;

  x[9] = Math.min(Math.max(Number(sessionDepth) || 0, 0) / 20, 1);

  return x;
}

// ─── Persistence ─────────────────────────────────────────────────────────────

function serialise(matrixOrVector) {
  return JSON.stringify(matrixOrVector);
}

function deserialise(text, fallback) {
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Loads every arm for a scope, creating any that are missing.
 *
 * A stored matrix whose dimension does not match the current encoder is reset
 * to the ridge prior rather than used: the numbers in it were fitted against a
 * different feature layout and mean nothing under the new one.
 */
async function loadArms(regionId, ridge) {
  const arms = new Map();

  let rows = [];
  try {
    const res = await query(
      regionId
        ? 'SELECT * FROM ml_bandit_arms WHERE policy = $1 AND region_id = $2'
        : 'SELECT * FROM ml_bandit_arms WHERE policy = $1 AND region_id IS NULL',
      regionId ? [POLICY, regionId] : [POLICY]
    );
    rows = res.rows || res || [];
  } catch (err) {
    logger.warn('Bandit state unavailable, using fresh priors: ' + err.message);
  }

  const byArm = new Map(rows.map((r) => [r.arm, r]));

  for (const arm of ARMS) {
    const row = byArm.get(arm);
    const fresh = () => ({
      arm,
      A: identity(DIMENSION, ridge),
      b: new Array(DIMENSION).fill(0),
      pulls: 0,
      rewards: 0,
      isNew: true,
    });

    if (!row || Number(row.dimension) !== DIMENSION) {
      arms.set(arm, fresh());
      continue;
    }

    const A = deserialise(row.a_matrix, null);
    const b = deserialise(row.b_vector, null);
    if (!A || A.length !== DIMENSION || !b || b.length !== DIMENSION) {
      arms.set(arm, fresh());
      continue;
    }

    arms.set(arm, {
      arm,
      A,
      b,
      pulls: Number(row.pulls) || 0,
      rewards: Number(row.rewards) || 0,
      isNew: false,
    });
  }

  return arms;
}

/**
 * Writes one arm's state.
 *
 * UPDATE first, INSERT only if nothing was updated, and fall back to UPDATE
 * again if the INSERT loses a race. A plain SELECT-then-INSERT is wrong here:
 * rewards arrive concurrently — an impression fires one per module — and two
 * callers that both find no row both insert, with the second violating the
 * unique index. That surfaced immediately under a burst of 25 rewards.
 *
 * The retry is a portable substitute for an upsert. `ON CONFLICT DO UPDATE`
 * would need the conflict target spelled as the expression the unique index is
 * built on, and that expression differs between the Postgres and SQLite
 * migrations.
 */
async function persistArm(regionId, state) {
  const updateSql = regionId
    ? `UPDATE ml_bandit_arms
          SET a_matrix = $1, b_vector = $2, pulls = $3, rewards = $4,
              dimension = $5, updated_at = CURRENT_TIMESTAMP
        WHERE policy = $6 AND arm = $7 AND region_id = $8`
    : `UPDATE ml_bandit_arms
          SET a_matrix = $1, b_vector = $2, pulls = $3, rewards = $4,
              dimension = $5, updated_at = CURRENT_TIMESTAMP
        WHERE policy = $6 AND arm = $7 AND region_id IS NULL`;

  const updateParams = [
    serialise(state.A), serialise(state.b), state.pulls, state.rewards, DIMENSION,
    POLICY, state.arm,
  ];
  if (regionId) updateParams.push(regionId);

  const updated = await query(updateSql, updateParams);
  // Drivers disagree on the shape of an UPDATE result, so existence is checked
  // rather than a row count inferred from one of them.
  const changed = Number(
    updated && (updated.rowCount ?? updated.changes ?? (updated.rows ? updated.rows.length : 0))
  );
  if (changed > 0) return;

  try {
    await query(
      `INSERT INTO ml_bandit_arms (id, policy, arm, region_id, dimension, a_matrix, b_vector, pulls, rewards)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [crypto.randomUUID(), POLICY, state.arm, regionId, DIMENSION,
        serialise(state.A), serialise(state.b), state.pulls, state.rewards]
    );
  } catch (err) {
    // Another caller inserted between the UPDATE and the INSERT. Its row is now
    // there, so the update that just missed can be applied to it.
    if (!/unique|constraint/i.test(err.message || '')) throw err;
    await query(updateSql, updateParams);
  }
}

/**
 * Per-arm serialisation of read-modify-write.
 *
 * Fixing the insert race alone would still lose updates: two concurrent rewards
 * for one arm both read A, both add their own outer product, and whichever
 * writes second discards the other's observation. The matrix is not a counter
 * that can be incremented in SQL — the update is a rank-one matrix addition —
 * so the read and the write have to be atomic with respect to each other.
 *
 * Queued per (policy, arm, region) rather than globally, so rewards for
 * different modules still proceed in parallel. Within one process only: two
 * instances can still interleave, which costs an occasional observation and is
 * an acceptable trade against putting a distributed lock on an impression path.
 */
const armQueues = new Map();

function withArmLock(key, fn) {
  const previous = armQueues.get(key) || Promise.resolve();
  // The chain must not break on a rejection, or one failed update would wedge
  // that arm for the lifetime of the process.
  const next = previous.then(fn, fn);
  armQueues.set(key, next.then(() => {}, () => {}));
  return next;
}

// ─── Policy ──────────────────────────────────────────────────────────────────

/**
 * Orders the home modules for one context.
 *
 * Returns { layout, scores, strategy }. `strategy` is 'linucb' or 'default';
 * the default order is the deterministic fallback and is what every failure
 * path returns, so it is exercised constantly rather than rotting.
 */
async function selectLayout(context = {}, { cfg = {}, regionId = null } = {}) {
  const started = Date.now();

  const enabled = cfg.ml_bandit_enabled === true;
  if (!enabled) {
    return { layout: [...ARMS], scores: [], strategy: 'default', reason: 'disabled', took_ms: 0 };
  }

  try {
    const alpha = Math.min(Math.max(Number(cfg.ml_bandit_alpha) || 1, 0), 10);
    const ridge = Math.min(Math.max(Number(cfg.ml_bandit_ridge) || 1, 1e-3), 100);

    const arms = await loadArms(regionId, ridge);
    const scores = [];

    for (const arm of ARMS) {
      const state = arms.get(arm);
      const x = encodeContext({ ...context, arm });

      const Ainv = invert(state.A);
      if (!Ainv) {
        // Singular despite the ridge prior. Score it as pure exploration rather
        // than dropping the arm: an arm that cannot be evaluated is exactly the
        // one worth showing.
        scores.push({ arm, ucb: Number.POSITIVE_INFINITY, mean: 0, width: Infinity, pulls: state.pulls });
        continue;
      }

      const theta = matVec(Ainv, state.b);
      const mean = dot(theta, x);
      const variance = Math.max(quadratic(Ainv, x), 0);
      const width = alpha * Math.sqrt(variance);

      scores.push({
        arm,
        ucb: mean + width,
        mean,
        width,
        pulls: state.pulls,
      });
    }

    scores.sort((a, b) => b.ucb - a.ucb);

    return {
      layout: scores.map((s) => s.arm),
      scores,
      strategy: 'linucb',
      took_ms: Date.now() - started,
    };
  } catch (err) {
    logger.error('Bandit layout selection failed, serving default order: ' + err.message);
    return { layout: [...ARMS], scores: [], strategy: 'default', reason: 'error', took_ms: Date.now() - started };
  }
}

/**
 * Records the outcome of showing an arm.
 *
 *   A += x x'      b += r x
 *
 * Reward is clamped to [0,1]. LinUCB's regret bound assumes bounded rewards,
 * and an unbounded one — a session length in seconds, say — would make the
 * confidence widths meaningless within a handful of updates.
 *
 * Deliberately not awaited by the request path. This is a write triggered by an
 * impression, and the brief's constraint is explicit: no blocking ML work in
 * operational queries.
 */
async function recordReward({ arm, context = {}, reward = 0, regionId = null, cfg = {} }) {
  if (!ARMS.includes(arm)) return { updated: false, reason: 'unknown_arm' };

  // Serialised per arm: the read, the matrix update and the write are one
  // critical section. See withArmLock.
  return withArmLock(`${POLICY}:${arm}:${regionId || ''}`, async () => {
  try {
    const ridge = Math.min(Math.max(Number(cfg.ml_bandit_ridge) || 1, 1e-3), 100);
    const arms = await loadArms(regionId, ridge);
    const state = arms.get(arm);
    if (!state) return { updated: false, reason: 'no_state' };

    const x = encodeContext({ ...context, arm });
    const r = Math.min(Math.max(Number(reward) || 0, 0), 1);

    addOuterProduct(state.A, x);
    for (let i = 0; i < DIMENSION; i += 1) state.b[i] += r * x[i];
    state.pulls += 1;
    state.rewards += r;

    await persistArm(regionId, state);
    return { updated: true, arm, reward: r, pulls: state.pulls };
  } catch (err) {
    // A lost update costs the policy one observation. Failing the caller would
    // cost a rendered home screen.
    logger.warn('Bandit reward update failed: ' + err.message);
    return { updated: false, reason: 'error' };
  }
  });
}

/** Arm statistics for the admin console. */
async function stats(regionId = null) {
  try {
    const arms = await loadArms(regionId, 1);
    return ARMS.map((arm) => {
      const s = arms.get(arm);
      return {
        arm,
        pulls: s.pulls,
        total_reward: s.rewards,
        // null, not 0, when an arm has never been shown: "no data" and "never
        // rewarded" are different facts.
        mean_reward: s.pulls > 0 ? s.rewards / s.pulls : null,
        initialised: !s.isNew,
      };
    });
  } catch (err) {
    logger.warn('Bandit stats failed: ' + err.message);
    return ARMS.map((arm) => ({ arm, pulls: 0, total_reward: 0, mean_reward: null, initialised: false }));
  }
}

/** Clears learned state for a scope. Used by the admin reset control. */
async function reset(regionId = null) {
  await query(
    regionId
      ? 'DELETE FROM ml_bandit_arms WHERE policy = $1 AND region_id = $2'
      : 'DELETE FROM ml_bandit_arms WHERE policy = $1 AND region_id IS NULL',
    regionId ? [POLICY, regionId] : [POLICY]
  );
  return { reset: true, policy: POLICY, region_id: regionId };
}

module.exports = {
  selectLayout,
  recordReward,
  stats,
  reset,
  encodeContext,
  invert,
  matVec,
  dot,
  quadratic,
  addOuterProduct,
  identity,
  ARMS,
  DIMENSION,
  POLICY,
};
