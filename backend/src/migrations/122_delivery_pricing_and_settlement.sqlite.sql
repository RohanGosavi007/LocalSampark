-- 122 (SQLite): columns for distance-based delivery pricing, rider cash and
-- settling with shops. The reasoning for each is in
-- 122_delivery_pricing_and_settlement.sql. ADD COLUMN has no IF NOT EXISTS
-- here: the runner treats "duplicate column name" as already-applied.

ALTER TABLE orders ADD COLUMN subtotal REAL;
ALTER TABLE orders ADD COLUMN small_order_fee REAL DEFAULT 0;
ALTER TABLE orders ADD COLUMN delivery_distance_km REAL;
ALTER TABLE orders ADD COLUMN surge_multiplier REAL DEFAULT 1;
ALTER TABLE orders ADD COLUMN rider_payout REAL DEFAULT 0;
ALTER TABLE orders ADD COLUMN cash_collected_by TEXT;
ALTER TABLE orders ADD COLUMN commission_percent REAL;
ALTER TABLE orders ADD COLUMN pickup_address TEXT;
ALTER TABLE orders ADD COLUMN pickup_lat REAL;
ALTER TABLE orders ADD COLUMN pickup_lng REAL;

ALTER TABLE delivery_agents ADD COLUMN cash_in_hand REAL DEFAULT 0;

CREATE TABLE IF NOT EXISTS rider_cash_ledger (
    id TEXT PRIMARY KEY,
    rider_user_id TEXT NOT NULL,
    order_id TEXT,
    entry_type TEXT NOT NULL,          -- 'collected' | 'deposited'
    amount REAL NOT NULL,
    recorded_by TEXT,
    note TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_rider_cash_ledger_rider ON rider_cash_ledger (rider_user_id, created_at);

ALTER TABLE shop_payouts ADD COLUMN shop_collected_amount REAL DEFAULT 0;
ALTER TABLE shop_payouts ADD COLUMN platform_fees_due REAL DEFAULT 0;
ALTER TABLE shop_payouts ADD COLUMN carried_dues REAL DEFAULT 0;
ALTER TABLE shop_payouts ADD COLUMN absorbed_into TEXT;

ALTER TABLE payout_line_items ADD COLUMN collected_by TEXT DEFAULT 'platform';
