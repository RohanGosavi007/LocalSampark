/**
 * Platform pricing configuration: every number that decides what a customer
 * pays, what a rider earns and what the platform keeps.
 *
 * These lived as literals wherever they were needed — a ₹30 delivery fee in
 * one checkout, ₹40 in another, ₹5 "platform fee" in a third, a 10% commission
 * read from a column that does not exist — and each client added its own on
 * top. Changing a price meant finding all of them, and they did not agree.
 *
 * They are now settings. Each has a default here and may be overridden by a
 * row in admin_config, which an administrator edits from the console
 * (GET/PUT /admin/pricing). Values are validated against the range declared
 * below on the way in and again on the way out, so a bad row in the table
 * cannot produce a negative fee or a 900% commission: it is ignored, and the
 * default applies.
 *
 * All money is in rupees; distances in kilometres.
 */

const { query, queryMany } = require('../config/database');

const number = (def, min, max, description, group) => ({ type: 'number', default: def, min, max, description, group });
const flag = (def, description, group) => ({ type: 'boolean', default: def, description, group });
const text = (def, pattern, description, group) => ({ type: 'text', default: def, pattern, description, group });

const SETTINGS = {
  // ── What the customer pays for delivery ──────────────────────────────────
  delivery_base_fee: number(20, 0, 500, 'Delivery charge covering the first delivery_base_distance_km', 'delivery'),
  delivery_base_distance_km: number(2, 0, 20, 'Distance covered by the base delivery charge', 'delivery'),
  delivery_per_km_fee: number(8, 0, 100, 'Charge for each kilometre beyond the base distance', 'delivery'),
  delivery_max_distance_km: number(10, 1, 100, 'Furthest a shop delivers; beyond this an order is pickup only', 'delivery'),
  delivery_max_fee: number(150, 0, 2000, 'Ceiling on the delivery charge, surge included', 'delivery'),
  delivery_road_factor: number(1.3, 1, 3, 'Road distance as a multiple of straight-line distance', 'delivery'),
  delivery_free_above: number(0, 0, 100000, 'Item total at or above which delivery is free (0 = never)', 'delivery'),
  delivery_extra_pickup_fee: number(10, 0, 200, 'Added per additional shop in a multi-shop order', 'delivery'),

  // ── Surge ────────────────────────────────────────────────────────────────
  delivery_surge_multiplier: number(1, 1, 3, 'Applied to the delivery charge now — raise it for rain, festivals, rider shortage', 'surge'),
  delivery_peak_hours: text('', /^(\d{1,2}-\d{1,2})(,\d{1,2}-\d{1,2})*$|^$/, 'Daily peak windows as hour ranges, e.g. 12-14,19-22 (empty = none)', 'surge'),
  delivery_peak_multiplier: number(1, 1, 3, 'Applied to the delivery charge during peak hours', 'surge'),
  delivery_surge_cap: number(2, 1, 3, 'Highest multiplier that surge and peak together may reach', 'surge'),

  // ── Other charges on an order ────────────────────────────────────────────
  platform_fee: number(5, 0, 100, 'Flat platform fee on every order', 'fees'),
  small_order_threshold: number(0, 0, 10000, 'Item total below which the small-order fee applies (0 = never)', 'fees'),
  small_order_fee: number(0, 0, 200, 'Fee added to an order below the small-order threshold', 'fees'),

  // ── What the rider earns ─────────────────────────────────────────────────
  rider_base_pay: number(20, 0, 500, 'Rider pay covering the first delivery_base_distance_km', 'rider'),
  rider_per_km_pay: number(7, 0, 100, 'Rider pay for each kilometre beyond the base distance', 'rider'),
  rider_cash_limit: number(3000, 0, 100000, 'Cash a rider may hold before taking another cash order', 'rider'),

  // ── Commission and settlement ────────────────────────────────────────────
  default_commission_percent: number(5, 0, 50, 'Commission on a shop with no rate of its own or its category', 'settlement'),
  gst_on_commission_percent: number(18, 0, 28, 'GST charged on the platform commission', 'settlement'),
    gateway_fee_percent: number(2, 0, 10, 'Payment gateway cost passed to the shop on orders paid online', 'settlement'),
  tds_on_sales_percent: number(0.1, 0, 5, 'Tax deducted at source on a shop\'s sales through the platform (s.194-O) — confirm with your accountant', 'settlement'),

  // ── Memberships ──────────────────────────────────────────────────────────
  samparkplus_free_delivery_above: number(500, 0, 100000, 'Item total at or above which a SamparkPlus member pays no delivery charge (0 = no such benefit)', 'plans'),
  samparkplus_price_monthly: number(99, 1, 5000, 'Price of one 30-day SamparkPlus membership, in rupees. Every screen reads this; none carries its own.', 'plans'),

  // ── Orders awaiting online payment ───────────────────────────────────────
  unpaid_order_expiry_minutes: number(30, 5, 1440, 'Minutes an order waits for its online payment before it is cancelled and its stock returned', 'orders'),

  // ── Cash on delivery ─────────────────────────────────────────────────────
  cod_enabled: flag(true, 'Whether cash on delivery is offered', 'cod'),
  cod_max_order_value: number(2000, 0, 100000, 'Largest order total that may be paid in cash (0 = no limit)', 'cod'),

  // ── Estimated delivery time ──────────────────────────────────────────────
  delivery_prep_minutes: number(15, 0, 180, 'Preparation time assumed when estimating arrival', 'eta'),
  delivery_speed_kmph: number(20, 5, 80, 'Average rider speed assumed when estimating arrival', 'eta'),
};

