-- 117 (SQLite): payments as the record of every gateway payment.
-- The reasoning is in 117_payments_ledger.sql; this is the same change in
-- SQLite's types. ADD COLUMN has no IF NOT EXISTS here: the runner treats
-- "duplicate column name" as already-applied.

ALTER TABLE payments ADD COLUMN purpose TEXT;
ALTER TABLE payments ADD COLUMN amount_paise INTEGER;
ALTER TABLE payments ADD COLUMN paid_at TEXT;
ALTER TABLE payments ADD COLUMN failure_reason TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_gateway_order
    ON payments (gateway_order_id)
    WHERE gateway_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_reference ON payments (purpose, order_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments (user_id);

-- See the PostgreSQL file: payment state kept apart from fulfilment state.
ALTER TABLE universal_orders ADD COLUMN payment_status TEXT DEFAULT 'pending';
ALTER TABLE universal_orders ADD COLUMN payment_id TEXT;
