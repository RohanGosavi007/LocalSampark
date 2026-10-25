const { query } = require('../../../config/database');
const { Parser } = require('json2csv');

/**
 * The platform's financials, from the ledgers.
 *
 * This used to be partly invented. The history was `Math.random()` — revenue
 * and payouts between ₹1–5 lakh for every month, whatever had happened — and the
 * breakdown estimated commission as a flat 10% of order value plus 5% of a
 * `carpool_rides.price` column that does not exist, so the endpoint failed on
 * every call anyway. A finance export that makes numbers up is worse than none.
 *
 * Everything here is a sum of rows the payout and payment services wrote:
 *
 *   platform commission  shop_payouts.platform_commission, for payouts that have
 *                        been approved or paid (a 'dues' or calculated-only row
 *                        is not yet owed)
 *   plan subscriptions   payments with purpose 'saas_subscription', status paid
 *   paid out             shop_payouts.net_payout, completed, by the day paid
 *
 * Periods are bucketed with SUBSTR(CAST(col AS TEXT), 1, n) rather than a date
 * function, so the same SQL runs on SQLite and PostgreSQL.
 */

const COMMISSION_STATES = ['approved', 'initiated', 'completed'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** The last `count` periods, oldest first, each with the key it is bucketed by. */
function buildPeriods(rangeType, count, now = new Date()) {
  const periods = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    if (rangeType === 'years') {
      const year = now.getUTCFullYear() - i;
      periods.push({ key: String(year), label: String(year), start: `${year}-01-01` });
    } else {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
      periods.push({
        key: `${d.getUTCFullYear()}-${mm}`,
        label: `${MONTHS[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}`,
        start: `${d.getUTCFullYear()}-${mm}-01`,
      });
    }
  }
  return periods;
}

const num = (v) => Math.round((Number(v) || 0) * 100) / 100;
const rowsOf = (r) => r.rows || r || [];

exports.buildPeriods = buildPeriods;

exports.exportFinancials = async (req, res, next) => {
  try {
    const rangeType = req.query.rangeType === 'years' ? 'years' : 'months';
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 12, 1), 60);
    const { format } = req.query;

    const periods = buildPeriods(rangeType, limit);
    const width = rangeType === 'years' ? 4 : 7;
    const since = periods[0].start;
    const bucket = (col) => `SUBSTR(CAST(${col} AS TEXT), 1, ${width})`;
    const states = COMMISSION_STATES.map((_, i) => `$${i + 2}`).join(', ');

    const [commission, subscriptions, paidOut] = await Promise.all([
      query(
        `SELECT ${bucket('period_end')} AS period, COUNT(*) AS n, COALESCE(SUM(platform_commission), 0) AS amount
           FROM shop_payouts
          WHERE period_end >= $1 AND LOWER(payout_status) IN (${states})
          GROUP BY ${bucket('period_end')}`,
        [since, ...COMMISSION_STATES]
      ),
      query(
        `SELECT ${bucket('paid_at')} AS period, COUNT(*) AS n, COALESCE(SUM(amount), 0) AS amount
           FROM payments
          WHERE purpose = 'saas_subscription' AND LOWER(status) = 'paid' AND paid_at >= $1
          GROUP BY ${bucket('paid_at')}`,
        [since]
      ),
      query(
        `SELECT ${bucket('paid_at')} AS period, COUNT(*) AS n, COALESCE(SUM(net_payout), 0) AS amount
           FROM shop_payouts
          WHERE LOWER(payout_status) = 'completed' AND paid_at >= $1
          GROUP BY ${bucket('paid_at')}`,
        [since]
      ),
    ]);

    const byPeriod = (result) => Object.fromEntries(rowsOf(result).map((r) => [String(r.period), r]));
    const c = byPeriod(commission);
    const s = byPeriod(subscriptions);
    const p = byPeriod(paidOut);

    const history = periods.map(({ key, label }) => ({
      period: label,
      key,
      platform_commission: num(c[key]?.amount),
      subscription_revenue: num(s[key]?.amount),
      revenue: num(num(c[key]?.amount) + num(s[key]?.amount)),
      payouts: num(p[key]?.amount),
    }));

    const sum = (rows, field) => rows.reduce((t, r) => t + (Number(r[field]) || 0), 0);
    const revenueBreakdown = [
      { revenue_stream: 'Platform commission', total_transactions: sum(rowsOf(commission), 'n'), revenue: num(sum(rowsOf(commission), 'amount')) },
      { revenue_stream: 'Shop plan subscriptions', total_transactions: sum(rowsOf(subscriptions), 'n'), revenue: num(sum(rowsOf(subscriptions), 'amount')) },
    ];

    if (format === 'csv') {
      // Tally/QuickBooks journal: Date, Voucher Type, Voucher Number, Ledger Name, Amount, Dr/Cr, Narration
      const today = new Date().toISOString().split('T')[0];
      const rows = revenueBreakdown.map((row, index) => ({
        'Date': today,
        'Voucher Type': 'Journal',
        'Voucher Number': `LS-REV-${1000 + index}`,
        'Ledger Name': row.revenue_stream,
        'Amount': row.revenue,
        'Dr/Cr': 'Cr',
        'Narration': `${row.total_transactions} transaction(s), ${periods[0].label} to ${periods[periods.length - 1].label}`,
      }));
      res.header('Content-Type', 'text/csv');
      res.attachment('tally_localsampark_financial_export.csv');
      return res.send(new Parser({ fields: Object.keys(rows[0]) }).parse(rows));
    }

    res.json({
      success: true,
      data: {
        range: { type: rangeType, from: periods[0].start, periods: periods.length },
        revenueBreakdown,
        history,
        // Kept for the consoles that read the old name; these are actuals now.
        historicalProjections: history,
      },
    });
  } catch (error) {
    next(error);
  }
};
