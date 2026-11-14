-- ─────────────────────────────────────────────────────────────────────────────
-- 150: Add PLATFORM_BANK account and WALLET_TOPUP reference type to the ledger (P3)
-- — SQLite twin of 150_ledger_bank_account_and_topup.sql.
--
-- SQLite cannot alter a CHECK constraint in place, so the table is rebuilt
-- with the expanded CHECK constraints, its indexes, and the append-only
-- triggers from migration 149.
-- ─────────────────────────────────────────────────────────────────────────────

PRAGMA foreign_keys = OFF;

CREATE TABLE IF NOT EXISTS platform_ledger_entries_v150 (
    id TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL,
    entry_type TEXT NOT NULL CHECK (entry_type IN ('DEBIT', 'CREDIT')),
    account_type TEXT NOT NULL CHECK (account_type IN (
        'CUSTOMER_CASH',
        'CUSTOMER_WALLET',
        'GATEWAY_RECEIVABLE',
        'PLATFORM_BANK',
        'SELLER_PAYABLE',
        'PLATFORM_REVENUE_COMMISSION',
        'PLATFORM_REVENUE_DELIVERY_FEE',
        'RIDER_PAYABLE',
        'REFUND_PAYABLE'
    )),
    account_id TEXT NOT NULL,
    amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
    currency TEXT NOT NULL DEFAULT 'INR',
    reference_type TEXT NOT NULL CHECK (reference_type IN (
        'ORDER_PAYMENT',
        'ORDER_REFUND',
        'SELLER_PAYOUT',
        'RIDER_PAYOUT',
        'WALLET_TOPUP',
        'MANUAL_ADJUSTMENT'
    )),
    reference_id TEXT NOT NULL,
    description TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO platform_ledger_entries_v150
    (id, transaction_id, entry_type, account_type, account_id, amount_paise, currency, reference_type, reference_id, description, created_at)
SELECT id, transaction_id, entry_type, account_type, account_id, amount_paise, currency, reference_type, reference_id, description, created_at
  FROM platform_ledger_entries;

DROP TABLE platform_ledger_entries;

ALTER TABLE platform_ledger_entries_v150 RENAME TO platform_ledger_entries;

CREATE INDEX IF NOT EXISTS idx_ledger_tx ON platform_ledger_entries (transaction_id);
CREATE INDEX IF NOT EXISTS idx_ledger_account ON platform_ledger_entries (account_type, account_id);
CREATE INDEX IF NOT EXISTS idx_ledger_ref ON platform_ledger_entries (reference_type, reference_id);

CREATE TRIGGER IF NOT EXISTS platform_ledger_entries_no_update
BEFORE UPDATE ON platform_ledger_entries
BEGIN
  SELECT RAISE(ABORT, 'platform_ledger_entries is append-only: post a correcting entry instead');
END;

CREATE TRIGGER IF NOT EXISTS platform_ledger_entries_no_delete
BEFORE DELETE ON platform_ledger_entries
BEGIN
  SELECT RAISE(ABORT, 'platform_ledger_entries is append-only: post a correcting entry instead');
END;

PRAGMA foreign_keys = ON;
