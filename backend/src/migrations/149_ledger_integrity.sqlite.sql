-- ─────────────────────────────────────────────────────────────────────────────
-- 149: the ledger's integrity (P3) — SQLite twin of 149_ledger_integrity.sql.
-- See that file for the reasoning.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS platform_ledger_postings (
    posting_key    TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL,
    created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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
