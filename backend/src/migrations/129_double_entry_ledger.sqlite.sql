-- ─────────────────────────────────────────────────────────────────────────────
-- 129: Double-Entry Platform Payments Ledger (P3) (SQLite twin)
--
-- Records every movement of money with strict double-entry debits and credits.
-- Invariant: For every transaction_id, SUM(debit) == SUM(credit).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS platform_ledger_entries (
    id TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL,
    entry_type TEXT NOT NULL CHECK (entry_type IN ('DEBIT', 'CREDIT')),
    account_type TEXT NOT NULL CHECK (account_type IN (
        'CUSTOMER_CASH',
        'CUSTOMER_WALLET',
        'GATEWAY_RECEIVABLE',
        'SELLER_PAYABLE',
        'PLATFORM_REVENUE_COMMISSION',
        'PLATFORM_REVENUE_DELIVERY_FEE',
        'RIDER_PAYABLE',
        'REFUND_PAYABLE'
    )),
    account_id TEXT NOT NULL,
    amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
    currency TEXT NOT NULL DEFAULT 'INR',
    reference_type TEXT NOT NULL CHECK (reference_type IN ('ORDER_PAYMENT', 'ORDER_REFUND', 'SELLER_PAYOUT', 'RIDER_PAYOUT', 'MANUAL_ADJUSTMENT')),
    reference_id TEXT NOT NULL,
    description TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ledger_tx ON platform_ledger_entries (transaction_id);
CREATE INDEX IF NOT EXISTS idx_ledger_account ON platform_ledger_entries (account_type, account_id);
CREATE INDEX IF NOT EXISTS idx_ledger_ref ON platform_ledger_entries (reference_type, reference_id);
