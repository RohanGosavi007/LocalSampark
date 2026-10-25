-- 127: counter sales rung up on the shop's point-of-sale screen
--
-- The web POS built a bill, showed "Payment Successful!" and kept nothing: no record of the sale,
-- no stock taken off, no figure for the shop's takings. Each sale is now one row here, written in
-- the same transaction that reduces stock (modules/ecommerce/controllers/pos.controller.js).
-- Prices are read from shop_products on the server; the screen only says which products and how many.
--
-- NOT EXECUTED against PostgreSQL: no PostGIS instance was available.

BEGIN;

CREATE TABLE IF NOT EXISTS pos_sales (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id        UUID NOT NULL REFERENCES local_shops(id) ON DELETE CASCADE,
    bill_no        TEXT NOT NULL,
    items_json     TEXT NOT NULL,
    subtotal       NUMERIC(12,2) NOT NULL,
    discount       NUMERIC(12,2) NOT NULL DEFAULT 0,
    gst_rate       NUMERIC(5,2)  NOT NULL DEFAULT 0,
    gst_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
    total          NUMERIC(12,2) NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'cash',
    created_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (shop_id, bill_no)
);
CREATE INDEX IF NOT EXISTS idx_pos_sales_shop_created ON pos_sales (shop_id, created_at);
CREATE INDEX IF NOT EXISTS idx_pos_sales_created_by ON pos_sales (created_by);

COMMIT;