const CACHE_MS = 30 * 1000;
let cache = null;
let cachedAt = 0;

/** A stored or submitted value as the setting's type, or undefined if it is not valid for it. */
function coerce(key, raw) {
  const setting = SETTINGS[key];
  if (!setting || raw === undefined || raw === null) return undefined;

  if (setting.type === 'boolean') {
    if (raw === true || raw === 'true' || raw === 1 || raw === '1') return true;
    if (raw === false || raw === 'false' || raw === 0 || raw === '0') return false;
    return undefined;
  }
  if (setting.type === 'text') {
    // Stored JSON-encoded (see stored() below), so SQLite hands back "\"12-14\""
    // where PostgreSQL has already parsed it to 12-14.
    let value = String(raw).trim();
    if (/^".*"$/.test(value)) {
      try { value = String(JSON.parse(value)); } catch { /* keep as typed */ }
    }
    return setting.pattern.test(value) ? value : undefined;
  }
  // admin_config.config_value is text on SQLite and JSONB on PostgreSQL: a
  // number may arrive as 20, "20" or '"20"'.
  const cleaned = typeof raw === 'string' ? raw.trim().replace(/^"|"$/g, '') : raw;
  if (cleaned === '') return undefined;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < setting.min || value > setting.max) return undefined;
  return value;
}

/**
 * The text written to admin_config.config_value. That column is JSONB on
 * PostgreSQL, so it has to be valid JSON: a number or boolean in text form
 * already is, a string has to be quoted.
 */
function stored(setting, value) {
  return setting.type === 'text' ? JSON.stringify(value) : String(value);
}

/** Every setting's effective value. Read from admin_config at most once per CACHE_MS. */
async function all() {
  if (cache && Date.now() - cachedAt < CACHE_MS) return cache;

  const values = {};
  for (const [key, setting] of Object.entries(SETTINGS)) values[key] = setting.default;

  try {
    const keys = Object.keys(SETTINGS);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const rows = await queryMany(`SELECT config_key, config_value FROM admin_config WHERE config_key IN (${placeholders})`, keys);
    for (const row of rows || []) {
      const value = coerce(row.config_key, row.config_value);
      if (value !== undefined) values[row.config_key] = value;
    }
  } catch (error) {
    // A database that cannot be read must not stop an order being priced.
    console.warn('[platformConfig] using defaults; could not read admin_config:', error.message);
    return values;
  }

  cache = values;
  cachedAt = Date.now();
  return values;
}

async function get(key) {
  if (!SETTINGS[key]) throw new Error(`Unknown platform setting: ${key}`);
  return (await all())[key];
}

/**
 * Validates and stores changes. Returns { errors } without writing anything if
 * any value is out of range, so a form is saved as a whole or not at all.
 */
async function update(changes, adminId) {
  const errors = {};
  const accepted = [];

  for (const [key, raw] of Object.entries(changes || {})) {
    const setting = SETTINGS[key];
    if (!setting) { errors[key] = 'Unknown setting'; continue; }
    const value = coerce(key, raw);
    if (value === undefined) {
      errors[key] = setting.type === 'number'
        ? `Must be a number from ${setting.min} to ${setting.max}`
        : setting.type === 'boolean' ? 'Must be true or false' : 'Invalid format';
      continue;
    }
    accepted.push([key, value, setting]);
  }

  if (Object.keys(errors).length > 0) return { errors };
  if (accepted.length === 0) return { errors: { _: 'No settings supplied' } };

  for (const [key, value, setting] of accepted) {
    await query(
      `INSERT INTO admin_config (config_key, config_value, config_category, description, updated_by)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (config_key)
       DO UPDATE SET config_value = EXCLUDED.config_value, updated_by = EXCLUDED.updated_by, updated_at = CURRENT_TIMESTAMP`,
      [key, stored(setting, value), setting.group, setting.description, adminId || null]
    );
  }

  invalidate();
  return { updated: Object.fromEntries(accepted.map(([key, value]) => [key, value])) };
}

function invalidate() {
  cache = null;
  cachedAt = 0;
}

/** The settings with their meaning and limits, for the admin console to render a form from. */
async function describe() {
  const values = await all();
  return Object.entries(SETTINGS).map(([key, setting]) => ({
    key,
    value: values[key],
    default: setting.default,
    type: setting.type,
    group: setting.group,
    description: setting.description,
    ...(setting.type === 'number' ? { min: setting.min, max: setting.max } : {}),
  }));
}

module.exports = { SETTINGS, all, get, update, describe, invalidate, coerce };
