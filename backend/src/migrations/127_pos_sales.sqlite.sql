-- 127 (SQLite): counter sales rung up on the shop's point-of-sale screen.
-- 127_pos_sales.sql carries the reasoning.

CREATE TABLE IF NOT EXISTS pos_sales (
    id             TEXT PRIMARY KEY,
    shop_id        TEXT NOT NULL REFERENCES local_shops(id) ON DELETE CASCADE,
    bill_no        TEXT NOT NULL,
    items_json     TEXT NOT NULL,
    subtotal       REAL NOT NULL,
    discount       REAL NOT NULL DEFAULT 0,
    gst_rate       REAL NOT NULL DEFAULT 0,
    gst_amount     REAL NOT NULL DEFAULT 0,
    total          REAL NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'cash',
    created_by     TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at     TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (shop_id, bill_no)
);
CREATE INDEX IF NOT EXISTS idx_pos_sales_shop_created ON pos_sales (shop_id, created_at);
CREATE INDEX IF NOT EXISTS idx_pos_sales_created_by ON pos_sales (created_by);
