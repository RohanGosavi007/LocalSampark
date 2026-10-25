-- ─────────────────────────────────────────────────────────────────────────────
-- 133: After-Order Experience (C10–C14, S5–S7)
--
-- Supports post-delivery returns & refunds (C11/S6), verified buyer reviews &
-- seller replies (C12/S7), and order return status progression.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS order_returns (
    id TEXT PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shop_id UUID NOT NULL REFERENCES local_shops(id) ON DELETE CASCADE,
    return_type TEXT NOT NULL DEFAULT 'return',
    reason TEXT NOT NULL,
    items JSONB DEFAULT '[]'::jsonb,
    evidence_urls JSONB DEFAULT '[]'::jsonb,
    refund_amount NUMERIC(12, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending_review',
    rejection_reason TEXT,
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_role TEXT,
    verification_notes TEXT,
    verified_at TIMESTAMPTZ,
    refund_channel TEXT,
    refund_reference_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_returns_order ON order_returns(order_id);
CREATE INDEX IF NOT EXISTS idx_order_returns_shop ON order_returns(shop_id);
CREATE INDEX IF NOT EXISTS idx_order_returns_status ON order_returns(status, created_at DESC);

ALTER TABLE trust_reviews ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id) ON DELETE SET NULL;
ALTER TABLE trust_reviews ADD COLUMN IF NOT EXISTS seller_reply_text TEXT;
ALTER TABLE trust_reviews ADD COLUMN IF NOT EXISTS seller_replied_at TIMESTAMPTZ;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS return_status TEXT;
