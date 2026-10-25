-- ─────────────────────────────────────────────────────────────────────────────
-- 133: After-Order Experience (C10–C14, S5–S7) [SQLite Twin]
--
-- Supports post-delivery returns & refunds (C11/S6), verified buyer reviews &
-- seller replies (C12/S7), and order return status progression.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS order_returns (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shop_id TEXT NOT NULL REFERENCES local_shops(id) ON DELETE CASCADE,
    return_type TEXT NOT NULL DEFAULT 'return',
    reason TEXT NOT NULL,
    items TEXT DEFAULT '[]',
    evidence_urls TEXT DEFAULT '[]',
    refund_amount REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending_review',
    rejection_reason TEXT,
    verified_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    verified_role TEXT,
    verification_notes TEXT,
    verified_at TEXT,
    refund_channel TEXT,
    refund_reference_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_order_returns_order ON order_returns(order_id);
CREATE INDEX IF NOT EXISTS idx_order_returns_shop ON order_returns(shop_id);
CREATE INDEX IF NOT EXISTS idx_order_returns_status ON order_returns(status, created_at);

ALTER TABLE trust_reviews ADD COLUMN order_id TEXT;
ALTER TABLE trust_reviews ADD COLUMN seller_reply_text TEXT;
ALTER TABLE trust_reviews ADD COLUMN seller_replied_at TEXT;

ALTER TABLE orders ADD COLUMN return_status TEXT;
