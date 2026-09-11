const { query, queryOne } = require('../../../config/database');

/**
 * Platform analytics for the admin web dashboard (/admin/analytics/overview).
 *
 * The previous version fabricated in two separate ways, and both were visible
 * to an operator as fact:
 *
 *   1. Every headline number had a mock fallback that fired whenever the real
 *      query returned zero — an empty platform reported "15,400 users",
 *      "₹28,50,000 processed" and "540 active merchants". Avg. SLA time was a
 *      literal ('12m 40s' for a week, '11m 15s' for a day) with nothing behind
 *      it at all.
 *
 *   2. The revenue and user charts were not queried. Each bar was the grand
 *      total multiplied by a fixed percentage — Saturday was always 20% of
 *      revenue, Sunday always 8% — so the shape of the curve was decided in
 *      this file and never by the data. It looked like a healthy business
 *      trending upward regardless of what the platform had actually done.
 *
 * Everything below is measured. Buckets with no activity report zero.
 */

// SQLite has no date_trunc and Postgres has no strftime, but both cast a
// timestamp to the same 'YYYY-MM-DD HH:MM:SS' shape, so bucketing is done with
// substr() to keep one query for both engines.
const DAY_KEY = 'substr(CAST(created_at AS TEXT), 1, 10)';
const HOUR_KEY = 'substr(CAST(created_at AS TEXT), 12, 2)';

const rowsOf = (result) => (result && result.rows) || result || [];
const num = (v) => Number(v) || 0;

const isoDay = (d) => d.toISOString().slice(0, 10);

/** The bucket labels and keys for a duration, oldest first. */
function buildBuckets(duration) {
  const now = new Date();

  if (duration === 'day') {
    // Every hour of today so far, so the chart does not imply activity in
    // hours that have not happened yet.
    const buckets = [];
    for (let h = 0; h <= now.getHours(); h += 1) {
      const hh = String(h).padStart(2, '0');
      buckets.push({ key: hh, label: `${((h + 11) % 12) + 1}${h < 12 ? 'AM' : 'PM'}` });
    }
    return { buckets, groupKey: HOUR_KEY, sinceDay: isoDay(now) };
  }

  const days = duration === 'month' ? 30 : 7;
  const buckets = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    buckets.push({
      key: isoDay(d),
      label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    });
  }
  const since = new Date(now);
  since.setDate(since.getDate() - (days - 1));
  return { buckets, groupKey: DAY_KEY, sinceDay: isoDay(since) };
}

/** Roll 30 daily buckets into 4 weekly ones so the month chart stays readable. */
function toWeeks(buckets) {
  const weeks = [];
  for (let i = 0; i < buckets.length; i += 7) {
    const slice = buckets.slice(i, i + 7);
    weeks.push({
      label: `${slice[0].label} – ${slice[slice.length - 1].label}`,
      revenue: slice.reduce((t, b) => t + b.revenue, 0),
      users: slice.reduce((t, b) => t + b.users, 0),
    });
  }
  return weeks;
}

/**
 * Average time from order placement to delivery, formatted.
 *
 * Postgres has no strftime and SQLite has no EXTRACT, and this codebase runs on
 * both, so the two timestamps are read out and differenced in JS rather than in
 * SQL. Returns null when nothing has been delivered — the card then shows a
 * dash instead of a made-up figure.
 */
async function averageSla(sinceDay) {
  const rows = rowsOf(await query(
    `SELECT CAST(created_at AS TEXT) AS placed, CAST(delivered_at AS TEXT) AS delivered
       FROM orders
      WHERE delivered_at IS NOT NULL
        AND ${DAY_KEY} >= $1
      LIMIT 2000`,
    [sinceDay]
  ));

  const spans = rows
    .map((r) => new Date(String(r.delivered).replace(' ', 'T')) - new Date(String(r.placed).replace(' ', 'T')))
    .filter((ms) => Number.isFinite(ms) && ms > 0);

  if (spans.length === 0) return null;

  const avgMinutes = Math.round(spans.reduce((t, ms) => t + ms, 0) / spans.length / 60000);
  if (avgMinutes < 60) return `${avgMinutes}m`;
  return `${Math.floor(avgMinutes / 60)}h ${avgMinutes % 60}m`;
}

exports.getOverview = async (req, res, next) => {
  try {
    const duration = ['day', 'week', 'month'].includes(req.query.duration) ? req.query.duration : 'week';
    const { buckets, groupKey, sinceDay } = buildBuckets(duration);

    const users = await queryOne('SELECT COUNT(*) AS count FROM users');
    const shops = await queryOne(
      'SELECT COUNT(*) AS count FROM local_shops WHERE COALESCE(is_active, 1) = 1'
    );
    const volume = await queryOne(
      `SELECT COALESCE(SUM(total_amount), 0) AS total
         FROM orders
        WHERE LOWER(COALESCE(order_status, '')) <> 'cancelled'`
    );

    // Revenue actually taken in each bucket, from the orders themselves.
    const revenueRows = rowsOf(await query(
      `SELECT ${groupKey} AS bucket, COALESCE(SUM(total_amount), 0) AS total
         FROM orders
        WHERE LOWER(COALESCE(order_status, '')) <> 'cancelled'
          AND ${DAY_KEY} >= $1
        GROUP BY ${groupKey}`,
      [sinceDay]
    ));

    // "Active users" has no session table behind it, so this counts accounts
    // created in each bucket — a real number the label on the chart now
    // matches.
    const signupRows = rowsOf(await query(
      `SELECT ${groupKey} AS bucket, COUNT(*) AS total
         FROM users
        WHERE ${DAY_KEY} >= $1
        GROUP BY ${groupKey}`,
      [sinceDay]
    ));

    const revenueBy = new Map(revenueRows.map((r) => [String(r.bucket), num(r.total)]));
    const signupBy = new Map(signupRows.map((r) => [String(r.bucket), num(r.total)]));

    const filled = buckets.map((b) => ({
      label: b.label,
      revenue: revenueBy.get(b.key) || 0,
      users: signupBy.get(b.key) || 0,
    }));

    res.json({
      success: true,
      metrics: {
        totalUsers: num(users && users.count),
        financialVolume: num(volume && volume.total),
        activeMerchants: num(shops && shops.count),
        slaTime: await averageSla(sinceDay),
      },
      chartData: duration === 'month' ? toWeeks(filled) : filled,
    });
  } catch (error) {
    next(error);
  }
};
