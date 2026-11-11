/**
 * A customer's notification settings (C13), read when a notification is sent.
 *
 *   orderUpdates  order updates by push and email (always kept in the inbox)
 *   promotions    offers and promotions at all
 *   push          anything pushed to a phone
 *   email         anything e-mailed
 *
 * Every setting is on until the customer turns it off (no row = defaults).
 */
const { query, queryOne } = require('../config/database');

const DEFAULTS = Object.freeze({ orderUpdates: true, promotions: true, push: true, email: true });
const COLUMNS = { orderUpdates: 'order_updates', promotions: 'promotions', push: 'push_enabled', email: 'email_enabled' };
const PROMOTIONAL = new Set(['promotion', 'flash_sale']);
const ORDER = new Set(['order_update', 'return_update', 'dispute_update']);

const on = (v) => !(v === 0 || v === '0' || v === false || v === 'false');

async function get(userId) {
  if (!userId) return { ...DEFAULTS };
  const row = await queryOne('SELECT * FROM notification_preferences WHERE user_id = $1', [String(userId)]);
  if (!row) return { ...DEFAULTS };
  return Object.fromEntries(Object.entries(COLUMNS).map(([key, col]) => [key, on(row[col])]));
}

/** Saves the settings given (others unchanged) and returns them all. */
async function set(userId, changes) {
  const next = { ...(await get(userId)) };
  for (const key of Object.keys(COLUMNS)) {
    if (changes && Object.prototype.hasOwnProperty.call(changes, key)) next[key] = Boolean(changes[key]);
  }
  const values = Object.keys(COLUMNS).map((key) => (next[key] ? 1 : 0));
  await query(
    `INSERT INTO notification_preferences (user_id, order_updates, promotions, push_enabled, email_enabled, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id) DO UPDATE SET order_updates = excluded.order_updates, promotions = excluded.promotions,
       push_enabled = excluded.push_enabled, email_enabled = excluded.email_enabled, updated_at = excluded.updated_at`,
    [String(userId), ...values, new Date().toISOString()]
  );
  return next;
}

/**
 * Whether a notification of this type may go out on this channel
 * ('inbox', 'push' or 'email') under these settings.
 */
function allows(prefs, type, channel) {
  const p = prefs || DEFAULTS;
  const t = String(type || 'system');
  if (PROMOTIONAL.has(t) && !p.promotions) return false;
  if (channel === 'inbox') return true;
  if (channel === 'push' && !p.push) return false;
  if (channel === 'email' && !p.email) return false;
  if (ORDER.has(t) && !p.orderUpdates) return false;
  return true;
}

module.exports = { get, set, allows, DEFAULTS, COLUMNS };
