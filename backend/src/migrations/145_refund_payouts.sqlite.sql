-- ─────────────────────────────────────────────────────────────────────────────
-- 145: refunds paid by hand while the wallet is off (Decision D10, F-158) —
-- SQLite twin of 145_refund_payouts.sql. A re-run reports "duplicate column"
-- for refund_upi, which the SQLite runner treats as already applied.
--
-- D10: at launch the consumer wallet is flagged off, and a cash refund is a
-- manual UPI or bank payout an administrator confirms, with a ledger entry.
-- Nothing recorded such payouts; every refund path credited the wallet the
-- customer could not see. One row per refund owed; it is paid when an admin
-- enters the transfer reference. order_returns.refund_upi is where a customer
-- says which UPI ID to pay.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS refund_payouts (
    id TEXT PRIMARY KEY,
    source_type TEXT NOT NULL,
    source_id TEXT,
    order_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    amount REAL NOT NULL,
    payee_upi TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    reference TEXT,
    paid_by TEXT,
    paid_at TEXT,
    note TEXT,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_refund_payouts_status ON refund_payouts(status, created_at);
CREATE INDEX IF NOT EXISTS idx_refund_payouts_order ON refund_payouts(order_id);
CREATE INDEX IF NOT EXISTS idx_refund_payouts_user ON refund_payouts(user_id);

ALTER TABLE order_returns ADD COLUMN refund_upi TEXT;
