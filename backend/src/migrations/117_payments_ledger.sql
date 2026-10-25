-- ─────────────────────────────────────────────────────────────────────────────
-- 117: payments as the record of every gateway payment
--
-- `payments` existed, with a gateway_order_id and a status, and was written by
-- nothing the server loads. Each checkout path talked to Razorpay on its own
-- instead, and none of them kept what a payment was FOR — so when a "payment
-- succeeded" message came back there was nothing to check it against, and one
-- genuine payment could be presented again to mark a different order paid.
--
-- A payment now always has a row here, created before the customer is sent to
-- the gateway, that fixes three things the customer cannot change afterwards:
--
--   purpose       what is being paid for: 'order', 'shop_order',
--                 'universal_order' or 'wallet_topup'
--   order_id      which one (already a column; null for a wallet top-up)
--   amount_paise  how much, in the gateway's own integer unit, so that it can
--                 be compared with what the gateway reports without rounding
--
-- gateway_order_id is unique: it is how a verification or a webhook finds its
-- row, and two rows claiming one gateway order would make that ambiguous.
--
-- NOT EXECUTED: no PostgreSQL instance was available in this environment.
-- Review before applying to production.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE payments ADD COLUMN IF NOT EXISTS purpose TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS amount_paise INTEGER;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS failure_reason TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_gateway_order
    ON payments (gateway_order_id)
    WHERE gateway_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_reference ON payments (purpose, order_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments (user_id);

-- universal_orders had nowhere to record that an order was paid except its
-- `status`, which is the fulfilment state machine (PENDING, CONFIRMED,
-- PREPARING, …). Writing 'paid' there took an order out of that machine.
ALTER TABLE universal_orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';
ALTER TABLE universal_orders ADD COLUMN IF NOT EXISTS payment_id TEXT;
