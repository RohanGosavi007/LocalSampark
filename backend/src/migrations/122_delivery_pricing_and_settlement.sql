-- ─────────────────────────────────────────────────────────────────────────────
-- 122: what an order needs to record for distance-based delivery pricing, rider
--      cash, and settling with shops
--
-- orders
--   subtotal              the items, before any fee — the base for commission.
--                         total_amount alone cannot be un-mixed once delivery,
--                         platform and small-order fees are added to it.
--   small_order_fee       charged when the items come to less than the
--                         small-order threshold
--   delivery_distance_km  the distance the delivery charge was calculated on
--   surge_multiplier      the surge in force when the order was placed
--   rider_payout          what the rider earns for the delivery. It was taken
--                         to be the customer's delivery charge, so an order
--                         with free delivery paid its rider nothing.
--   cash_collected_by     for a cash order, who took the cash: 'rider' or
--                         'shop'. Decides which way money moves at settlement.
--   pickup_*              where a parcel is collected from (a parcel has no
--                         shop to be collected at)
--
-- delivery_agents.cash_in_hand and rider_cash_ledger
--   A rider who delivers a cash order is holding the platform's money until
--   they deposit it. The running total gates further cash orders; the ledger
--   is the record of every collection and deposit behind that total.
--
-- shop_payouts / payout_line_items
--   A shop that collected cash itself owes the platform its commission; a
--   payout nets that off, and a period that comes out negative is carried into
--   the next one rather than lost. collected_by records, per order, which case
--   it was.
--
-- NOT EXECUTED: no PostgreSQL instance was available in this environment.
-- Review before applying to production.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS small_order_fee DECIMAL(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_distance_km REAL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS surge_multiplier REAL DEFAULT 1;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rider_payout DECIMAL(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cash_collected_by TEXT;
-- The commission rate in force when the order was placed, so a later change
-- of rate does not re-price orders already made.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS commission_percent REAL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_address TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_lat DOUBLE PRECISION;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_lng DOUBLE PRECISION;

ALTER TABLE delivery_agents ADD COLUMN IF NOT EXISTS cash_in_hand REAL DEFAULT 0;

CREATE TABLE IF NOT EXISTS rider_cash_ledger (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    rider_user_id TEXT NOT NULL,
    order_id TEXT,
    entry_type TEXT NOT NULL,          -- 'collected' | 'deposited'
    amount REAL NOT NULL,
    recorded_by TEXT,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_rider_cash_ledger_rider ON rider_cash_ledger (rider_user_id, created_at);

ALTER TABLE shop_payouts ADD COLUMN IF NOT EXISTS shop_collected_amount REAL DEFAULT 0;
ALTER TABLE shop_payouts ADD COLUMN IF NOT EXISTS platform_fees_due REAL DEFAULT 0;
ALTER TABLE shop_payouts ADD COLUMN IF NOT EXISTS carried_dues REAL DEFAULT 0;
ALTER TABLE shop_payouts ADD COLUMN IF NOT EXISTS absorbed_into TEXT;

ALTER TABLE payout_line_items ADD COLUMN IF NOT EXISTS collected_by TEXT DEFAULT 'platform';
