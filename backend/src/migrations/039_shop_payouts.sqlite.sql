-- ═══════════════════════════════════════════════════════════════════════
-- Migration 039: Shop Payouts & Reconciliation System
-- 10x Plan: Section 20.2.3 — Automated Payout Engine
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS shop_payouts (
    id TEXT PRIMARY KEY,
    shop_id TEXT REFERENCES local_shops(id) ON DELETE CASCADE,
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,

    -- Financials
    gross_gmv REAL NOT NULL DEFAULT 0,
    total_orders INTEGER NOT NULL DEFAULT 0,
    total_deliveries INTEGER DEFAULT 0,
    platform_commission REAL NOT NULL DEFAULT 0,
    commission_rate REAL NOT NULL DEFAULT 10.0,
    payment_gateway_fee REAL NOT NULL DEFAULT 0,
    delivery_deductions REAL DEFAULT 0,
    gst_on_commission REAL NOT NULL DEFAULT 0,
    tds_deducted REAL DEFAULT 0,
    net_payout REAL NOT NULL DEFAULT 0,

    -- Payout Execution
    payout_status TEXT DEFAULT 'calculated',
    payout_reference TEXT,
    payout_method TEXT DEFAULT 'bank_transfer',
    payout_batch_id TEXT,
    paid_at TEXT,
    failure_reason TEXT,

    -- Audit
    calculated_by TEXT DEFAULT 'system',
    approved_by TEXT REFERENCES users(id),
    approved_at TEXT,

    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_shop_payouts_shop ON shop_payouts(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_payouts_status ON shop_payouts(payout_status);
CREATE INDEX IF NOT EXISTS idx_shop_payouts_period ON shop_payouts(period_start, period_end);

-- Payout line items for audit trail
CREATE TABLE IF NOT EXISTS payout_line_items (
    id TEXT PRIMARY KEY,
    payout_id TEXT REFERENCES shop_payouts(id) ON DELETE CASCADE,
    order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
    order_amount REAL NOT NULL,
    commission_amount REAL NOT NULL,
    gateway_fee REAL NOT NULL,
    net_amount REAL NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_payout_items_payout ON payout_line_items(payout_id);
