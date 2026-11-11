/**
 * Idempotency-Key for placing orders (C8).
 *
 * Placing an order is not safe to repeat. A double tap on Pay, or a client that
 * retries after a timeout when the first request did reach the server, placed a
 * second order (and, for a wallet order, charged twice). A client now sends an
 * Idempotency-Key with each attempt; the server keeps the answer it gave under
 * (customer, route, key) for 24 hours:
 *
 *   same key, same request, answered     the stored answer again, marked
 *                                        Idempotent-Replayed: true
 *   same key, same request, in progress  409 IDEMPOTENCY_IN_PROGRESS
 *   same key, different request          422 IDEMPOTENCY_KEY_REUSED
 *   no key                               processed as before
 *
 * A server error (5xx) is not kept, so it can be retried with the same key.
 * Mount after `authenticate`: keys are scoped to the customer, so one
 * customer's key can never return another's order.
 */
const crypto = require('crypto');
const { query, queryOne } = require('../config/database');
const logger = require('../config/logger');

const KEY_PATTERN = /^[A-Za-z0-9_\-:.]{8,128}$/;
const TTL_MS = 24 * 60 * 60 * 1000;

/** JSON with sorted keys, so the same request always hashes the same. */
function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().filter((k) => value[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value === undefined ? null : value);
}

const hashRequest = (req) => crypto.createHash('sha256')
  .update(`${req.method} ${req.baseUrl}${req.path}\n${stable(req.body || {})}`)
  .digest('hex');

function idempotent(route) {
  return async function idempotency(req, res, next) {
    const key = req.get('Idempotency-Key');
    if (!key) return next();
    if (!KEY_PATTERN.test(key)) {
      return res.status(400).json({
        success: false,
        error: 'Idempotency-Key must be 8 to 128 letters, digits or - _ : .',
        code: 'BAD_IDEMPOTENCY_KEY',
      });
    }
    const userId = req.user && (req.user.id || req.user.userId);
    if (!userId) return next();

    const requestHash = hashRequest(req);
    const id = crypto.randomUUID();
    const now = new Date();
    try {
      // A key is good for a day; after that it may be used afresh.
      await query(
        'DELETE FROM idempotency_keys WHERE user_id = $1 AND route = $2 AND idem_key = $3 AND created_at < $4',
        [String(userId), route, key, new Date(now.getTime() - TTL_MS).toISOString()]
      );
      await query(
        `INSERT INTO idempotency_keys (id, user_id, route, idem_key, request_hash, status, created_at)
         VALUES ($1, $2, $3, $4, $5, 'in_progress', $6)
         ON CONFLICT (user_id, route, idem_key) DO NOTHING`,
        [id, String(userId), route, key, requestHash, now.toISOString()]
      );
      const row = await queryOne(
        'SELECT id, request_hash, status, response_status, response_body FROM idempotency_keys WHERE user_id = $1 AND route = $2 AND idem_key = $3',
        [String(userId), route, key]
      );

      if (row && row.id !== id) {
        if (row.request_hash !== requestHash) {
          return res.status(422).json({
            success: false,
            error: 'This Idempotency-Key was already used for a different request.',
            code: 'IDEMPOTENCY_KEY_REUSED',
          });
        }
        if (row.status !== 'done') {
          res.set('Retry-After', '2');
          return res.status(409).json({
            success: false,
            error: 'This order is still being placed. Please wait a moment.',
            code: 'IDEMPOTENCY_IN_PROGRESS',
          });
        }
        res.set('Idempotent-Replayed', 'true');
        let body = null;
        try { body = JSON.parse(row.response_body); } catch { body = null; }
        return res.status(Number(row.response_status) || 200).json(body);
      }
    } catch (error) {
      // The ledger is a guard, not the order: if it cannot be read, the
      // request is processed as one without a key rather than refused.
      logger.error(`[Idempotency] ${route}: ${error.message}`);
      return next();
    }

    let settled = false;
    const settle = async (status, body) => {
      if (settled) return;
      settled = true;
      try {
        if (status >= 500 || body === undefined) {
          await query('DELETE FROM idempotency_keys WHERE id = $1', [id]);
        } else {
          await query(
            `UPDATE idempotency_keys SET status = 'done', response_status = $1, response_body = $2, completed_at = $3 WHERE id = $4`,
            [status, JSON.stringify(body), new Date().toISOString(), id]
          );
        }
      } catch (error) {
        logger.error(`[Idempotency] ${route}: could not record the answer: ${error.message}`);
      }
    };

    // The answer is recorded before it is sent, so a retry that arrives the
    // moment the first response leaves is replayed, not told "in progress".
    const json = res.json.bind(res);
    res.json = (body) => {
      settle(res.statusCode, body).finally(() => json(body));
      return res;
    };
    // An answer that was not JSON (or none at all) is not replayable.
    res.on('finish', () => { settle(res.statusCode, undefined); });
    return next();
  };
}

module.exports = { idempotent, stable };
