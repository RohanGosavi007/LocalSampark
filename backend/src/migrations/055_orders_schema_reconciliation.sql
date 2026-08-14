-- 055: Reconcile the two conflicting `orders` definitions.
--
-- init.sql declared `orders` twice. Because both used CREATE TABLE IF NOT
-- EXISTS, the first (UUID keyed, `order_status`, `delivery_address`) always won
-- and the second (SERIAL keyed, `status`, `platform_fee`, `fulfillment_method`)
-- never took effect. The codebase agrees with the winner: `order_status` is
-- referenced 22 times against a single reference to `orders.status`.
--
-- checkout.service.js was the sole component written against the losing shape,
-- so every order insert referenced columns that do not exist. This migration
-- keeps the UUID table as canonical and adds the commerce columns checkout
-- genuinely needs. The duplicate definition is removed from init.sql.

BEGIN;

-- ─── Columns the checkout flow needs ────────────────────────────────────────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS platform_fee       DECIMAL(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount           DECIMAL(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_lat       DOUBLE PRECISION;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_lng       DOUBLE PRECISION;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_id         VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fulfillment_method VARCHAR(20) DEFAULT 'DELIVERY';

-- ─── Pickup orders have no delivery point ───────────────────────────────────
-- Both columns were NOT NULL, which made a PICKUP order impossible to record.
ALTER TABLE orders ALTER COLUMN delivery_address    DROP NOT NULL;
ALTER TABLE orders ALTER COLUMN delivery_coordinate DROP NOT NULL;

-- ─── Indexes for the order history reads ────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_shop_created ON orders(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order   ON order_items(order_id);

COMMIT;
