-- Migration 071 (PostgreSQL): columns the orders table is missing
--
-- Found with scripts/verify-column-usage.js, which attributes a column to a
-- table by parsing single-table SQL rather than grepping the bare word, and
-- checks it against real PRAGMA table_info metadata.
--
-- The dispatch engine is the clearest casualty:
--   UPDATE orders SET assigned_agent_id = $1, status = 'DISPATCHED' WHERE id = $2
--     src/services/dispatch.engine.js:45,49
-- Neither column exists — the live table has order_status and no agent
-- reference — so every dispatch fails. The `status` half is a naming drift and
-- is fixed in the code (order_status is authoritative); assigned_agent_id is
-- genuinely absent and is added here.
--
-- delivered_at is read by the payout calculation, and discount/platform_fee/
-- fulfillment_method are written by checkout, all against columns that were
-- never created.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS assigned_agent_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fulfillment_method VARCHAR(30) DEFAULT 'DELIVERY';

-- checkout.service.js writes a flat lat/lng pair. The table also has
-- delivery_coordinate, but nothing populates it, so the pair is what the
-- application actually uses.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_lat DOUBLE PRECISION;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_lng DOUBLE PRECISION;

-- Backfill delivered_at for orders already marked delivered, so payout runs
-- covering past periods are not silently empty.
UPDATE orders SET delivered_at = updated_at
 WHERE delivered_at IS NULL AND order_status = 'delivered';

CREATE INDEX IF NOT EXISTS idx_orders_agent ON orders(assigned_agent_id, order_status);
CREATE INDEX IF NOT EXISTS idx_orders_delivered ON orders(delivered_at);
